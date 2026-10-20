# CYBER-OS Solution

Plataforma SaaS multi-tenant para atendimento, automação e relacionamento.

## Estrutura

- `apps/web`: painel Next.js e endpoints HTTP.
- `apps/worker`: consumidor Docker da fila de jobs.
- `packages/*`: contratos reutilizáveis de domínio e integrações.
- `supabase/migrations`: única fonte de verdade do banco.
- `docs/adr`: decisões arquiteturais aceitas.

## Pré-requisitos

Node.js 22+, pnpm 10+, Docker Desktop e Supabase CLI.

## Início local

```powershell
pnpm install
supabase start
pnpm dev
```

Copie `apps/web/.env.example` para `apps/web/.env.local` e mantenha segredos fora do Git. Antes de executar a migration em qualquer ambiente, revise-a e execute os testes de RLS.

## Princípios não negociáveis

- Toda entidade de negócio pertence a um tenant e tem RLS ativo.
- Service role só é usada pelo worker e por handlers de webhooks no servidor.
- Webhooks registram e enfileiram; o worker realiza efeitos externos.
- A Meta Cloud API é o único canal WhatsApp suportado.
