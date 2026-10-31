# Modelos de venda A e B

- **A. Servico hospedado:** roda no CYBER-OS; o sistema do cliente chama a API (ou o SDK `biosite-client`, a criar). O dono do CYBER-OS paga a infraestrutura e cobra assinatura.
- **B. Instalado no ambiente do cliente:** o modulo `packages/biosite` e as migrations `bio_*` vao para o GitHub, Supabase e Vercel do cliente. O cliente paga a infraestrutura; cobra-se licenca e implantacao.

## Regras que mantem os dois possiveis
1. Todas as tabelas do modulo com prefixo `bio_`.
2. O modulo so depende da fundacao por um contrato pequeno (`tenants`, `memberships`, `is_member`).
3. Codigo de dominio em `packages/biosite`, sem importar nada de `apps/`.
4. Versao numerada (semver) das migrations e do pacote, para atualizar instalacoes do modelo B.
5. Configuracao por variaveis de ambiente, sem endereco fixo no codigo.
6. Kit de instalacao do modelo B (guia + script): fase P8.
