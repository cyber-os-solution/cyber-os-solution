# Ficha 5: Biosite

1. **Tres superficies:** pagina publica `/b/[slug]` (P4), painel `/admin` (P5), API `/api/v1/*` com chave Bearer por integrador (P3, pronta).
2. **Dados (P2, no staging):** `api_clients`, `api_client_keys` (so hash sha256, max. 2 ativas), `biosites`, `bio_sections`, `bio_catalog_items`, `bio_link_events`, `bio_idempotency_keys`, `bio_handoff_codes`, `bio_rate_limits`, `bio_audit_log` (somente-inclusao). Migrations `202610310002` e `202610310003`.
3. **Acesso publico:** o `anon` nao le nenhuma tabela. So as funcoes `get_public_biosite(slug)` e `get_public_catalog(slug, limit, offset)`.
4. **Papeis no painel:** viewer le; agent edita secoes e catalogo; admin edita configuracao; so o owner publica; auditoria so admin+.
5. **API v1 (P3):** codigo em `packages/biosite` (regras, sem importar `apps/`) e rotas finas em `apps/web/app/api/v1`.
   - `GET /api/v1/health` (sem chave)
   - `POST /api/v1/biosites` provisiona; idempotente pela chave `company_id_externo + niche_key` (201 criou, 200 ja existia, 409 slug em uso)
   - `GET /api/v1/biosites/by-external?company_id_externo=&niche_key=`
   - `PATCH /api/v1/biosites/:id` (`title`, `theme`, `settings`, `published`)
   - `POST /api/v1/biosites/:id/admin-handoff` devolve codigo de uso unico valido por 60 s (consumo na P5)
   - Erros: `{ "error": { "code", "message" } }`; 401 igual para chave errada, revogada ou integrador desativado; 429 com `Retry-After`; respostas `Cache-Control: no-store`.
6. **Chave de API:** `bio_<prefixo8>_<segredo43>`; no banco so o sha256 do segredo; aparece uma unica vez. Criar: `pnpm --filter "@cyber/web" exec node --env-file=.env.local scripts/create-api-client.mjs "nome"` (grava no banco do `.env.local`).
7. **Variaveis:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (so servidor, tipo Secret na Vercel), `BIO_RATE_LIMIT_PER_MINUTE` (padrao 120).
8. **Funcoes do banco da API (migration `202610310004`):** `bio_provision`, `bio_get_biosite`, `bio_patch_biosite`, so `service_role`, sempre filtradas pelo integrador.
9. **Testes:** pgTAP em `supabase/tests/002` e `003`; Vitest em `packages/biosite` (37) e `apps/web`.
10. **Pendencias:** `Idempotency-Key` por cabecalho (hoje a idempotencia e pela chave natural); aplicar 0004 no staging e depois em producao (backup + 'PODE PRODUCAO'); P4 pagina publica.
