# Ficha 5: Biosite (resumo)

1. **Tres superficies:** pagina publica `/b/[slug]`, painel `/admin`, API `/api/v1/*` (chave Bearer por cliente).
2. **Dados:** tabelas `bio_*` e `biosites`, ligadas a fundacao por `tenant_id`.
3. **Cliente avulso (sem produto de origem):** criado pelo operador (`api_client_id` nulo), nicho `generico`.
4. **Detalhe completo:** documento de projeto do biosite (secao 6), no Projeto do Claude.
5. **Estado:** em projeto. Proxima fase: P2 (tabelas `bio_*`, RLS e pgTAP).
