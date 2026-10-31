import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { StoreError, type ApiBiosite, type BiositeStore, type KeyRecord } from '@cyber/biosite';

type DbError = { code?: string; message?: string };

function toStoreError(error: DbError): StoreError {
  if (error.code === '23505') return new StoreError('slug_taken', 'slug ja em uso');
  if (error.code === '42501') return new StoreError('client_invalid', 'integrador invalido');
  return new StoreError('unavailable', 'falha no banco'); // nunca repassa a mensagem do banco
}

function check<T>(res: { data: T; error: DbError | null }): T {
  if (res.error) throw toStoreError(res.error);
  return res.data;
}

// Acesso com service_role: SO no servidor. A chave nunca tem prefixo NEXT_PUBLIC_.
export function createSupabaseStore(): BiositeStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new StoreError('unavailable', 'variaveis de ambiente ausentes');
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const tenantOf = async (apiClientId: string, biositeId: string): Promise<string | null> => {
    const row = check(await db.from('biosites').select('tenant_id').eq('id', biositeId).eq('api_client_id', apiClientId).maybeSingle());
    return (row as { tenant_id: string } | null)?.tenant_id ?? null;
  };

  return {
    async findKey(prefix) {
      const row = check(
        await db.from('api_client_keys').select('id, api_client_id, secret_hash, revoked_at, api_clients(disabled_at)').eq('key_prefix', prefix).maybeSingle(),
      ) as { id: string; api_client_id: string; secret_hash: string; revoked_at: string | null; api_clients: unknown } | null;
      if (!row) return null;
      const client = Array.isArray(row.api_clients) ? row.api_clients[0] : row.api_clients;
      const record: KeyRecord = {
        id: row.id,
        apiClientId: row.api_client_id,
        secretHash: row.secret_hash,
        revokedAt: row.revoked_at,
        clientDisabledAt: (client as { disabled_at: string | null } | null | undefined)?.disabled_at ?? null,
      };
      return record;
    },
    async rateLimitHit(apiClientId, limitPerMinute) {
      return check(await db.rpc('bio_rate_limit_hit', { _client: apiClientId, _limit: limitPerMinute })) === true;
    },
    async touchKey(keyId) {
      check(await db.from('api_client_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyId));
    },
    async provision(apiClientId, input) {
      const data = check(
        await db.rpc('bio_provision', {
          _client: apiClientId,
          _company: input.companyIdExterno,
          _niche: input.nicheKey,
          _slug: input.slug,
          _title: input.title,
          _theme: input.theme,
          _settings: input.settings,
          _sections: input.sections,
        }),
      ) as { created: boolean; biosite: ApiBiosite };
      return data;
    },
    async getById(apiClientId, id) {
      return (check(await db.rpc('bio_get_biosite', { _client: apiClientId, _id: id })) as ApiBiosite | null) ?? null;
    },
    async getByExternal(apiClientId, companyIdExterno, nicheKey) {
      return (check(await db.rpc('bio_get_biosite', { _client: apiClientId, _company: companyIdExterno, _niche: nicheKey })) as ApiBiosite | null) ?? null;
    },
    async patch(apiClientId, id, patch) {
      return (check(await db.rpc('bio_patch_biosite', { _client: apiClientId, _id: id, _patch: patch })) as ApiBiosite | null) ?? null;
    },
    async createHandoff({ apiClientId, biositeId, codeHash, actor, expiresAt }) {
      const tenantId = await tenantOf(apiClientId, biositeId);
      if (!tenantId) return false;
      check(await db.from('bio_handoff_codes').insert({ code_hash: codeHash, tenant_id: tenantId, biosite_id: biositeId, actor, expires_at: expiresAt }));
      return true;
    },
    async audit({ apiClientId, biositeId, action, detail }) {
      const tenantId = biositeId ? await tenantOf(apiClientId, biositeId) : null;
      check(await db.from('bio_audit_log').insert({ tenant_id: tenantId, biosite_id: biositeId ?? null, api_client_id: apiClientId, action, detail: detail ?? {} }));
    },
  };
}
