import { apiError, authenticate, type ApiResponse, type BiositeStore } from '@cyber/biosite';
import { createSupabaseStore } from './store';

const MAX_BODY_BYTES = 64 * 1024;

export function toResponse(r: ApiResponse): Response {
  return Response.json(r.body, { status: r.status, headers: { 'Cache-Control': 'no-store', ...r.headers } });
}

export type JsonBody = { ok: true; value: unknown } | { ok: false; response: ApiResponse };

// Le o corpo com limite de tamanho. Corpo vazio vira undefined.
export async function readJson(request: Request, maxBytes = MAX_BODY_BYTES): Promise<JsonBody> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return { ok: false, response: apiError(413, 'payload_too_large', 'corpo grande demais') };
  const text = await request.text();
  if (text.length > maxBytes) return { ok: false, response: apiError(413, 'payload_too_large', 'corpo grande demais') };
  if (text.trim() === '') return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: apiError(400, 'invalid_json', 'JSON invalido') };
  }
}

export interface ApiContext {
  store: BiositeStore;
  apiClientId: string;
}

// Autentica a chave Bearer e executa o handler. Toda resposta sai com Cache-Control: no-store.
export async function withApiKey(request: Request, run: (ctx: ApiContext) => Promise<ApiResponse>): Promise<Response> {
  let store: BiositeStore;
  try {
    store = createSupabaseStore();
  } catch {
    return toResponse(apiError(503, 'unavailable', 'servico indisponivel'));
  }
  const limit = Number(process.env.BIO_RATE_LIMIT_PER_MINUTE ?? 120);
  const auth = await authenticate(store, request.headers.get('authorization'), Number.isFinite(limit) && limit > 0 ? limit : 120);
  if (!auth.ok) return toResponse(auth.response);
  return toResponse(await run({ store, apiClientId: auth.apiClientId }));
}
