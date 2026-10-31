# Manual Operacional do CYBER-OS Solution

Este e o ponto unico para saber **o que cada modulo faz, onde esta e como operar**.
A fonte da verdade vive aqui, junto do codigo; uma copia fica no Projeto do Claude para consulta por pergunta.

## Como usar
- Abra a ficha do modulo pelo indice abaixo.
- No Claude, pergunte: "o que faz o modulo Jobs?", "como crio um relatorio novo?", "como instalo o biosite no cliente (modelo B)?".
- Modelo de ficha: `_modelo-de-ficha.md`.

## Regra de pronto
Nenhum modulo e entregue sem a ficha atualizada neste diretorio. Mudou comportamento, tabela, rota, variavel ou permissao: atualize a ficha no mesmo Pull Request.

## Indice de modulos
| # | Modulo | O que faz | Ficha | Estado |
|---|---|---|---|---|
| 1 | Fundacao multi-tenant | Isola cada cliente (`tenant`) e controla papeis | [01-fundacao.md](01-fundacao.md) | Pronto (hardening aplicado no staging) |
| 2 | Jobs e Worker | Fila de tarefas em segundo plano | [02-jobs-worker.md](02-jobs-worker.md) | Pronto (falta rodar o pgTAP) |
| 3 | Web | Aplicacao Next.js (paginas, painel, API) | [03-web.md](03-web.md) | Esqueleto no ar |
| 4 | Ambientes, CI e Deploy | Producao, staging, preview e CI | [04-ambientes-ci-deploy.md](04-ambientes-ci-deploy.md) | Pronto |
| 5 | Biosite | Pagina publica por cliente, painel, API v1 | [05-biosite.md](05-biosite.md) | Em projeto (fases P2 a P6) |
| 6 | Relatorios | Metricas por cliente e visao do operador | a criar na P5 | Planejado |
| 7 | Cobranca e e-mail | Mercado Pago e Resend | a criar na P7 | Planejado |

Tambem: [modelos-a-b.md](modelos-a-b.md) (venda hospedada ou instalada no cliente) e [decisoes.md](decisoes.md) (decisoes de negocio).
