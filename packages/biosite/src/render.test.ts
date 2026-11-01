import { describe, expect, it } from 'vitest';
import { safeUrl, sanitizeTheme, toSectionView } from './render';

describe('safeUrl', () => {
  it('so aceita https', () => {
    expect(safeUrl('https://exemplo.com/a')).toBe('https://exemplo.com/a');
    for (const bad of ['http://x.com', 'javascript:alert(1)', 'data:text/html,x', '//x.com', 'ftp://x', '', 'nao e url', 5, null]) {
      expect(safeUrl(bad)).toBeNull();
    }
  });
});

describe('sanitizeTheme', () => {
  it('usa padrao para valor invalido (nada de CSS injetado)', () => {
    const t = sanitizeTheme({ primary: 'red; background:url(//x)', background: '#fff', font: 'comic', radius: 'xl' });
    expect(t.primary).toBe('#1d4ed8');
    expect(t.background).toBe('#fff');
    expect(t.font).toContain('system-ui');
    expect(t.radius).toBe('12px');
  });
  it('aceita valores validos', () => {
    expect(sanitizeTheme({ primary: '#ff0000', font: 'serif', radius: 'lg' })).toMatchObject({ primary: '#ff0000', radius: '20px' });
  });
});

describe('toSectionView', () => {
  const s = (type: string, config: unknown) => ({ id: 'i', type, position: 0, config });

  it('hero descarta imagem e CTA com url insegura', () => {
    const v = toSectionView('loja', s('hero', { titulo: 'Oi', imagem_url: 'http://x/a.png', cta: { label: 'Ir', url: 'javascript:1' } }));
    expect(v).toMatchObject({ kind: 'hero', title: 'Oi', imageUrl: null, cta: null });
  });

  it('hero aceita video_url https e descarta video inseguro', () => {
    const ok = toSectionView('loja', s('hero', { titulo: 'Oi', imagem_url: 'https://x/capa.jpg', video_url: 'https://x/v.mp4' }));
    expect(ok).toMatchObject({ kind: 'hero', imageUrl: 'https://x/capa.jpg', videoUrl: 'https://x/v.mp4' });
    const bad = toSectionView('loja', s('hero', { titulo: 'Oi', video_url: 'http://x/v.mp4' }));
    expect(bad).toMatchObject({ kind: 'hero', videoUrl: null });
  });

  it('links passam pelo rastreio /r/<slug>/<id> e escondem a url real', () => {
    const v = toSectionView('loja', s('links', { links: [
      { id: 'insta', label: 'Instagram', url: 'https://instagram.com/x' },
      { label: 'Sem id', url: 'https://a.com' },
      { id: 'mau', label: 'Mau', url: 'javascript:1' },
      { id: 'semlabel', url: 'https://b.com' },
    ] }));
    expect(v).toEqual({ kind: 'links', id: 'i', title: '', links: [
      { label: 'Instagram', href: '/r/loja/insta' },
      { label: 'Sem id', href: '/r/loja/l1' },
    ] });
    expect(JSON.stringify(v)).not.toContain('instagram.com');
  });

  it('contato monta wa.me, tel e mailto e ignora e-mail invalido', () => {
    const v = toSectionView('loja', s('contato', { whatsapp: '+55 (11) 91234-5678', email: 'ruim', telefone: '(11) 3333-4444', endereco: 'Rua A, 1' }));
    expect(v?.kind === 'contato' && v.items.map((i) => i.href)).toEqual(['https://wa.me/5511912345678', 'tel:1133334444', null]);
  });

  it('texto vira paragrafos sem HTML interpretado (o React escapa); limite de tamanho', () => {
    const v = toSectionView('loja', s('texto', { corpo: 'a\n\nb\n\n<script>x</script>' }));
    expect(v?.kind === 'texto' && v.paragraphs).toEqual(['a', 'b', '<script>x</script>']);
  });

  it('catalogo limita entre 1 e 24; galeria filtra urls ruins; tipo desconhecido e null', () => {
    expect(toSectionView('l', s('catalogo', { limite: 999 }))).toMatchObject({ limit: 24 });
    expect(toSectionView('l', s('catalogo', { limite: -3 }))).toMatchObject({ limit: 1 });
    expect(toSectionView('l', s('galeria', { imagens: [{ url: 'https://a/1.png', alt: 'x' }, { url: 'http://a/2.png' }] }))).toMatchObject({ images: [{ url: 'https://a/1.png', alt: 'x' }] });
    expect(toSectionView('l', s('video', {}))).toBeNull();
  });

  it('config invalida nao quebra', () => {
    expect(toSectionView('l', s('hero', null))).toMatchObject({ kind: 'hero', title: '' });
    expect(toSectionView('l', s('links', 'x'))).toMatchObject({ links: [] });
  });
});
