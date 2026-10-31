-- pgTAP - biosite (P2): isolamento entre tenants, acesso publico minimo, gatilhos.
-- Rodar: supabase test db   (banco LOCAL; nunca contra staging/producao)
begin;
select plan(27);

-- fixtures (como postgres/superuser)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner1@t.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin1@t.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'agent1@t.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'viewer1@t.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner2@t.local');
insert into public.tenants (id, slug, name, brand) values
  ('00000000-0000-0000-0000-0000000000f1', 'loja-um', 'Loja Um', '{"name":"Loja Um","logo_url":"https://x/l.png","secret_internal":"NAO-VAZAR"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'loja-dois', 'Loja Dois', '{}');
insert into public.memberships (tenant_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'agent'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a4', 'viewer'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.api_clients (id, name) values ('00000000-0000-0000-0000-0000000000c1', 'sistema-teste');
insert into public.biosites (id, tenant_id, api_client_id, company_id_externo, niche_key, slug, title, published) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'emp-1', 'loja', 'loja-um', 'Loja Um', true),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2', null, null, 'loja', 'loja-dois', 'Loja Dois', false);
insert into public.bio_sections (tenant_id, biosite_id, section_type, position, config) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'hero', 0, '{"titulo":"Oi"}'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'contato', 1, '{}');
insert into public.bio_catalog_items (tenant_id, biosite_id, slug, title, status, price) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'pub', 'Publicado', 'published', 10),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'rasc', 'Rascunho', 'draft', 20);
insert into public.bio_audit_log (tenant_id, biosite_id, action) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'teste');

-- === ANON ===
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$ select * from public.biosites $$, '42501', null, 'anon nao le biosites');
select throws_ok($$ select * from public.bio_sections $$, '42501', null, 'anon nao le secoes');
select throws_ok($$ select * from public.api_client_keys $$, '42501', null, 'anon nao le chaves');
select throws_ok($$ select * from public.tenants $$, '42501', null, 'anon nao le tenants');
select is((public.get_public_biosite('loja-um') ->> 'title'), 'Loja Um', 'RPC publica devolve biosite publicado');
select is((public.get_public_biosite('loja-dois')), null, 'RPC nao devolve biosite nao publicado');
select ok(not (public.get_public_biosite('loja-um')::text ~ 'tenant_id|api_client_id|company_id_externo|NAO-VAZAR|emp-1'),
  'RPC nao vaza campos internos nem chaves privadas do brand');
select is(jsonb_array_length(public.get_public_biosite('loja-um') -> 'sections'), 2, 'RPC devolve as secoes habilitadas');
select is(jsonb_array_length(public.get_public_catalog('loja-um') -> 'items'), 1, 'catalogo publico mostra so itens publicados');
select throws_ok($$ select public.bio_rate_limit_hit('00000000-0000-0000-0000-0000000000c1', 5) $$, '42501', null, 'anon nao chama rate limit');

-- === VIEWER do tenant 1 ===
reset role; set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a4','role','authenticated')::text, true);
select is((select count(*)::int from public.biosites), 1, 'viewer ve so o biosite do proprio tenant');
select is((select count(*)::int from public.bio_sections), 2, 'viewer le secoes');
select is((select count(*)::int from public.bio_audit_log), 0, 'viewer nao le auditoria');
select throws_ok($$ select * from public.api_clients $$, '42501', null, 'authenticated nao le api_clients');
select throws_ok($$ insert into public.bio_sections (tenant_id,biosite_id,section_type,position) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000d1','texto',5) $$,
  '42501', null, 'viewer nao cria secao');

-- === AGENT ===
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a3','role','authenticated')::text, true);
select lives_ok($$ insert into public.bio_sections (tenant_id,biosite_id,section_type,position) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000d1','texto',5) $$,
  'agent cria secao');
select throws_ok($$ insert into public.bio_sections (tenant_id,biosite_id,section_type,position) values ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000d2','texto',0) $$,
  '42501', null, 'agent nao cria secao em outro tenant');
select throws_ok($$ insert into public.bio_sections (tenant_id,biosite_id,section_type,position) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000d2','texto',9) $$,
  '23503', null, 'FK composta impede secao apontando biosite de outro tenant');
select results_eq($$ with u as (update public.biosites set title = 'x' where id = '00000000-0000-0000-0000-0000000000d1' returning 1) select count(*)::int from u $$, $$ values (0) $$, 'agent nao altera configuracao do biosite (RLS filtra, 0 linhas)');

-- === ADMIN: edita, mas nao publica ===
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a2','role','authenticated')::text, true);
select lives_ok($$ update public.biosites set title = 'Loja Um Nova' where id = '00000000-0000-0000-0000-0000000000d1' $$, 'admin edita titulo');
select throws_ok($$ update public.biosites set published = false where id = '00000000-0000-0000-0000-0000000000d1' $$, '42501', null, 'admin nao despublica (so owner)');
select throws_ok($$ update public.biosites set slug = 'outro' where id = '00000000-0000-0000-0000-0000000000d1' $$, '42501', null, 'slug nao e alteravel nem por coluna liberada');
select is((select count(*)::int from public.bio_audit_log), 1, 'admin le auditoria do proprio tenant');

-- === OWNER publica ===
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a1','role','authenticated')::text, true);
select lives_ok($$ update public.biosites set published = false where id = '00000000-0000-0000-0000-0000000000d1' $$, 'owner despublica');
select throws_ok($$ delete from public.bio_audit_log $$, '42501', null, 'auditoria e somente-inclusao');

-- === Ultimo owner (fundacao P2) ===
select results_eq($$ with d as (delete from public.memberships where tenant_id = '00000000-0000-0000-0000-0000000000f2' returning 1) select count(*)::int from d $$, $$ values (0) $$, 'owner do tenant 1 nao apaga membership do tenant 2 (RLS filtra, 0 linhas)');

-- === Chaves e rebaixamento (como postgres) ===
reset role;
select throws_ok($$ update public.memberships set role = 'admin' where tenant_id = '00000000-0000-0000-0000-0000000000f2' $$, '23514', null, 'ultimo owner nao pode ser rebaixado');

select * from finish();
rollback;
