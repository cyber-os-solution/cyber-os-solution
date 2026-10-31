-- pgTAP - API v1 (P3): funcoes atomicas, idempotencia e isolamento entre integradores.
begin;
select plan(14);

insert into public.api_clients (id, name) values
  ('00000000-0000-0000-0000-0000000000c1', 'sistema-um'),
  ('00000000-0000-0000-0000-0000000000c2', 'sistema-dois');
insert into public.api_clients (id, name, disabled_at) values ('00000000-0000-0000-0000-0000000000c3', 'desativado', now());

set local role service_role;

select is((public.bio_provision('00000000-0000-0000-0000-0000000000c1', 'emp-1', 'loja', 'loja-api', 'Loja API',
  '{"cor":"azul"}', '{}', '[{"section_type":"hero","config":{"t":1}},{"section_type":"contato"}]') ->> 'created'),
  'true', 'provisiona biosite novo');

select is((select jsonb_array_length(public.bio_get_biosite('00000000-0000-0000-0000-0000000000c1', null, 'emp-1', 'loja') -> 'sections')),
  2, 'secoes criadas na ordem');

select is((public.bio_provision('00000000-0000-0000-0000-0000000000c1', 'emp-1', 'loja', 'outro-slug', 'Outro')) ->> 'created',
  'false', 'repetir a chave natural e idempotente (nao cria de novo)');

select is((select count(*)::int from public.tenants where slug in ('loja-api','outro-slug')), 1, 'idempotencia nao criou tenant extra');

select throws_ok($$ select public.bio_provision('00000000-0000-0000-0000-0000000000c2', 'emp-9', 'loja', 'loja-api', 'Colide') $$,
  '23505', null, 'slug de outro biosite gera 23505 (API responde 409)');

select throws_ok($$ select public.bio_provision('00000000-0000-0000-0000-0000000000c3', 'x', 'loja', 'desat-slug', 'D') $$,
  '42501', null, 'integrador desativado nao provisiona');

select is(public.bio_get_biosite('00000000-0000-0000-0000-0000000000c2', null, 'emp-1', 'loja'), null,
  'outro integrador nao enxerga o biosite (por chave externa)');

select is(public.bio_get_biosite('00000000-0000-0000-0000-0000000000c2',
  (public.bio_get_biosite('00000000-0000-0000-0000-0000000000c1', null, 'emp-1', 'loja') ->> 'id')::uuid), null,
  'outro integrador nao enxerga o biosite (por id)');

select is((public.bio_patch_biosite('00000000-0000-0000-0000-0000000000c1',
  (public.bio_get_biosite('00000000-0000-0000-0000-0000000000c1', null, 'emp-1', 'loja') ->> 'id')::uuid,
  '{"published": true, "title": "Titulo Novo"}') ->> 'published'), 'true', 'integrador publica via API');

select is((public.bio_get_biosite('00000000-0000-0000-0000-0000000000c1', null, 'emp-1', 'loja') ->> 'title'), 'Titulo Novo', 'titulo alterado');

select is(public.bio_patch_biosite('00000000-0000-0000-0000-0000000000c2',
  (public.bio_get_biosite('00000000-0000-0000-0000-0000000000c1', null, 'emp-1', 'loja') ->> 'id')::uuid, '{"title":"hack"}'),
  null, 'outro integrador nao altera');

select is((select count(*)::int from public.bio_audit_log where action in ('biosite.provisioned','biosite.patched')), 2, 'auditoria registrada');

-- anon e authenticated nao executam
reset role; set local role anon;
select throws_ok($$ select public.bio_provision('00000000-0000-0000-0000-0000000000c1', 'z', 'loja', 'anon-slug', 'A') $$, '42501', null, 'anon nao provisiona');
reset role; set local role authenticated;
select throws_ok($$ select public.bio_get_biosite('00000000-0000-0000-0000-0000000000c1', null, 'emp-1', 'loja') $$, '42501', null, 'authenticated nao chama a API');

select * from finish();
rollback;
