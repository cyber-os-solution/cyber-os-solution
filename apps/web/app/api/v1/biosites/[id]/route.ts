import { apiError, patchBiosite } from '@cyber/biosite';
import { readJson, withApiKey } from '../../../../../lib/biosite/api';

export const runtime = 'nodejs';

// PATCH /api/v1/biosites/:id  { title?, theme?, settings?, published? }
export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiKey(request, async ({ store, apiClientId }) => {
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;
    if (body.value === undefined) return apiError(400, 'invalid_request', 'corpo obrigatorio');
    return patchBiosite(store, apiClientId, id, body.value);
  });
}
