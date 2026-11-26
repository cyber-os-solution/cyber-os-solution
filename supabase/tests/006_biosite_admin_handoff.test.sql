-- pgTAP - Painel (P5): consumo do codigo de handoff (uso unico, expiracao) e concessao de papel.
begin;
select plan(14);

insert into public.api_clients (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'handoff-cliente');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'p5-teste@example.invalid')
  on conflict (id) do nothing;

set local role service_role;
do $$ begin
  perform public.bio_provision('00000000-0000-0000-0000-0000000000d1', 'emp-h', 'loja', 'loja-handoff', 'Loja Handoff', '{}', '{}', '[]');
end $$;
reset role;

-- Codigos de teste (o servidor guarda so o sha256 do codigo).
insert into public.bio_handoff_codes (code_hash, tenant_id, biosite_id, actor, expires_at)
select encode(sha256('codigo-ok-1'::bytea), 'hex'), b.tenant_id, b.id, '{"email":"dono@example.invalid"}', now() + interval '60 seconds'
  from public.biosites b where b.slug = 'loja-handoff';
insert into public.bio_handoff_codes (code_hash, tenant_id, biosite_id, actor, created_at, expires_at)
select encode(sha256('codigo-ok-2'::bytea), 'hex'), b.tenant_id, b.id, '{}', now(), now() + interval '60 seconds'
  from public.biosites b where b.slug = 'loja-handoff';
insert into public.bio_handoff_codes (code_hash, tenant_id, biosite_id, actor, created_at, expires_at)
select encode(sha256('codigo-expirado'::bytea), 'hex'), b.tenant_id, b.id, '{}', now() - interval '2 minutes', now() - interval '1 minute'
  from public.biosites b where b.slug = 'loja-handoff';

set local role service_role;

select ok(public.bio_consume_handoff(encode(sha256('codigo-ok-1'::bytea), 'hex')) is not null, 'codigo valido e consumido');
select ok((select used_at is not null from public.bio_handoff_codes where code_hash = encode(sha256('codigo-ok-1'::bytea), 'hex')),
  'codigo fica marcado como usado');
select ok(public.bio_consume_handoff(encode(sha256('codigo-ok-1'::bytea), 'hex')) is null, 'segundo uso do mesmo codigo nao funciona');
select ok((public.bio_consume_handoff(encode(sha256('codigo-ok-2'::bytea), 'hex')) ->> 'biosite_id')
  = (select id::text from public.biosites where slug = 'loja-handoff'), 'devolve o biosite certo');
select ok(public.bio_consume_handoff(encode(sha256('codigo-expirado'::bytea), 'hex')) is null, 'codigo expirado nao funciona');
select is((select count(*)::int from public.bio_audit_log
  where action = 'handoff.consumed' and biosite_id = (select id from public.biosites where slug = 'loja-handoff')), 2,
  'auditoria: somente os 2 consumos validos');

select lives_ok($$ select public.bio_grant_membership(
  (select tenant_id from public.biosites where slug = 'loja-handoff'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'agent') $$, 'concede papel agent');
select is((select role::text from public.memberships
  where user_id = '00000000-0000-0000-0000-0000000000a1'
    and tenant_id = (select tenant_id from public.biosites where slug = 'loja-handoff')), 'agent', 'papel agent gravado');

select lives_ok($$ select public.bio_grant_membership(
  (select tenant_id from public.biosites where slug = 'loja-handoff'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'viewer') $$, 'segunda concessao nao falha');
select is((select role::text from public.memberships
  where user_id = '00000000-0000-0000-0000-0000000000a1'
    and tenant_id = (select tenant_id from public.biosites where slug = 'loja-handoff')), 'agent',
  'segunda concessao nao rebaixa nem troca o papel');

select throws_ok($$ select public.bio_grant_membership(
  (select tenant_id from public.biosites where slug = 'loja-handoff'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'owner') $$, '42501', null, 'papel owner nao pode ser concedido');

-- authenticated e anon nao executam
reset role; set local role authenticated;
select throws_ok($$ select public.bio_consume_handoff('x') $$, '42501', null, 'authenticated nao consome codigo');
reset role; set local role anon;
select throws_ok($$ select public.bio_grant_membership(null, null, 'agent') $$, '42501', null, 'anon nao concede papel');

reset role;
select ok(not has_function_privilege('authenticated', 'public.bio_consume_handoff(text)', 'execute'),
  'catalogo: authenticated sem EXECUTE em bio_consume_handoff');

-- Mostra o resumo do pgTAP como erro. Erro aborta a transacao: tudo e revertido (nada fica no banco).
do $$
declare r text;
begin
  select string_agg(line, E'\n') into r from finish() as line;
  raise exception E'RESULTADO pgTAP (revertido):\n%', r;
end $$;
