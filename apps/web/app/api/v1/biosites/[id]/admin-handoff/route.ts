import { createAdminHandoff } from '@cyber/biosite';
import { readJson, withApiKey } from '../../../../../../lib/biosite/api';

export const runtime = 'nodejs';

// POST /api/v1/biosites/:id/admin-handoff  { actor?: { email?, name? } }  -> codigo de uso unico (60 s)
export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiKey(request, async ({ store, apiClientId }) => {
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;
    return createAdminHandoff(store, apiClientId, id, body.value);
  });
}
