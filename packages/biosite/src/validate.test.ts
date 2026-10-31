import { describe, expect, it } from 'vitest';
import { validateExternalQuery, validateHandoff, validatePatch, validateProvision } from './validate';

const base = { company_id_externo: 'emp-1', niche_key: 'loja', slug: 'minha-loja', title: 'Minha Loja' };

describe('validateProvision', () => {
  it('aceita o minimo', () => {
    const r = validateProvision(base);
    expect(r.ok).toBe(true);
  });
  it('aceita secoes validas', () => {
    const r = validateProvision({ ...base, sections: [{ section_type: 'hero', config: { titulo: 'Oi' } }, { section_type: 'contato' }] });
    expect(r.ok && r.value.sections.length).toBe(2);
  });
  it.each([
    ['corpo nao objeto', 'x'],
    ['slug reservado', { ...base, slug: 'admin' }],
    ['slug com maiuscula', { ...base, slug: 'Minha' }],
    ['slug curto', { ...base, slug: 'ab' }],
    ['slug com hifen duplo', { ...base, slug: 'a--b' }],
    ['niche invalido', { ...base, niche_key: 'Loja!' }],
    ['company vazio', { ...base, company_id_externo: '' }],
    ['title longo', { ...base, title: 'x'.repeat(121) }],
    ['secao desconhecida', { ...base, sections: [{ section_type: 'video' }] }],
    ['theme nao objeto', { ...base, theme: [] }],
    ['muitas secoes', { ...base, sections: Array.from({ length: 31 }, () => ({ section_type: 'texto' })) }],
    ['config gigante', { ...base, sections: [{ section_type: 'texto', config: { x: 'a'.repeat(33000) } }] }],
  ])('rejeita %s', (_nome, body) => {
    expect(validateProvision(body).ok).toBe(false);
  });
});

describe('validatePatch', () => {
  it('aceita campos permitidos', () => {
    expect(validatePatch({ title: 'Novo', published: true }).ok).toBe(true);
  });
  it('rejeita campo desconhecido, vazio e tipo errado', () => {
    expect(validatePatch({ slug: 'x' }).ok).toBe(false);
    expect(validatePatch({}).ok).toBe(false);
    expect(validatePatch({ published: 'sim' }).ok).toBe(false);
    expect(validatePatch({ title: '' }).ok).toBe(false);
  });
});

describe('validateExternalQuery e handoff', () => {
  it('exige company e niche', () => {
    expect(validateExternalQuery(new URLSearchParams('company_id_externo=a&niche_key=loja')).ok).toBe(true);
    expect(validateExternalQuery(new URLSearchParams('niche_key=loja')).ok).toBe(false);
  });
  it('handoff aceita corpo vazio e valida e-mail', () => {
    expect(validateHandoff(undefined).ok).toBe(true);
    expect(validateHandoff({ actor: { email: 'a@b.c', name: 'Ana' } }).ok).toBe(true);
    expect(validateHandoff({ actor: { email: 'sem-arroba' } }).ok).toBe(false);
  });
});
