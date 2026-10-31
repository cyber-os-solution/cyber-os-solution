# Ficha 4: Ambientes, CI e Deploy

| Ambiente | Banco | Deploy |
|---|---|---|
| Local | `.env.local` aponta para o staging | `next dev` |
| Staging/Preview | Supabase `btjubunofdjhkorlxpge` | Vercel Preview (uma URL por branch) |
| Producao | Supabase `phsfvwvngpxvxaurowvf` | Vercel Production, branch `main` |

- **Fluxo:** branch, Pull Request, CI e Preview, validacao, Merge pelo dono.
- **CI** (`.github/workflows/ci.yml`): `quality` (lint, typecheck, test, build) e `worker-image` (docker build do worker).
- **Vercel:** projeto `cyber-os-solution`, raiz `apps/web`, Node 22.x. Variaveis publicas como Config; segredos como Secret, nunca com prefixo `NEXT_PUBLIC_`.
- **Contas:** o GitHub deste projeto e `cyber-os-solution`. O token e escolhido por janela (`$env:GH_TOKEN`), sem depender da conta ativa do `gh`.
- **Cuidado:** a Vercel Hobby e so para uso nao comercial; antes do primeiro cliente pagante, migrar para Pro.
