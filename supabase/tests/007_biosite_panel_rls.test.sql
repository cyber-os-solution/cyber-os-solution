-- pgTAP - painel (P5): papel agent edita secoes e catalogo do proprio biosite; nao edita o biosite,
-- nao toca outro tenant, nao le auditoria; viewer so le; anon nao le nada.
begin;
select plan(20);

-- Fixtures (como superusuario do teste).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'agent-painel@t.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'viewer-painel@t.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'fora-painel@t.local');
insert into public.tenants (id, slug, name) values
  ('00000000-0000-0000-0000-0000000000f1', 'painel-um', 'Painel Um'),
  ('00000000-0000-0000-0000-0000000000f2', 'painel-dois', 'Painel Dois');
insert into public.memberships (tenant_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'agent'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'viewer');
insert into public.biosites (id, tenant_id, niche_key, slug, title) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 'loja', 'painel-um', 'Loja Um'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2', 'loja', 'painel-dois', 'Loja Dois');
insert into public.bio_sections (id, tenant_id, biosite_id, section_type, position, enabled, config) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'texto', 0, true, '{"titulo":"antigo"}'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2', 'texto', 0, true, '{"titulo":"outro tenant"}');
insert into public.bio_catalog_items (id, tenant_id, biosite_id, slug, title) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'item-antigo', 'Item antigo');
insert into public.bio_audit_log (tenant_id, biosite_id, action, detail) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'teste.fixture', '{}');

-- Agent do tenant 1 -------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a1','role','authenticated')::text, true);

select is((select count(*)::int from public.biosites), 1, 'agent enxerga so o biosite do proprio tenant');
select lives_ok($$ update public.bio_sections set config = '{"titulo":"novo"}' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'agent edita a config de secao do proprio biosite');
select lives_ok($$ update public.bio_sections set enabled = false where id = '00000000-0000-0000-0000-0000000000e2' $$,
  'agent tenta secao de outro tenant (sem efeito, sem erro)');
select lives_ok($$ update public.biosites set title = 'Invadido' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'agent tenta mudar titulo do biosite (sem efeito, sem erro)');
select lives_ok($$ insert into public.bio_catalog_items (tenant_id, biosite_id, slug, title)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'item-novo', 'Item novo') $$,
  'agent cria item de catalogo no proprio biosite');
select lives_ok($$ insert into public.bio_sections (tenant_id, biosite_id, section_type, position, config)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'links', 1, '{}') $$,
  'agent cria secao no proprio biosite');
select throws_ok($$ insert into public.bio_catalog_items (tenant_id, biosite_id, slug, title)
  values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2', 'item-alheio', 'Alheio') $$,
  '42501', null, 'agent nao cria item no biosite de outro tenant');
select lives_ok($$ delete from public.bio_catalog_items where id = '00000000-0000-0000-0000-0000000000c1' $$,
  'agent apaga item do proprio catalogo');
select is((select count(*)::int from public.bio_audit_log), 0, 'agent nao le auditoria (exige admin)');

-- Viewer do tenant 1 --------------------------------------------------------------------
reset role; set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a2','role','authenticated')::text, true);
select lives_ok($$ update public.bio_sections set config = '{"titulo":"do viewer"}' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'viewer tenta editar secao (sem efeito, sem erro)');
select throws_ok($$ insert into public.bio_catalog_items (tenant_id, biosite_id, slug, title)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'item-viewer', 'Viewer') $$,
  '42501', null, 'viewer nao cria item de catalogo');

-- Usuario sem vinculo ----------------------------------------------------------------------
reset role; set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a3','role','authenticated')::text, true);
select is((select count(*)::int from public.biosites), 0, 'usuario sem vinculo nao enxerga biosite nenhum');

-- Anonimo ---------------------------------------------------------------------------------
reset role; set local role anon;
select throws_ok($$ select count(*) from public.bio_catalog_items $$, '42501', null, 'anon nao le catalogo');

-- Conferencia como superusuario (o RLS esconde as linhas do agent/viewer) --------------------
reset role;
select is((select config->>'titulo' from public.bio_sections where id = '00000000-0000-0000-0000-0000000000e1'), 'novo',
  'secao do tenant 1 foi editada pelo agent e nao pelo viewer');
select is((select enabled from public.bio_sections where id = '00000000-0000-0000-0000-0000000000e2'), true,
  'secao do tenant 2 continua intacta');
select is((select title from public.biosites where id = '00000000-0000-0000-0000-0000000000d1'), 'Loja Um',
  'titulo do biosite continua o mesmo');
select is((select count(*)::int from public.bio_catalog_items where slug = 'item-antigo'), 0, 'item antigo foi apagado pelo agent');
select is((select count(*)::int from public.bio_catalog_items where slug = 'item-novo'), 1, 'item novo foi criado pelo agent');
select is((select count(*)::int from public.bio_sections where tenant_id = '00000000-0000-0000-0000-0000000000f1' and section_type = 'links'), 1,
  'secao nova foi criada pelo agent');
select is((select count(*)::int from public.bio_catalog_items where slug = 'item-alheio' or slug = 'item-viewer'), 0,
  'nenhum item indevido foi gravado');

select * from finish();
rollback;
