import { createClient } from '@supabase/supabase-js';
import { LINK_ID_PATTERN, SLUG_PATTERN, hashIp } from '@cyber/biosite';

export const runtime = 'nodejs';

const notFound = () => new Response('Nao encontrado', { status: 404, headers: { 'Cache-Control': 'no-store' } });

// GET /r/<slug>/<linkId>: registra o clique e redireciona para o destino SALVO no banco (nunca da URL).
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; linkId: string }> }) {
  const { slug, linkId } = await params;
  if (slug.length < 3 || slug.length > 60 || !SLUG_PATTERN.test(slug) || !LINK_ID_PATTERN.test(linkId)) return notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return new Response('Indisponivel', { status: 503, headers: { 'Cache-Control': 'no-store' } });

  // IP so entra como hash com sal secreto; sem BIO_IP_SALT nada de IP e gravado.
  const salt = process.env.BIO_IP_SALT;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ipHash = salt && ip ? hashIp(ip, salt) : null;

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc('bio_track_click', { _slug: slug, _link_id: linkId, _ip_hash: ipHash });
  if (error) return new Response('Indisponivel', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (typeof data !== 'string' || !data.startsWith('https://')) return notFound();

  return new Response(null, { status: 302, headers: { Location: data, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
