'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../../lib/biosite/admin-client';
import { isSectionType, sanitizeSectionConfig } from '../../lib/biosite/admin-config';

export type ActionResult = { ok: true } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATALOG_STATUS = ['draft', 'published', 'archived'] as const;

// Acoes do painel. Toda gravacao passa pela sessao do usuario: o RLS recusa papel insuficiente.
async function signedIn() {
  const db = await createAdminClient();
  const { data } = await db.auth.getUser();
  return data.user ? db : null;
}

export async function saveSection(sectionId: string, config: unknown, enabled: boolean): Promise<ActionResult> {
  if (!UUID.test(sectionId)) return { ok: false, message: 'secao invalida' };
  const db = await signedIn();
  if (!db) return { ok: false, message: 'sessao expirada' };

  const { data: current, error: readError } = await db.from('bio_sections').select('section_type').eq('id', sectionId).maybeSingle();
  if (readError || !current) return { ok: false, message: 'secao nao encontrada' };
  if (!isSectionType(current.section_type)) return { ok: false, message: 'tipo de secao desconhecido' };

  const { error } = await db
    .from('bio_sections')
    .update({ config: sanitizeSectionConfig(current.section_type, config), enabled: Boolean(enabled) })
    .eq('id', sectionId);
  if (error) return { ok: false, message: 'nao foi possivel salvar' };
  revalidatePath('/admin');
  return { ok: true };
}

// Formularios HTML: recebem FormData e devolvem void (o resultado vai para o log do painel na v1).
export async function saveSectionForm(formData: FormData): Promise<void> {
  const sectionId = String(formData.get('sectionId') ?? '');
  const enabled = formData.get('enabled') === 'on';
  let config: unknown = {};
  try {
    config = JSON.parse(String(formData.get('config') ?? '{}'));
  } catch {
    return;
  }
  await saveSection(sectionId, config, enabled);
}

export async function saveCatalogForm(formData: FormData): Promise<void> {
  await saveCatalogItem(String(formData.get('biositeId') ?? ''), {
    slug: String(formData.get('slug') ?? ''),
    title: String(formData.get('title') ?? ''),
    summary: String(formData.get('summary') ?? ''),
    price: String(formData.get('price') ?? ''),
    status: String(formData.get('status') ?? 'draft'),
    coverUrl: String(formData.get('coverUrl') ?? ''),
  });
}

export async function deleteCatalogForm(formData: FormData): Promise<void> {
  await deleteCatalogItem(String(formData.get('itemId') ?? ''));
}

export interface CatalogInput {
  slug: string;
  title: string;
  summary: string;
  price: string;
  status: string;
  coverUrl: string;
}

export async function saveCatalogItem(biositeId: string, input: CatalogInput): Promise<ActionResult> {
  if (!UUID.test(biositeId)) return { ok: false, message: 'biosite invalido' };
  const title = input.title.trim().slice(0, 160);
  const slug = input.slug.trim().toLowerCase();
  if (!title) return { ok: false, message: 'titulo obrigatorio' };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return { ok: false, message: 'slug invalido (letras minusculas, numeros e hifen)' };
  if (!(CATALOG_STATUS as readonly string[]).includes(input.status)) return { ok: false, message: 'status invalido' };
  const price = input.price.trim() === '' ? null : Number(input.price.replace(',', '.'));
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { ok: false, message: 'preco invalido' };
  const cover = input.coverUrl.trim();
  if (cover && !/^https:\/\/.{1,1990}$/.test(cover)) return { ok: false, message: 'imagem precisa de endereco https' };

  const db = await signedIn();
  if (!db) return { ok: false, message: 'sessao expirada' };

  const { data: biosite, error: bioError } = await db.from('biosites').select('tenant_id').eq('id', biositeId).maybeSingle();
  if (bioError || !biosite) return { ok: false, message: 'biosite nao encontrado' };

  const { error } = await db.from('bio_catalog_items').insert({
    tenant_id: biosite.tenant_id,
    biosite_id: biositeId,
    slug,
    title,
    summary: input.summary.trim().slice(0, 1000) || null,
    price,
    status: input.status,
    cover_url: cover || null,
  });
  if (error) return { ok: false, message: 'nao foi possivel salvar (slug ja usado?)' };
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteCatalogItem(itemId: string): Promise<ActionResult> {
  if (!UUID.test(itemId)) return { ok: false, message: 'item invalido' };
  const db = await signedIn();
  if (!db) return { ok: false, message: 'sessao expirada' };
  const { error } = await db.from('bio_catalog_items').delete().eq('id', itemId);
  if (error) return { ok: false, message: 'nao foi possivel apagar' };
  revalidatePath('/admin');
  return { ok: true };
}
