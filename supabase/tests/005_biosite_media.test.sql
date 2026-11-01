-- pgTAP - midia do biosite (P5a): bucket, limites e escrita so por membro do tenant dono.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a3', 'agent1@t.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'viewer1@t.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner2@t.local');
insert into public.tenants (id, slug, name) values
  ('00000000-0000-0000-0000-0000000000f1', 'loja-um', 'Loja Um'),
  ('00000000-0000-0000-0000-0000000000f2', 'loja-dois', 'Loja Dois');
insert into public.memberships (tenant_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'agent'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a4', 'viewer'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.biosites (id, tenant_id, niche_key, slug, title) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 'loja', 'loja-um', 'Loja Um'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2', 'loja', 'loja-dois', 'Loja Dois');

select is((select public from storage.buckets where id = 'bio-media'), true, 'bucket bio-media existe e e publico');
select is((select file_size_limit from storage.buckets where id = 'bio-media'), 5242880::bigint, 'limite de 5 MB por arquivo');
select is((select allowed_mime_types from storage.buckets where id = 'bio-media'),
  array['image/jpeg','image/png','image/webp'], 'so jpeg, png e webp (sem SVG)');

-- agent do tenant 1
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a3','role','authenticated')::text, true);
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('bio-media', '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000000d1/foto-01.jpg') $$,
  'agent envia foto para o proprio biosite');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('bio-media', '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000000d2/foto.jpg') $$,
  '42501', null, 'agent nao envia para biosite de outro tenant (mesmo usando a pasta do seu tenant)');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('bio-media', '00000000-0000-0000-0000-0000000000f2/00000000-0000-0000-0000-0000000000d2/foto.jpg') $$,
  '42501', null, 'agent nao envia para a pasta de outro tenant');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('bio-media', '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000000d1/logo.svg') $$,
  '42501', null, 'extensao fora da lista (svg) e recusada');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('bio-media', '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000000d1/../x.jpg') $$,
  '42501', null, 'caminho com .. e recusado');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('outro-bucket', '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000000d1/foto.jpg') $$,
  '42501', null, 'outro bucket nao e coberto pela policy');

-- viewer: le, nao escreve
reset role; set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000a4','role','authenticated')::text, true);
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('bio-media', '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000000d1/foto-02.jpg') $$,
  '42501', null, 'viewer nao envia foto');
select is((select count(*)::int from storage.objects where bucket_id = 'bio-media'), 1, 'viewer ve as fotos do proprio tenant');

-- dono do tenant 2: nao ve nem apaga nada do tenant 1
reset role; set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000b1','role','authenticated')::text, true);
select is((select count(*)::int from storage.objects where bucket_id = 'bio-media'), 0, 'outro tenant nao ve fotos alheias');
select results_eq($$ with d as (delete from storage.objects where bucket_id = 'bio-media' returning 1) select count(*)::int from d $$, $$ values (0) $$,
  'outro tenant nao apaga fotos alheias (RLS filtra, 0 linhas)');

-- anon: nada
reset role; set local role anon;
select is((select count(*)::int from storage.objects), 0, 'anon nao lista objetos (leitura publica so pelo URL do bucket)');

select * from finish();
rollback;
