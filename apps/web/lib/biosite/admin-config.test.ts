import { describe, expect, it } from 'vitest';
import { isSectionType, sanitizeSectionConfig } from './admin-config';

describe('isSectionType', () => {
  it('aceita so os tipos conhecidos', () => {
    expect(isSectionType('hero')).toBe(true);
    expect(isSectionType('script')).toBe(false);
    expect(isSectionType(undefined)).toBe(false);
  });
});

describe('sanitizeSectionConfig', () => {
  it('descarta campos fora da lista e corta textos no limite', () => {
    const out = sanitizeSectionConfig('texto', { titulo: 'x'.repeat(300), corpo: 'ola', onload: 'alert(1)' });
    expect(out).toEqual({ titulo: 'x'.repeat(120), corpo: 'ola' });
  });

  it('URL so https; http e javascript viram ausencia', () => {
    const out = sanitizeSectionConfig('hero', {
      titulo: 'Oi',
      imagem_url: 'http://insegura.example.invalid/a.jpg',
      video_url: 'javascript:alert(1)',
      cta: { label: 'Comprar', url: 'https://ok.example.invalid/' },
    });
    expect(out.imagem_url).toBeUndefined();
    expect(out.video_url).toBeUndefined();
    expect(out.cta).toEqual({ label: 'Comprar', url: 'https://ok.example.invalid/' });
  });

  it('CTA sem URL valida nao e gravado', () => {
    const out = sanitizeSectionConfig('hero', { cta: { label: 'Comprar', url: 'ftp://x.example.invalid' } });
    expect(out.cta).toBeUndefined();
  });

  it('limite do catalogo fica entre 1 e 24', () => {
    expect(sanitizeSectionConfig('catalogo', { limite: 999 })).toEqual({ titulo: '', limite: 24 });
    expect(sanitizeSectionConfig('catalogo', { limite: -5 })).toEqual({ titulo: '', limite: 1 });
  });

  it('WhatsApp guarda so digitos', () => {
    expect(sanitizeSectionConfig('contato', { whatsapp: '+55 (11) 9 9999-0000' }).whatsapp).toBe('5511999990000');
  });

  it('links: rotulo e https obrigatorios, maximo de 30', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ label: `L${i}`, url: 'https://ok.example.invalid/' }));
    const out = sanitizeSectionConfig('links', { links: [...many, { label: '', url: 'https://ok.example.invalid/' }, { label: 'Ruim', url: 'http://x' }] });
    expect(out.links).toHaveLength(30);
  });

  it('entrada que nao e objeto vira config vazio com campos padrao', () => {
    expect(sanitizeSectionConfig('texto', 'nada')).toEqual({ titulo: '', corpo: '' });
  });
});
