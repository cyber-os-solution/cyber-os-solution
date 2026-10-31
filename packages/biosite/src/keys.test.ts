import { describe, expect, it } from 'vitest';
import { generateApiKey, newHandoffCode, parseApiKey, secretMatches, sha256Hex } from './keys';

describe('chaves de API', () => {
  it('gera chave no formato bio_<8>_<43> e o hash bate com o segredo', () => {
    const { key, prefix, secretHash } = generateApiKey();
    expect(key).toMatch(/^bio_[a-z0-9]{8}_[A-Za-z0-9_-]{43}$/);
    const parsed = parseApiKey(key);
    expect(parsed?.prefix).toBe(prefix);
    expect(secretHash).toMatch(/^[0-9a-f]{64}$/);
    expect(secretMatches(parsed!.secret, secretHash)).toBe(true);
  });

  it('nao gera a mesma chave duas vezes', () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key);
  });

  it('rejeita formatos invalidos', () => {
    for (const bad of ['', 'bio_', 'abc', 'bio_ABCDEFGH_' + 'a'.repeat(43), 'bio_abcdefgh_curto', 'bio_abcdefgh_' + 'a'.repeat(44)]) {
      expect(parseApiKey(bad)).toBeNull();
    }
  });

  it('segredo errado nao confere', () => {
    const { secretHash } = generateApiKey();
    expect(secretMatches('a'.repeat(43), secretHash)).toBe(false);
    expect(secretMatches('x', 'nao-e-hex')).toBe(false);
  });

  it('sha256 conhecido', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('codigo de handoff tem hash correspondente', () => {
    const { code, codeHash } = newHandoffCode();
    expect(sha256Hex(code)).toBe(codeHash);
  });
});
