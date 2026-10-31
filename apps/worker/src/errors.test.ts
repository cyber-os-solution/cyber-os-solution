import { describe, expect, it } from 'vitest';
import { errText } from './errors.js';

describe('errText', () => {
  it('le a mensagem de um Error', () => {
    expect(errText(new Error('falhou'))).toBe('falhou');
  });
  it('le a mensagem de um objeto simples do Supabase', () => {
    expect(errText({ message: 'permission denied', code: '42501' })).toBe('permission denied');
  });
  it('nao devolve [object Object] para objeto sem message', () => {
    expect(errText({ code: '42501' })).toBe('[object Object]');
  });
  it('converte valores primitivos', () => {
    expect(errText('texto')).toBe('texto');
    expect(errText(42)).toBe('42');
  });
});
