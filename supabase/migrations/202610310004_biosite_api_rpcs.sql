-- ==============================================================================
-- 202610310004 - Biosite: funcoes atomicas da API v1 (fase P3)
-- So o service_role executa (a API v1 usa a chave de servico no servidor).
-- Todas filtram por api_client_id: um integrador nunca enxerga biosite de outro.
-- Como reverter (so em staging): drop function public.bio_provision, bio_get_biosite,
--   bio_patch_biosite; drop function private.bio_biosite_dto.
-- ==============================================================================

create or replace function private.bio_biosite_dto(_id uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id, 'slug', b.slug, 'title', b.title, 'niche_key', b.niche_key,
    'company_id_externo', b.company_id_externo, 'published', b.published,
    'theme', b.theme, 'settings', b.settings,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'section_type', s.section_type, 'position', s.position,
               'enabled', s.enabled, 'config', s.config) order by s.position)
        from public.bio_sections s where s.biosite_id = b.id
    ), '[]'::jsonb))
  from public.biosites b where b.id = _id;
$$;

create or replace function public.bio_provision(
  _client uuid, _company text, _niche text, _slug text, _title text,
  _theme jsonb default '{}'::jsonb, _settings jsonb default '{}'::jsonb, _sections jsonb default '[]'::jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  existing uuid;
  new_tenant uuid;
  new_biosite uuid;
  item jsonb;
  pos integer := 0;
begin
  if not exists (select 1 from public.api_clients where id = _client and disabled_at is null) then
    raise exception 'integrador invalido ou desativado' using errcode = '42501';
  end if;

  select id into existing from public.biosites
   where api_client_id = _client and company_id_externo = _company and niche_key = _niche;
  if existing is not null then
    return jsonb_build_object('created', false, 'biosite', private.bio_biosite_dto(existing));
  end if;

  begin
    insert into public.tenants (slug, name, brand)
      values (_slug, _title, jsonb_build_object('name', _title)) returning id into new_tenant;
    insert into public.biosites (tenant_id, api_client_id, company_id_externo, niche_key, slug, title, theme, settings)
      values (new_tenant, _client, _company, _niche, _slug, _title, _theme, _settings) returning id into new_biosite;
    for item in select * from jsonb_array_elements(_sections) loop
      insert into public.bio_sections (tenant_id, biosite_id, section_type, position, config)
        values (new_tenant, new_biosite, item ->> 'section_type', pos, coalesce(item -> 'config', '{}'::jsonb));
      pos := pos + 1;
    end loop;
    insert into public.bio_audit_log (tenant_id, biosite_id, api_client_id, action, detail)
      values (new_tenant, new_biosite, _client, 'biosite.provisioned', jsonb_build_object('slug', _slug));
  exception when unique_violation then
    -- corrida: outra requisicao criou a mesma chave natural entre o select e o insert
    select id into existing from public.biosites
     where api_client_id = _client and company_id_externo = _company and niche_key = _niche;
    if existing is not null then
      return jsonb_build_object('created', false, 'biosite', private.bio_biosite_dto(existing));
    end if;
    raise;  -- slug de outro biosite: a API traduz 23505 em 409
  end;

  return jsonb_build_object('created', true, 'biosite', private.bio_biosite_dto(new_biosite));
end;
$$;

create or replace function public.bio_get_biosite(
  _client uuid, _id uuid default null, _company text default null, _niche text default null)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select private.bio_biosite_dto(b.id)
    from public.biosites b
   where b.api_client_id = _client
     and ((_id is not null and b.id = _id)
       or (_id is null and b.company_id_externo = _company and b.niche_key = _niche));
$$;

create or replace function public.bio_patch_biosite(_client uuid, _id uuid, _patch jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  hit uuid;
begin
  update public.biosites b set
    title     = coalesce(_patch ->> 'title', b.title),
    theme     = case when _patch ? 'theme' then _patch -> 'theme' else b.theme end,
    settings  = case when _patch ? 'settings' then _patch -> 'settings' else b.settings end,
    published = case when _patch ? 'published' then (_patch ->> 'published')::boolean else b.published end
   where b.id = _id and b.api_client_id = _client
   returning b.id into hit;
  if hit is null then return null; end if;

  insert into public.bio_audit_log (tenant_id, biosite_id, api_client_id, action, detail)
    select b.tenant_id, b.id, _client, 'biosite.patched', jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(_patch) k))
      from public.biosites b where b.id = hit;
  return private.bio_biosite_dto(hit);
end;
$$;

revoke all on function public.bio_provision(uuid, text, text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.bio_get_biosite(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.bio_patch_biosite(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.bio_provision(uuid, text, text, text, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.bio_get_biosite(uuid, uuid, text, text) to service_role;
grant execute on function public.bio_patch_biosite(uuid, uuid, jsonb) to service_role;
