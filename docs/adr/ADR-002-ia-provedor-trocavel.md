# ADR-002 — IA atrás de contrato único

**Status:** Aceita em 19/10/2026

## Decisão

Chat e embeddings serão acessados exclusivamente por `@cyber/ai`, com schemas Zod para entradas e saídas. O primeiro adaptador será escolhido por configuração de ambiente, sem vazar SDK de fornecedor para módulos de negócio.

## Consequências

O modelo de embeddings e sua dimensão devem ser registrados antes de criar a tabela de vetores. Nenhuma chave de IA é armazenada no cliente.
