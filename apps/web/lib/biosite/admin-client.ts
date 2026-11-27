import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Cliente com a SESSAO do usuario (chave anon + cookies). O RLS decide o que ele pode ler e gravar.
// Nunca usar service_role no painel.
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('variaveis de ambiente ausentes');
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          for (const { name, value, options } of items) cookieStore.set(name, value, options);
        } catch {
          // Em componente de leitura o Next nao permite gravar cookie; o middleware/handoff cuida da renovacao.
        }
      },
    },
  });
}
