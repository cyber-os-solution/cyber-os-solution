# Ambientes - dev/staging vs producao

| Ambiente | Pasta local | Branch git | Banco/Backend | Deploy |
|---|---|---|---|---|
| Producao | (nao ha copia local; so via GitHub) | `main` | Supabase `cyber-os-solution` (ref `phsfvwvngpxvxaurowvf`, https://phsfvwvngpxvxaurowvf.supabase.co) | Vercel Production, disparado por merge em `main` |
| Staging/dev | `F:\Projetos\cyber-os-solution` | qualquer branch que nao seja `main` (ex.: `chore/higiene`) | Supabase `cyber-os-solution-staging` (ref `btjubunofdjhkorlxpge`, https://btjubunofdjhkorlxpge.supabase.co) | Vercel Preview, disparado por push na branch |

Repositorio: https://github.com/cyber-os-solution/cyber-os-solution

## Fluxo obrigatorio para qualquer mudanca de codigo ou de banco

1. Trabalhar sempre em branch nova a partir da `main` atualizada; nunca commitar direto em `main`.
2. `.env.local` local aponta SEMPRE para o staging (`btjubunofdjhkorlxpge`). Nunca para producao.
3. O Supabase CLI desta pasta fica vinculado SOMENTE ao staging (`supabase/.temp/project-ref`). Nao rode `supabase link` para producao sem "pode" explicito.
4. Migrations: aplicar primeiro no staging; producao so depois de validado, com backup e "pode" por acao.
5. Merge em `main` e o unico gatilho que toca producao. O clique em Merge e do Joaquim.

## Segredos

- Nunca commitar `.env*` (so `.env.example`). Nunca colar `service_role`, senha do banco ou tokens em chat, doc, commit ou log.
- Chaves `sb_publishable_` sao publicas; `service_role` e `sb_secret_` nunca.
- Valores reais de Production e Preview ficam nas Environment Variables da Vercel (Production = banco de producao, Preview = banco de staging).

## Stack

Next.js (App Router) + TypeScript, Supabase (PostgreSQL + Auth + RLS), Vercel, Docker, Ngrok, Mercado Pago, Resend. Sem Lovable, sem n8n, sem Edge Functions.

## Qualidade e definicao de pronto

Comandos na raiz (todos devem passar antes de abrir o Pull Request): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. A CI roda os mesmos e ainda faz o `docker build` do worker.

Uma mudanca so esta pronta quando:
1. Os 4 comandos acima passam.
2. Ha teste para o comportamento novo (testes de banco com pgTAP, simulando usuario; nunca como `service_role`).
3. A ficha do modulo em `docs/manual/` foi atualizada no mesmo Pull Request.
4. Nenhum segredo entrou no codigo, no commit ou em log.

## Manual operacional

`docs/manual/README.md` e o indice de modulos (o que faz, onde esta, como operar). Uma copia fica no Projeto do Claude; ao pedir "como funciona o modulo X?", consulte a ficha.

