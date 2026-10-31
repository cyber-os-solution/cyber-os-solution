# Decisoes de negocio

- **2026-10-31, cobranca:** ainda sem clientes e sem preco definido. Nao ha codigo de cobranca agora (fase P7). Clientes que ja tem site e sistema recebem a API do biosite e a cobranca vem depois, junto com a manutencao do site (faturamento manual no comeco). Clientes avulsos (ex.: borracharia) terao assinatura propria, a definir apos pesquisa de mercado.
- **2026-10-31, faturamento futuro:** o sistema guarda por integrador (`api_client_id`) quantos biosites existem e quantos cliques cada um recebe.
- **2026-10-31, modelos A e B:** o projeto nasce preparado para os dois. O A e construido primeiro; o B ganha o kit de instalacao na fase P8.
- **2026-10-31, Vercel:** Hobby apenas para desenvolvimento e teste; Pro antes do primeiro cliente pagante.
- **2026-10-31, producao:** nada das migrations 0001 a 0005 esta em producao (lista de migrations vazia; so as tabelas antigas `biosite_tenants` e `biosite_sections`, 1 linha cada, com leitura publica). Ir para producao exige backup e o 'PODE PRODUCAO' do dono. Ver `parecer-p4.md`.
