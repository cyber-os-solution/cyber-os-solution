-- pgTAP - clique rastreado (P4): destino so do banco, so https, so biosite publicado.
begin;
select plan(9);

insert into public.api_clients (id, name) values ('00000000-0000-0000-0000-0000000000c1', 'sistema-um');
set local role service_role;
select public.bio_provision('00000000-0000-0000-0000-0000000000c1', 'e1', 'loja', 'loja-track', 'Loja',
  '{}', '{}', '[{"section_type":"links","config":{"links":[
     {"id":"insta","label":"Instagram","url":"https://instagram.com/loja"},
     {"label":"Sem id","url":"https://exemplo.com/a"},
     {"id":"ruim","label":"Perigoso","url":"javascript:alert(1)"},
     {"id":"http","label":"Sem TLS","url":"http://exemplo.com"}]}}]');

-- despublicado: nada
select is(public.bio_track_click('loja-track', 'insta', null), null, 'biosite nao publicado nao redireciona');
select public.bio_patch_biosite('00000000-0000-0000-0000-0000000000c1',
  (public.bio_get_biosite('00000000-0000-0000-0000-0000000000c1', null, 'e1', 'loja') ->> 'id')::uuid, '{"published":true}');

select is(public.bio_track_click('loja-track', 'insta', repeat('a', 64)), 'https://instagram.com/loja', 'clique devolve o destino salvo');
select is(public.bio_track_click('loja-track', 'l1', null), 'https://exemplo.com/a', 'link sem id usa l<indice>');
select is(public.bio_track_click('loja-track', 'ruim', null), null, 'javascript: nunca vira destino');
select is(public.bio_track_click('loja-track', 'http', null), null, 'http (sem TLS) nao vira destino');
select is(public.bio_track_click('loja-track', 'nao-existe', null), null, 'id inexistente nao redireciona');
select is(public.bio_track_click('outro-slug', 'insta', null), null, 'slug inexistente nao redireciona');
select is((select count(*)::int from public.bio_link_events where event_type = 'click'), 2, 'so os 2 cliques validos foram registrados');

reset role; set local role anon;
select throws_ok($$ select public.bio_track_click('loja-track', 'insta', null) $$, '42501', null, 'anon nao chama o rastreio direto');

select * from finish();
rollback;
