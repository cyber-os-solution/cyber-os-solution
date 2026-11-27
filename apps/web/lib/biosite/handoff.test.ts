import { describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '@cyber/biosite';
import { HANDOFF_ROLE, acceptHandoff, type ConsumedHandoff, type HandoffDeps } from './handoff';

const TENANT = '00000000-0000-0000-0000-00000000aaaa';
const USER = '00000000-0000-0000-0000-00000000bbbb';
const CODE = 'codigo-de-teste-com-mais-de-vinte-caracteres';

function fakeDeps(handoff: ConsumedHandoff | null) {
  const deps = {
    consume: vi.fn<HandoffDeps['consume']>(async () => handoff),
    createUser: vi.fn<HandoffDeps['createUser']>(async () => undefined),
    issueLink: vi.fn<HandoffDeps['issueLink']>(async () => ({ userId: USER, tokenHash: 'token-hash-1' })),
    grant: vi.fn<HandoffDeps['grant']>(async () => undefined),
  };
  return { deps: deps as HandoffDeps & typeof deps, spies: deps };
}

describe('acceptHandoff', () => {
  it('consome pelo sha256 do codigo, cria o usuario, concede papel e devolve o token', async () => {
    const { deps, spies } = fakeDeps({ tenant_id: TENANT, biosite_id: 'b1', actor: { email: 'dono@example.invalid' } });
    const result = await acceptHandoff(deps, CODE);

    expect(spies.consume).toHaveBeenCalledWith(sha256Hex(CODE));
    expect(spies.createUser).toHaveBeenCalledWith('dono@example.invalid');
    expect(spies.grant).toHaveBeenCalledWith(TENANT, USER, HANDOFF_ROLE);
    expect(result).toEqual({ ok: true, tokenHash: 'token-hash-1' });
  });

  it('normaliza o e-mail (espacos e maiusculas)', async () => {
    const { deps, spies } = fakeDeps({ tenant_id: TENANT, biosite_id: 'b1', actor: { email: '  Dono@Example.INVALID ' } });
    await acceptHandoff(deps, CODE);
    expect(spies.createUser).toHaveBeenCalledWith('dono@example.invalid');
    expect(spies.issueLink).toHaveBeenCalledWith('dono@example.invalid');
  });

  it('codigo invalido, usado ou expirado: nada e criado nem concedido', async () => {
    const { deps, spies } = fakeDeps(null);
    expect(await acceptHandoff(deps, CODE)).toEqual({ ok: false, reason: 'invalid' });
    expect(spies.createUser).not.toHaveBeenCalled();
    expect(spies.grant).not.toHaveBeenCalled();
  });

  it('codigo sem e-mail do responsavel: recusa antes de criar usuario', async () => {
    const { deps, spies } = fakeDeps({ tenant_id: TENANT, biosite_id: 'b1', actor: {} });
    expect(await acceptHandoff(deps, CODE)).toEqual({ ok: false, reason: 'no_email' });
    expect(spies.createUser).not.toHaveBeenCalled();
    expect(spies.grant).not.toHaveBeenCalled();
  });

  it('nunca concede owner: o papel e sempre o do handoff', async () => {
    const { deps, spies } = fakeDeps({ tenant_id: TENANT, biosite_id: 'b1', actor: { email: 'a@example.invalid' } });
    await acceptHandoff(deps, CODE);
    expect(spies.grant).toHaveBeenCalledWith(TENANT, USER, 'agent');
    expect(spies.grant).not.toHaveBeenCalledWith(TENANT, USER, 'owner');
  });
});
