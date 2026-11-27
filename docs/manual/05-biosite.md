# Ficha 5: Biosite

1. **Tres superficies:** pagina publica `/b/[slug]` (P4, pronta), painel `/admin` (P5), API `/api/v1/*` com chave Bearer por integrador (P3, pronta).
2. **Dados (P2, no staging):** `api_clients`, `api_client_keys` (so hash sha256, max. 2 ativas), `biosites`, `bio_sections`, `bio_catalog_items`, `bio_link_events`, `bio_idempotency_keys`, `bio_handoff_codes`, `bio_rate_limits`, `bio_audit_log` (somente-inclusao). Migrations `202610310002` e `202610310003`.
3. **Acesso publico:** o `anon` nao le nenhuma tabela. So as funcoes `get_public_biosite(slug)` e `get_public_catalog(slug, limit, offset)`.
4. **Papeis no painel:** viewer le; agent edita secoes e catalogo; admin edita configuracao; so o owner publica; auditoria so admin+.
5. **API v1 (P3):** codigo em `packages/biosite` (regras, sem importar `apps/`) e rotas finas em `apps/web/app/api/v1`.
   - `GET /api/v1/health` (sem chave)
   - `POST /api/v1/biosites` provisiona; idempotente pela chave `company_id_externo + niche_key` (201 criou, 200 ja existia, 409 slug em uso)
   - `GET /api/v1/biosites/by-external?company_id_externo=&niche_key=`
   - `PATCH /api/v1/biosites/:id` (`title`, `theme`, `settings`, `published`)
   - `POST /api/v1/biosites/:id/admin-handoff` devolve codigo de uso unico valido por 60 s (consumo em `/admin/handoff`, P5)
   - Erros: `{ "error": { "code", "message" } }`; 401 igual para chave errada, revogada ou integrador desativado; 429 com `Retry-After`; respostas `Cache-Control: no-store`.
6. **Chave de API:** `bio_<prefixo8>_<segredo43>`; no banco so o sha256 do segredo; aparece uma unica vez. Criar (na raiz do repositorio): `node --env-file=apps/web/.env.local apps/web/scripts/create-api-client.mjs "nome"` (grava no banco do `.env.local`).
7. **Variaveis:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (so servidor, tipo Secret na Vercel), `BIO_RATE_LIMIT_PER_MINUTE` (padrao 120), `BIO_IP_SALT` (sal secreto; sem ele nenhum IP e gravado nos cliques).
8. **Funcoes do banco da API (migration `202610310004`):** `bio_provision`, `bio_get_biosite`, `bio_patch_biosite`, so `service_role`, sempre filtradas pelo integrador.
9. **Testes:** pgTAP em `supabase/tests/002` e `003`; Vitest em `packages/biosite` (37) e `apps/web`.
10. **Pagina publica (P4):** `/b/<slug>` le so por `get_public_biosite` e `get_public_catalog` (chave anon), cache de 60 s, 404 se nao publicado. Secoes: `hero`, `texto`, `catalogo`, `galeria`, `contato`, `links`. Tudo passa por `toSectionView` (`packages/biosite/src/render.ts`): so URLs https, tema so com cores hex e listas fechadas (fonte, raio), nunca HTML.
11. **Clique rastreado (P4):** links da secao `links` apontam para `/r/<slug>/<id>`; o destino vem do banco (`bio_track_click`, migration `202610310005`), so https e so biosite publicado, sem open redirect. IP so como hash com sal.
12. **Consumo do handoff (P5):** `GET /admin/handoff?code=...` (rota `apps/web/app/admin/handoff/route.ts`, logica em `apps/web/lib/biosite/handoff.ts`).
   - Calcula o sha256 do codigo, consome em `bio_consume_handoff` (uso unico, expira em 60 s, grava `handoff.consumed`).
   - Exige `actor.email` no pedido do integrador; sem e-mail, o codigo e recusado (400) depois de consumido.
   - Cria o usuario Auth com e-mail confirmado (se ja existe, segue), gera magic link e troca por sessao via `verifyOtp` (cookies `@supabase/ssr`).
   - Concede papel `agent` no tenant do biosite (`bio_grant_membership`); nunca `owner`.
   - Sucesso: 303 para `/admin`. Codigo invalido/usado/expirado: 401. Falha de servico: 503 sem detalhe do banco.
13. **Painel `/admin` (P5, v1):** pagina `apps/web/app/admin/page.tsx`, acoes em `app/admin/actions.ts`.
   - Usa a sessao do usuario (chave anon + cookies). Nao usa `service_role`: o RLS decide o que pode gravar.
   - Sem sessao: mostra so a instrucao de pedir link ao integrador.
   - Papel `agent`: edita secoes (texto em JSON, valores validados por `lib/biosite/admin-config.ts`, campos fora da lista sao descartados) e liga/desliga; cria e apaga itens do catalogo.
   - Nao edita titulo, tema, publicacao (exige `admin`/`owner`). Nao reordena secoes ainda.
   - Testes: `lib/biosite/admin-config.test.ts` (8). pgTAP `supabase/tests/007_biosite_panel_rls.test.sql` (20) cobre o papel `agent`: edita secoes e catalogo do proprio biosite, nao edita titulo, nao le auditoria, nao toca outro tenant; `viewer` nao grava; `anon` nao le catalogo.
   - Teste ponta a ponta no staging (servidor local apontando para o staging, 11 checks): provisiona, gera codigo, consome (303 + sessao), reuso recusado (401), painel mostra biosite e secoes, sem sessao nao mostra dados. Dados de teste ficaram no staging (biosite `e2e-p5-*`, chave revogada).
   - Testes: `lib/biosite/handoff.test.ts` (5, com dependencias falsas). O fluxo ponta a ponta ja foi feito no staging (item acima).
   - Producao (27/11/2026): PR #11 mergeado em `main`; migration `202611010003` aplicada no banco de producao (backup antes, funcoes conferidas, registrada em `supabase_migrations`); variaveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` cadastradas em Production na Vercel. Teste de fumaca do handoff em producao: ainda nao feito (cria dados reais).
14. **Pendencias:** `Idempotency-Key` por cabecalho (hoje a idempotencia e pela chave natural); contagem de visualizacoes (hoje so cliques); teste de fumaca do handoff em producao (cria dados reais; so com autorizacao); painel: editor por campo (hoje JSON), reordenar secoes, editar titulo/tema para `admin`.
