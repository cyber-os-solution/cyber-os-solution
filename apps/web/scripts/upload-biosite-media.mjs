// Envia fotos (e video mp4 de ate 5 MB) de uma pasta para o Storage (bucket bio-media) de um biosite e imprime os URLs https publicos.
// Uso (na raiz do repositorio):
//   node --env-file=apps/web/.env.local apps/web/scripts/upload-biosite-media.mjs "<slug-do-biosite>" "<pasta-com-fotos>"
// Grava no projeto Supabase apontado por apps/web/.env.local. Idempotente: reenviar o mesmo nome substitui o arquivo.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const [slug, dir] = process.argv.slice(2);
if (!slug || !dir) {
  console.error('Uso: node --env-file=apps/web/.env.local apps/web/scripts/upload-biosite-media.mjs "<slug>" "<pasta>"');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em apps/web/.env.local');
  process.exit(1);
}

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const MAX_BYTES = 5 * 1024 * 1024;

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`Banco alvo: ${new URL(url).host}`);

const { data: biosite, error: e0 } = await db.from('biosites').select('id, tenant_id').eq('slug', slug).maybeSingle();
if (e0 || !biosite) {
  console.error(`Biosite "${slug}" nao encontrado neste banco.`, e0?.message ?? '');
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => TYPES[extname(f).toLowerCase()])
  .sort();
if (files.length === 0) {
  console.error(`Nenhum arquivo (.jpg, .jpeg, .png, .webp, .mp4) em ${dir}`);
  process.exit(1);
}

const urls = [];
for (const file of files) {
  const full = join(dir, file);
  if (statSync(full).size > MAX_BYTES) {
    console.error(`Pulando ${file}: maior que 5 MB`);
    continue;
  }
  const clean = file.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/^[^a-z0-9]+/, '');
  const path = `${biosite.tenant_id}/${biosite.id}/${clean}`;
  const { error } = await db.storage.from('bio-media').upload(path, readFileSync(full), {
    contentType: TYPES[extname(file).toLowerCase()],
    upsert: true,
  });
  if (error) {
    console.error(`Falhou ${file}:`, error.message);
    process.exit(1);
  }
  const publicUrl = db.storage.from('bio-media').getPublicUrl(path).data.publicUrl;
  urls.push(publicUrl);
  console.log(`OK ${file} -> ${publicUrl}`);
}
console.log(`\n${urls.length} foto(s) enviada(s).`);
