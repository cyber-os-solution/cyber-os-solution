import { getBiositeByExternal } from '@cyber/biosite';
import { withApiKey } from '../../../../../lib/biosite/api';

export const runtime = 'nodejs';

// GET /api/v1/biosites/by-external?company_id_externo=...&niche_key=...
export function GET(request: Request) {
  return withApiKey(request, ({ store, apiClientId }) =>
    getBiositeByExternal(store, apiClientId, new URL(request.url).searchParams),
  );
}
