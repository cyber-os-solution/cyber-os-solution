// Cria (ou atualiza) um biosite completo a partir de um arquivo JSON: secoes, catalogo e publicacao.
// Uso (na raiz do repositorio):
//   node --env-file=apps/web/.env.local apps/web/scripts/seed-biosite.mjs "<arquivo.json>" "<nome-do-integrador>" [--replace-sections]
// Grava no banco apontado por apps/web/.env.local. E idempotente: repetir nao duplica.
// O catalogo e sempre atualizado pelo slug do item; --replace-sections troca as secoes de um biosite que ja existe.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const [file, clientName, ...flags] = process.argv.slice(2);
if (!file || !clientName) {
  console.error('Uso: node --env-file=apps/web/.env.local apps/web/scripts/seed-biosite.mjs "<arquivo.json>" "<integrador>" [--replace-sections]');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em apps/web/.env.local');
  process.exit(1);
}

const input = JSON.parse(readFileSync(file, 'utf8'));
const replaceSections = flags.includes('--replace-sections');
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`Banco alvo: ${new URL(url).host}`);

const fail = (msg, err) => {
  console.error(msg, err?.code ?? '', err?.message ? `(${err.message})` : '');
  process.exit(1);
};

const { data: client, error: e0 } = await db.from('api_clients').select('id, disabled_at').eq('name', clientName).maybeSingle();
if (e0 || !client || client.disabled_at) fail(`Integrador "${clientName}" nao encontrado ou desativado.`, e0);

const { data: prov, error: e1 } = await db.rpc('bio_provision', {
  _client: client.id,
  _company: input.company_id_externo,
  _niche: input.niche_key,
  _slug: input.slug,
  _title: input.title,
  _theme: input.theme ?? {},
  _settings: input.settings ?? {},
  _sections: input.sections ?? [],
});
if (e1) fail('Falha ao provisionar (slug ja usado por outro biosite?):', e1);
const site = prov.biosite;
console.log(prov.created ? `Biosite criado: ${site.id}` : `Biosite ja existia: ${site.id}`);

const { data: row, error: e2 } = await db.from('biosites').select('tenant_id').eq('id', site.id).single();
if (e2) fail('Falha ao ler o biosite:', e2);

if (replaceSections && !prov.created) {
  const { error: d } = await db.from('bio_sections').delete().eq('biosite_id', site.id);
  if (d) fail('Falha ao remover secoes antigas:', d);
  const rows = (input.sections ?? []).map((s, i) => ({ tenant_id: row.tenant_id, biosite_id: site.id, section_type: s.section_type, position: i, config: s.config ?? {} }));
  if (rows.length) {
    const { error: i } = await db.from('bio_sections').insert(rows);
    if (i) fail('Falha ao recriar secoes:', i);
  }
  console.log(`Secoes substituidas: ${rows.length}`);
}

const items = (input.catalog ?? []).map((c, i) => ({
  tenant_id: row.tenant_id,
  biosite_id: site.id,
  slug: c.slug,
  title: c.title,
  summary: c.summary ?? null,
  price: c.price ?? null,
  status: c.status ?? 'published',
  position: c.position ?? i,
  cover_url: c.cover_url ?? null,
  metadata: c.metadata ?? {},
}));
if (items.length) {
  const { error: e3 } = await db.from('bio_catalog_items').upsert(items, { onConflict: 'biosite_id,slug' });
  if (e3) fail('Falha ao gravar o catalogo:', e3);
  console.log(`Catalogo gravado: ${items.length} itens`);
}

const patch = { title: input.title, theme: input.theme ?? {}, settings: input.settings ?? {}, published: input.published === true };
const { error: e4 } = await db.rpc('bio_patch_biosite', { _client: client.id, _id: site.id, _patch: patch });
if (e4) fail('Falha ao atualizar/publicar:', e4);
console.log(`Publicado: ${patch.published ? 'sim' : 'nao'}`);
console.log(`Pagina: /b/${site.slug}`);
