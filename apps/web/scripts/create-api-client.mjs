// Cria um integrador (api_client) e a primeira chave de API. A chave aparece UMA vez.
// Uso (PowerShell, na raiz do repositorio):
//   pnpm --filter "@cyber/web" exec node --env-file=.env.local scripts/create-api-client.mjs "nome-do-sistema"
// Atencao: grava no banco apontado por .env.local (hoje: staging). Formato da chave: bio_<8>_<43>.
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const name = process.argv[2];
if (!name || name.length > 80) {
  console.error('Informe o nome do sistema (1 a 80 caracteres). Ex.: "magno-sistema"');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em apps/web/.env.local');
  process.exit(1);
}

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
let prefix = '';
for (const byte of randomBytes(8)) prefix += alphabet[byte % alphabet.length];
const secret = randomBytes(32).toString('base64url');
const key = `bio_${prefix}_${secret}`;
const secretHash = createHash('sha256').update(secret).digest('hex');

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`Banco alvo: ${new URL(url).host}`);

const { data: client, error: e1 } = await db.from('api_clients').insert({ name }).select('id').single();
if (e1) {
  console.error('Falha ao criar o integrador:', e1.code ?? '', '(nome ja existe?)');
  process.exit(1);
}
const { error: e2 } = await db.from('api_client_keys').insert({ api_client_id: client.id, key_prefix: prefix, secret_hash: secretHash });
if (e2) {
  console.error('Falha ao criar a chave:', e2.code ?? '');
  process.exit(1);
}
console.log(`Integrador criado: ${name} (${client.id})`);
console.log('CHAVE (guarde agora, nao sera mostrada de novo):');
console.log(key);
