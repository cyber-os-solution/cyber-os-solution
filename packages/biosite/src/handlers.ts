import { newHandoffCode, parseApiKey, secretMatches } from './keys';
import { StoreError, type BiositeStore } from './store';
import { isUuid, validateExternalQuery, validateHandoff, validatePatch, validateProvision } from './validate';

export interface ApiResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type AuthResult = { ok: true; apiClientId: string; keyId: string } | { ok: false; response: ApiResponse };

export const HANDOFF_TTL_SECONDS = 60;

export const apiError = (status: number, code: string, message: string, headers?: Record<string, string>): ApiResponse => ({
  status,
  body: { error: { code, message } },
  ...(headers ? { headers } : {}),
});

const UNAUTHORIZED = apiError(401, 'unauthorized', 'chave de API ausente ou invalida', { 'WWW-Authenticate': 'Bearer' });
const NOT_FOUND = apiError(404, 'not_found', 'biosite nao encontrado');

function fromStoreError(e: unknown): ApiResponse {
  if (e instanceof StoreError) {
    if (e.code === 'slug_taken') return apiError(409, 'slug_taken', 'slug ja em uso');
    if (e.code === 'client_invalid') return UNAUTHORIZED;
  }
  return apiError(503, 'unavailable', 'servico indisponivel, tente novamente');
}

export async function authenticate(store: BiositeStore, authorization: string | null, rateLimitPerMinute = 120): Promise<AuthResult> {
  const match = /^Bearer (\S+)$/.exec(authorization ?? '');
  const parsed = match?.[1] ? parseApiKey(match[1]) : null;
  if (!parsed) return { ok: false, response: UNAUTHORIZED };
  try {
    const record = await store.findKey(parsed.prefix);
    // Mesma resposta para chave inexistente, errada, revogada ou cliente desativado.
    if (!record || record.revokedAt || record.clientDisabledAt || !secretMatches(parsed.secret, record.secretHash)) {
      return { ok: false, response: UNAUTHORIZED };
    }
    if (!(await store.rateLimitHit(record.apiClientId, rateLimitPerMinute))) {
      return { ok: false, response: apiError(429, 'rate_limited', 'limite de requisicoes excedido', { 'Retry-After': '60' }) };
    }
    await store.touchKey(record.id).catch(() => undefined); // melhor esforco
    return { ok: true, apiClientId: record.apiClientId, keyId: record.id };
  } catch {
    return { ok: false, response: apiError(503, 'unavailable', 'servico indisponivel, tente novamente') };
  }
}

export async function provisionBiosite(store: BiositeStore, apiClientId: string, body: unknown): Promise<ApiResponse> {
  const input = validateProvision(body);
  if (!input.ok) return apiError(400, 'invalid_request', input.message);
  try {
    const { created, biosite } = await store.provision(apiClientId, input.value);
    return { status: created ? 201 : 200, body: { created, biosite } };
  } catch (e) {
    return fromStoreError(e);
  }
}

export async function getBiositeByExternal(store: BiositeStore, apiClientId: string, params: URLSearchParams): Promise<ApiResponse> {
  const query = validateExternalQuery(params);
  if (!query.ok) return apiError(400, 'invalid_request', query.message);
  try {
    const biosite = await store.getByExternal(apiClientId, query.value.companyIdExterno, query.value.nicheKey);
    return biosite ? { status: 200, body: { biosite } } : NOT_FOUND;
  } catch (e) {
    return fromStoreError(e);
  }
}

export async function patchBiosite(store: BiositeStore, apiClientId: string, id: string, body: unknown): Promise<ApiResponse> {
  if (!isUuid(id)) return NOT_FOUND;
  const patch = validatePatch(body);
  if (!patch.ok) return apiError(400, 'invalid_request', patch.message);
  try {
    const biosite = await store.patch(apiClientId, id, patch.value);
    return biosite ? { status: 200, body: { biosite } } : NOT_FOUND;
  } catch (e) {
    return fromStoreError(e);
  }
}

export async function createAdminHandoff(store: BiositeStore, apiClientId: string, id: string, body: unknown, now: Date = new Date()): Promise<ApiResponse> {
  if (!isUuid(id)) return NOT_FOUND;
  const input = validateHandoff(body);
  if (!input.ok) return apiError(400, 'invalid_request', input.message);
  try {
    const { code, codeHash } = newHandoffCode();
    const expiresAt = new Date(now.getTime() + HANDOFF_TTL_SECONDS * 1000).toISOString();
    const ok = await store.createHandoff({ apiClientId, biositeId: id, codeHash, actor: input.value.actor, expiresAt });
    if (!ok) return NOT_FOUND;
    await store.audit({ apiClientId, biositeId: id, action: 'handoff.created' }).catch(() => undefined);
    return { status: 201, body: { code, expires_at: expiresAt, expires_in: HANDOFF_TTL_SECONDS, path: `/admin/handoff?code=${code}` } };
  } catch (e) {
    return fromStoreError(e);
  }
}
