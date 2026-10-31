# Ficha 5: Biosite (resumo)

1. **Tres superficies:** pagina publica `/b/[slug]`, painel `/admin`, API `/api/v1/*` (chave Bearer por cliente).
2. **Dados (P2, prontos no codigo):** `api_clients`, `api_client_keys` (so hash sha256, max. 2 ativas), `biosites`, `bio_sections`, `bio_catalog_items`, `bio_link_events`, `bio_idempotency_keys`, `bio_handoff_codes`, `bio_rate_limits`, `bio_audit_log` (somente-inclusao). Migrations `202610310002_biosite_core.sql` e `202610310003_biosite_rls.sql`.
3. **Acesso publico:** o `anon` nao le nenhuma tabela. So as funcoes `get_public_biosite(slug)` e `get_public_catalog(slug, limit, offset)`, que devolvem apenas campos publicos.
4. **Papeis:** viewer le; agent edita secoes e catalogo; admin edita configuracao do biosite; so o owner publica/despublica; auditoria so admin+. Tabelas de suporte so `service_role`.
5. **Cliente avulso (sem produto de origem):** criado pelo operador (`api_client_id` nulo), nicho `generico`.
6. **Testes:** `supabase/tests/002_biosite.test.sql` (pgTAP, 27 verificacoes), rodam no job `database` da CI.
7. **Estado:** P2 escrita e testada localmente; falta aplicar no staging (aguarda 'PODE'). Proxima fase: P3 (API v1).
