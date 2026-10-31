import { apiError, provisionBiosite } from '@cyber/biosite';
import { readJson, withApiKey } from '../../../../lib/biosite/api';

export const runtime = 'nodejs';

// POST /api/v1/biosites: provisiona (idempotente pela chave company_id_externo + niche_key).
export function POST(request: Request) {
  return withApiKey(request, async ({ store, apiClientId }) => {
    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (body.value === undefined) return apiError(400, 'invalid_request', 'corpo obrigatorio');
    return provisionBiosite(store, apiClientId, body.value);
  });
}
