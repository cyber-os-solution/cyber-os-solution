import { SECTION_TYPES, safeUrl, type SectionType } from '@cyber/biosite';

// Converte o que o painel enviou em config valido para a secao. Campo fora da lista e descartado.
// Mesmas regras de toSectionView: texto com limite, URL so https, nada de HTML.
type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function isSectionType(v: unknown): v is SectionType {
  return typeof v === 'string' && (SECTION_TYPES as readonly string[]).includes(v);
}

export function sanitizeSectionConfig(type: SectionType, input: unknown): Json {
  const c = isObject(input) ? input : {};
  switch (type) {
    case 'hero': {
      const cta: Json = {};
      const ctaLabel = str(isObject(c.cta) ? c.cta.label : '', 40);
      const ctaUrl = safeUrl(isObject(c.cta) ? c.cta.url : null);
      if (ctaLabel && ctaUrl) Object.assign(cta, { label: ctaLabel, url: ctaUrl });
      return {
        titulo: str(c.titulo, 120),
        subtitulo: str(c.subtitulo, 300),
        imagem_url: safeUrl(c.imagem_url) ?? undefined,
        video_url: safeUrl(c.video_url) ?? undefined,
        cta: Object.keys(cta).length ? cta : undefined,
      };
    }
    case 'texto':
      return { titulo: str(c.titulo, 120), corpo: str(c.corpo, 5000) };
    case 'catalogo': {
      const n = typeof c.limite === 'number' && Number.isFinite(c.limite) ? Math.floor(c.limite) : 12;
      return { titulo: str(c.titulo, 120), limite: Math.max(1, Math.min(24, n)) };
    }
    case 'galeria': {
      const raw = Array.isArray(c.imagens) ? c.imagens : [];
      const imagens = raw.flatMap((img) => {
        if (!isObject(img)) return [];
        const url = safeUrl(img.url);
        return url ? [{ url, alt: str(img.alt, 120) }] : [];
      }).slice(0, 24);
      return { titulo: str(c.titulo, 120), imagens };
    }
    case 'contato':
      return {
        titulo: str(c.titulo, 120),
        whatsapp: str(c.whatsapp, 20).replace(/\D/g, ''),
        telefone: str(c.telefone, 20),
        email: str(c.email, 254),
        endereco: str(c.endereco, 200),
        horario: str(c.horario, 200),
      };
    case 'links': {
      const raw = Array.isArray(c.links) ? c.links : [];
      const links = raw.flatMap((item) => {
        if (!isObject(item)) return [];
        const label = str(item.label, 80);
        const url = safeUrl(item.url);
        if (!label || !url) return [];
        const id = typeof item.id === 'string' && /^[a-z0-9_-]{1,40}$/i.test(item.id) ? item.id : undefined;
        return [{ label, url, ...(id ? { id } : {}) }];
      }).slice(0, 30);
      return { titulo: str(c.titulo, 120), links };
    }
  }
}
