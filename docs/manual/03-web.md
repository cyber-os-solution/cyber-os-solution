# Ficha 3: Web (apps/web)

1. **Para que serve:** aplicacao Next.js 15 (App Router) com paginas, painel e rotas HTTP.
2. **Onde esta:** `apps/web/app`. Hoje: pagina inicial e `GET /api/health`.
3. **Comandos:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (na raiz).
4. **Variaveis:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publicas, tipo Config na Vercel). Chaves privadas so em modulos `server-only`.
5. **Cuidados:** `next-env.d.ts` e gerado pelo Next e nao e versionado (o `typecheck` roda `next typegen` antes).
6. **Pendencias:** pagina publica do biosite, painel e API v1 (fases P3 a P5).
