import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SLUG_PATTERN, type PublicSection } from '@cyber/biosite';

export interface PublicBiosite {
  slug: string;
  title: string;
  niche_key: string;
  theme: unknown;
  settings: unknown;
  brand: { name?: unknown; logo_url?: unknown; powered_by?: unknown; hide_powered_by?: unknown };
  sections: { id: string; type: string; position: number; config: unknown }[];
}

export interface PublicCatalogItem {
  slug: string;
  title: string;
  summary: string | null;
  price: number | null;
  cover_url: string | null;
}

// Leitura publica: chave anon + RPCs que devolvem so campos publicos (o anon nao enxerga tabela alguma).
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('supabase publico nao configurado');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const getPublicBiosite = cache(async (slug: string): Promise<PublicBiosite | null> => {
  if (slug.length < 3 || slug.length > 60 || !SLUG_PATTERN.test(slug)) return null;
  const { data, error } = await anonClient().rpc('get_public_biosite', { _slug: slug });
  if (error) throw new Error('falha ao ler o biosite');
  return (data as PublicBiosite | null) ?? null;
});

export async function getPublicCatalog(slug: string, limit: number): Promise<PublicCatalogItem[]> {
  const { data, error } = await anonClient().rpc('get_public_catalog', { _slug: slug, _limit: limit, _offset: 0 });
  if (error) throw new Error('falha ao ler o catalogo');
  return ((data as { items?: PublicCatalogItem[] } | null)?.items ?? []).slice(0, limit);
}

export type { PublicSection };
