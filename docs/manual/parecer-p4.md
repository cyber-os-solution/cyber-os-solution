# Parecer de prontidao do biosite (31/10/2026, fim da P4)

## Veredito
- **Para testar com o seu Instagram (uso pessoal ou de teste):** pronto no codigo. Faltam so passos de producao e de conteudo, cerca de 40 a 60 minutos (roteiro abaixo).
- **Para entregar a um cliente pagante:** faltam o painel de edicao (P5), upload de imagens, area do operador e relatorios (P6), cobranca (P7), dominio proprio e Vercel Pro.

## O que esta pronto e testado (staging)
| Peca | Estado | Prova |
|---|---|---|
| Banco multi-tenant com RLS (10 tabelas `bio_*`) | Pronto | pgTAP, 56 verificacoes, no CI (job `database`) |
| API v1 (provisionar idempotente, buscar, alterar, handoff, health) | Pronto | 9 chamadas reais contra o staging |
| Chave de API so com hash, rate limit, auditoria somente-inclusao | Pronto | Vitest e pgTAP |
| Pagina publica `/b/<slug>` (6 tipos de secao, tema seguro, so https) | Pronto | 5 verificacoes reais (200, 404, rastreio, URL escondida, `javascript:` bloqueado) |
| Clique rastreado `/r/<slug>/<id>` (sem open redirect, IP so em hash) | Pronto no banco e na rota; 302 ponta a ponta ainda por confirmar com `curl.exe` | pgTAP 004 |

## O que NAO existe ainda
1. **Painel de edicao (P5):** hoje o conteudo se cria e altera por API ou script. Secoes e catalogo nao tem editor.
2. **Upload de imagens:** so URLs https externas.
3. **Visualizacoes:** so cliques sao contados.
4. **Operador, relatorios, cobranca (P6, P7), kit modelo B (P8).**
5. **Dominio proprio:** o endereco sera `*.vercel.app` ate configurarmos um dominio.

## Estado de producao (descoberto em 31/10)
- Lista de migrations vazia: nenhuma migration do repositorio foi aplicada. Nem a fundacao (`tenants`, `memberships`).
- Existem as tabelas antigas `biosite_tenants` e `biosite_sections` (1 linha cada), com RLS e **leitura publica**. `biosite_tenants` expoe `external_client_id` e `company_id_externo` a quem tiver a chave anon (publica no navegador).
- Integracao automatica GitHub/Supabase: a `0005` apareceu no staging sem ser aplicada por nos. Origem nao confirmada. Producao nao foi afetada.

## Roteiro para ir a producao e testar no Instagram (so com 'PODE PRODUCAO')
1. Backup: exportar as duas tabelas antigas (2 linhas) e conferir o backup do projeto de producao no painel do Supabase.
2. Tratar as tabelas antigas: renomear para `legacy_biosite_*` e remover a policy de leitura publica (nao apagar).
3. Aplicar as migrations `0001` a `0005` em producao (`supabase db push` apontando para `phsfvwvngpxvxaurowvf`).
4. Vercel, ambiente Production: `SUPABASE_SERVICE_ROLE_KEY` (tipo Secret), `BIO_IP_SALT` (Secret), `BIO_RATE_LIMIT_PER_MINUTE`.
5. Criar o integrador e o biosite real em producao (script), publicar e conferir no celular.
6. Colocar `https://<dominio>/b/<slug>` na bio do Instagram.
7. Conferir cliques gravados e o aviso de seguranca do Supabase (advisors).

## Cuidados
- **Vercel Hobby e so para uso nao comercial.** Se o Instagram for de um negocio, o correto e Pro antes de divulgar.
- A chave `service_role` e a `BIO_IP_SALT` nunca levam prefixo `NEXT_PUBLIC_`.
- LGPD: a pagina publica nao usa cookies e nao grava IP puro; ainda assim, clausula de tratamento de dados nos contratos (advogado).
