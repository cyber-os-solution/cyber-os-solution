import { describe, expect, it } from 'vitest';
import { authenticate, createAdminHandoff, getBiositeByExternal, patchBiosite, provisionBiosite } from './handlers';
import { generateApiKey, sha256Hex } from './keys';
import { StoreError, type ApiBiosite, type BiositeStore, type KeyRecord } from './store';

const ID = '11111111-1111-4111-8111-111111111111';
const CLIENT = 'c1';

function fakeBiosite(over: Partial<ApiBiosite> = {}): ApiBiosite {
  return { id: ID, slug: 'minha-loja', title: 'Minha Loja', niche_key: 'loja', company_id_externo: 'emp-1', published: false, theme: {}, settings: {}, sections: [], ...over };
}

function fakeStore(over: Partial<BiositeStore> = {}, key?: Partial<KeyRecord>) {
  const gen = generateApiKey();
  const record: KeyRecord = { id: 'k1', apiClientId: CLIENT, secretHash: gen.secretHash, revokedAt: null, clientDisabledAt: null, ...key };
  const calls = { touched: 0, audits: 0 };
  const store: BiositeStore = {
    findKey: async (prefix) => (prefix === gen.prefix ? record : null),
    rateLimitHit: async () => true,
    touchKey: async () => { calls.touched++; },
    provision: async () => ({ created: true, biosite: fakeBiosite() }),
    getById: async () => fakeBiosite(),
    getByExternal: async () => fakeBiosite(),
    patch: async () => fakeBiosite({ published: true }),
    createHandoff: async () => true,
    audit: async () => { calls.audits++; },
    ...over,
  };
  return { store, key: gen.key, calls };
}

describe('authenticate', () => {
  it('aceita chave valida e registra uso', async () => {
    const { store, key, calls } = fakeStore();
    const r = await authenticate(store, `Bearer ${key}`);
    expect(r).toMatchObject({ ok: true, apiClientId: CLIENT });
    expect(calls.touched).toBe(1);
  });

  it('401 sem cabecalho, formato errado, prefixo desconhecido ou segredo errado', async () => {
    const { store, key } = fakeStore();
    const wrongSecret = key.slice(0, 13) + 'A'.repeat(43);
    for (const h of [null, '', 'Basic x', `Bearer ${key}x`, `Bearer ${wrongSecret}`, 'Bearer bio_zzzzzzzz_' + 'a'.repeat(43)]) {
      const r = await authenticate(store, h);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(401);
    }
  });

  it('401 para chave revogada e para cliente desativado (mesma resposta)', async () => {
    for (const k of [{ revokedAt: '2026-01-01' }, { clientDisabledAt: '2026-01-01' }]) {
      const { store, key } = fakeStore({}, k);
      const r = await authenticate(store, `Bearer ${key}`);
      expect(!r.ok && r.response.status).toBe(401);
    }
  });

  it('429 com Retry-After quando estoura o limite', async () => {
    const { store, key } = fakeStore({ rateLimitHit: async () => false });
    const r = await authenticate(store, `Bearer ${key}`);
    expect(!r.ok && r.response.status).toBe(429);
    expect(!r.ok && r.response.headers?.['Retry-After']).toBe('60');
  });

  it('503 se o banco falhar, sem vazar detalhes', async () => {
    const { store, key } = fakeStore({ findKey: async () => { throw new Error('segredo interno'); } });
    const r = await authenticate(store, `Bearer ${key}`);
    expect(!r.ok && r.response.status).toBe(503);
    expect(JSON.stringify(!r.ok && r.response.body)).not.toContain('segredo interno');
  });

  it('o hash guardado nunca e a chave', () => {
    const g = generateApiKey();
    expect(g.secretHash).not.toContain(g.key);
    expect(sha256Hex(g.key)).not.toBe(g.secretHash);
  });
});

describe('provisionBiosite', () => {
  const body = { company_id_externo: 'emp-1', niche_key: 'loja', slug: 'minha-loja', title: 'Minha Loja' };
  it('201 ao criar, 200 ao repetir (idempotente)', async () => {
    expect((await provisionBiosite(fakeStore().store, CLIENT, body)).status).toBe(201);
    const again = fakeStore({ provision: async () => ({ created: false, biosite: fakeBiosite() }) }).store;
    expect((await provisionBiosite(again, CLIENT, body)).status).toBe(200);
  });
  it('400 com corpo invalido sem tocar no banco', async () => {
    let called = false;
    const { store } = fakeStore({ provision: async () => { called = true; throw new Error('nao'); } });
    expect((await provisionBiosite(store, CLIENT, { ...body, slug: 'admin' })).status).toBe(400);
    expect(called).toBe(false);
  });
  it('409 se o slug ja existe', async () => {
    const { store } = fakeStore({ provision: async () => { throw new StoreError('slug_taken', 'x'); } });
    expect((await provisionBiosite(store, CLIENT, body)).status).toBe(409);
  });
});

describe('leitura, alteracao e handoff', () => {
  it('busca por id externo: 200, 404 e 400', async () => {
    expect((await getBiositeByExternal(fakeStore().store, CLIENT, new URLSearchParams('company_id_externo=a&niche_key=loja'))).status).toBe(200);
    const none = fakeStore({ getByExternal: async () => null }).store;
    expect((await getBiositeByExternal(none, CLIENT, new URLSearchParams('company_id_externo=a&niche_key=loja'))).status).toBe(404);
    expect((await getBiositeByExternal(none, CLIENT, new URLSearchParams(''))).status).toBe(400);
  });

  it('patch: 200, 404 (outro cliente/inexistente), 404 para id nao-uuid, 400 para corpo ruim', async () => {
    expect((await patchBiosite(fakeStore().store, CLIENT, ID, { published: true })).status).toBe(200);
    const none = fakeStore({ patch: async () => null }).store;
    expect((await patchBiosite(none, CLIENT, ID, { published: true })).status).toBe(404);
    expect((await patchBiosite(none, CLIENT, 'nao-uuid', { published: true })).status).toBe(404);
    expect((await patchBiosite(fakeStore().store, CLIENT, ID, { slug: 'x' })).status).toBe(400);
  });

  it('handoff: devolve codigo de uso unico com validade de 60 s e guarda so o hash', async () => {
    let saved: { codeHash: string; expiresAt: string } | undefined;
    const { store, calls } = fakeStore({ createHandoff: async (a) => { saved = a; return true; } });
    const now = new Date('2026-10-31T12:00:00.000Z');
    const r = await createAdminHandoff(store, CLIENT, ID, { actor: { email: 'a@b.c' } }, now);
    expect(r.status).toBe(201);
    const body = r.body as { code: string; expires_at: string; expires_in: number };
    expect(body.expires_at).toBe('2026-10-31T12:01:00.000Z');
    expect(body.expires_in).toBe(60);
    expect(saved?.codeHash).toBe(sha256Hex(body.code));
    expect(saved?.codeHash).not.toBe(body.code);
    expect(calls.audits).toBe(1);
  });

  it('handoff: 404 se o biosite nao e do cliente', async () => {
    const { store } = fakeStore({ createHandoff: async () => false });
    expect((await createAdminHandoff(store, CLIENT, ID, {})).status).toBe(404);
  });
});
