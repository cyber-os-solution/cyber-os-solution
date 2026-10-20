# ADR-003 — SQL Supabase, RLS e acesso de servidor

**Status:** Aceita em 19/10/2026

## Decisão

Migrations SQL do Supabase CLI são a fonte de verdade. O aplicativo usa Supabase SDK e tipos gerados; Drizzle é permitido apenas no worker quando necessário. Todas as tabelas de negócio possuem `tenant_id` e RLS.

## Consequências

Prisma não é usado. Policies chamam `private.is_member`, e service role permanece restrita ao worker e handlers de webhook.
