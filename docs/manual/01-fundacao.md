# Ficha 1: Fundacao multi-tenant

1. **Para que serve:** garantir que um cliente nunca veja os dados de outro.
2. **Conceitos:** `tenants` (o cliente), `memberships` (quem pertence a qual cliente e com qual papel), funcao `private.is_member(tenant, papel_minimo)`.
3. **Onde esta:** `supabase/migrations/202610190001_foundation.sql` e `202610300001_foundation_hardening.sql`; testes em `supabase/tests/001_foundation_rls.test.sql`.
4. **Regras de papel:** `owner` pode tudo. `admin` so concede e altera `viewer` e `agent`, nunca `owner`. `agent` e `viewer` operam conforme a politica de cada tabela.
5. **Como operar:** toda tabela nova com dados de cliente leva `tenant_id`, RLS ligado e politica usando `is_member`.
6. **Cuidados:** testar sempre como usuario (`set local role authenticated`), nunca como `service_role`.
7. **Pendencias (fase P2):** impedir que o ultimo `owner` saia ou se rebaixe; `FORCE ROW LEVEL SECURITY` e revogacao de privilegios padrao.
