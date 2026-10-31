-- pgTAP - fundacao: USAGE no schema private e escalada de papel em memberships.
-- Rodar: supabase test db   (banco LOCAL; nunca contra staging/producao)
-- STATUS: escrito em 30/10/2026, AINDA NAO EXECUTADO (sem Docker/Supabase local na sessao).
begin;
select plan(7);

-- fixtures (como postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@teste.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@teste.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'agent@teste.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'novo@teste.local');
insert into public.tenants (id, slug, name)
  values ('00000000-0000-0000-0000-0000000000f1', 'tenant-teste', 'Tenant Teste');
insert into public.memberships (tenant_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'agent');

-- === como ADMIN ===
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);

-- 1 (G4a) policies funcionam: admin enxerga o proprio tenant
select is((select count(*)::int from public.tenants), 1, 'admin le o proprio tenant (policies com private.is_member funcionam)');

-- 2 (G4b) admin NAO concede owner
select throws_ok(
  $$ insert into public.memberships (tenant_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a4', 'owner') $$,
  '42501', null, 'G4b: admin nao concede owner');

-- 3 (G4b) admin NAO concede admin
select throws_ok(
  $$ insert into public.memberships (tenant_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a4', 'admin') $$,
  '42501', null, 'G4b: admin nao concede admin');

-- 4 admin concede agent
select lives_ok(
  $$ insert into public.memberships (tenant_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a4', 'agent') $$,
  'admin concede agent');

-- 5 (G4b) admin tenta se promover: a linha dele nao e alteravel por ele
update public.memberships set role = 'owner'
 where tenant_id = '00000000-0000-0000-0000-0000000000f1'
   and user_id = '00000000-0000-0000-0000-0000000000a2';

-- === como OWNER ===
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);

-- 6 owner promove a4 para admin
select lives_ok(
  $$ update public.memberships set role = 'admin'
      where tenant_id = '00000000-0000-0000-0000-0000000000f1'
        and user_id = '00000000-0000-0000-0000-0000000000a4' $$,
  'owner promove para admin');

-- conferir como postgres
reset role;
select is(
  (select role::text from public.memberships
    where user_id = '00000000-0000-0000-0000-0000000000a2'),
  'admin', 'G4b: tentativa do admin de se promover a owner nao alterou nada');

select * from finish();
rollback;
