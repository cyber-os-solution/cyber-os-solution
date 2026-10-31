export const runtime = 'nodejs';

export function GET() {
  return Response.json({ status: 'ok', service: 'biosite-api', version: 'v1' }, { headers: { 'Cache-Control': 'no-store' } });
}
