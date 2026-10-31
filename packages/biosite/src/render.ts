// Transforma o JSON salvo (theme + secoes) em dados SEGUROS para a pagina publica.
// Nada aqui devolve HTML: a pagina so renderiza texto e URLs ja validadas.

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export function text(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export function safeUrl(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2000) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONTS = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;
const RADII = { none: '0px', sm: '6px', md: '12px', lg: '20px' } as const;

export interface SafeTheme {
  primary: string;
  background: string;
  text: string;
  font: string;
  radius: string;
}

export function sanitizeTheme(theme: unknown): SafeTheme {
  const t = isObject(theme) ? theme : {};
  const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v : fallback);
  const font = typeof t.font === 'string' && t.font in FONTS ? (t.font as keyof typeof FONTS) : 'sans';
  const radius = typeof t.radius === 'string' && t.radius in RADII ? (t.radius as keyof typeof RADII) : 'md';
  return {
    primary: color(t.primary, '#1d4ed8'),
    background: color(t.background, '#ffffff'),
    text: color(t.text, '#111827'),
    font: FONTS[font],
    radius: RADII[radius],
  };
}

export interface PublicSection {
  id: string;
  type: string;
  position: number;
  config: unknown;
}

export type SectionView =
  | { kind: 'hero'; id: string; title: string; subtitle: string; imageUrl: string | null; cta: { label: string; href: string } | null }
  | { kind: 'texto'; id: string; title: string; paragraphs: string[] }
  | { kind: 'catalogo'; id: string; title: string; limit: number }
  | { kind: 'galeria'; id: string; title: string; images: { url: string; alt: string }[] }
  | { kind: 'contato'; id: string; title: string; items: { label: string; value: string; href: string | null }[] }
  | { kind: 'links'; id: string; title: string; links: { label: string; href: string }[] };

const LINK_ID = /^[a-z0-9_-]{1,40}$/i;

export function toSectionView(slug: string, section: PublicSection): SectionView | null {
  const c = isObject(section.config) ? section.config : {};
  const id = section.id;
  switch (section.type) {
    case 'hero': {
      const ctaHref = safeUrl(isObject(c.cta) ? c.cta.url : null);
      const ctaLabel = text(isObject(c.cta) ? c.cta.label : '', 40);
      return {
        kind: 'hero', id,
        title: text(c.titulo, 120), subtitle: text(c.subtitulo, 300),
        imageUrl: safeUrl(c.imagem_url),
        cta: ctaHref && ctaLabel ? { label: ctaLabel, href: ctaHref } : null,
      };
    }
    case 'texto': {
      const paragraphs = text(c.corpo, 5000).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).slice(0, 20);
      return { kind: 'texto', id, title: text(c.titulo, 120), paragraphs };
    }
    case 'catalogo': {
      const n = typeof c.limite === 'number' && Number.isFinite(c.limite) ? Math.floor(c.limite) : 12;
      return { kind: 'catalogo', id, title: text(c.titulo, 120) || 'Catalogo', limit: Math.max(1, Math.min(24, n)) };
    }
    case 'galeria': {
      const raw = Array.isArray(c.imagens) ? c.imagens : [];
      const images = raw.flatMap((img) => {
        if (!isObject(img)) return [];
        const url = safeUrl(img.url);
        return url ? [{ url, alt: text(img.alt, 120) }] : [];
      }).slice(0, 24);
      return { kind: 'galeria', id, title: text(c.titulo, 120), images };
    }
    case 'contato': {
      const items: { label: string; value: string; href: string | null }[] = [];
      const whatsapp = text(c.whatsapp, 20).replace(/\D/g, '');
      if (whatsapp.length >= 10 && whatsapp.length <= 15) items.push({ label: 'WhatsApp', value: `+${whatsapp}`, href: `https://wa.me/${whatsapp}` });
      const phone = text(c.telefone, 20).replace(/[^\d+]/g, '');
      if (phone.length >= 8) items.push({ label: 'Telefone', value: text(c.telefone, 20), href: `tel:${phone}` });
      const email = text(c.email, 254);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) items.push({ label: 'E-mail', value: email, href: `mailto:${email}` });
      const address = text(c.endereco, 200);
      if (address) items.push({ label: 'Endereco', value: address, href: null });
      const hours = text(c.horario, 200);
      if (hours) items.push({ label: 'Horario', value: hours, href: null });
      return { kind: 'contato', id, title: text(c.titulo, 120) || 'Contato', items };
    }
    case 'links': {
      const raw = Array.isArray(c.links) ? c.links : [];
      const links = raw.flatMap((item, index) => {
        if (!isObject(item) || !safeUrl(item.url)) return [];
        const label = text(item.label, 80);
        if (!label) return [];
        const linkId = typeof item.id === 'string' && LINK_ID.test(item.id) ? item.id : `l${index}`;
        return [{ label, href: `/r/${slug}/${linkId}` }]; // clique passa pelo rastreio
      }).slice(0, 30);
      return { kind: 'links', id, title: text(c.titulo, 120), links };
    }
    default:
      return null; // tipo desconhecido e ignorado
  }
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const LINK_ID_PATTERN = LINK_ID;
