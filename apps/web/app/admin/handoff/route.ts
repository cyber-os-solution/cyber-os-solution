import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { acceptHandoff } from '../../../lib/biosite/handoff';
import { createHandoffDeps } from '../../../lib/biosite/handoff-deps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
const text = (body: string, status: number) => new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });

// GET /admin/handoff?code=...: consome o codigo de uso unico (60 s) e abre a sessao do painel.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code') ?? '';
  if (code.length < 20 || code.length > 128) return text('Codigo invalido, usado ou expirado. Gere um novo pelo integrador.', 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return text('Servico indisponivel.', 503);

  let result;
  try {
    result = await acceptHandoff(createHandoffDeps(), code);
  } catch {
    // Nunca repassa a mensagem interna do banco ou do Auth.
    return text('Servico indisponivel. Tente de novo em instantes.', 503);
  }
  if (!result.ok) {
    if (result.reason === 'no_email') return text('Este codigo nao tem e-mail do responsavel. Gere um novo pelo integrador com actor.email.', 400);
    return text('Codigo invalido, usado ou expirado. Gere um novo pelo integrador.', 401);
  }

  // Cria a sessao: o verifyOtp devolve os cookies de sessao, que vao explicitamente na resposta de redirect.
  const cookieStore = await cookies();
  const sessionCookies: { name: string; value: string; options?: CookieOptions }[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
        sessionCookies.push(...items);
      },
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: result.tokenHash, type: 'magiclink' });
  if (error) return text('Nao foi possivel abrir a sessao. Gere um novo codigo.', 401);

  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  for (const { name, value, options } of sessionCookies) response.cookies.set(name, value, options);
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}
