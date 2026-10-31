-- ==============================================================================
-- 202610310005 - Biosite: registro de clique com redirecionamento seguro (fase P4)
-- O destino SO vem do que esta salvo na secao 'links' do biosite publicado (nunca da URL
-- da requisicao): sem open redirect. Apenas https. Executa so o service_role.
-- Como reverter (so em staging): drop function public.bio_track_click(text, text, text).
-- ==============================================================================

create or replace function public.bio_track_click(_slug text, _link_id text, _ip_hash text default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  site record;
  target record;
begin
  select b.id, b.tenant_id into site from public.biosites b where b.slug = _slug and b.published;
  if not found then return null; end if;

  select s.id as section_id, e.elem ->> 'url' as url
    into target
    from public.bio_sections s
   cross join lateral jsonb_array_elements(
           case when jsonb_typeof(s.config -> 'links') = 'array' then s.config -> 'links' else '[]'::jsonb end
         ) with ordinality as e(elem, ord)
   where s.biosite_id = site.id and s.enabled and s.section_type = 'links'
     and coalesce(e.elem ->> 'id', 'l' || (e.ord - 1)) = _link_id
     and (e.elem ->> 'url') ~ '^https://[^[:space:]]+$'
   limit 1;
  if not found then return null; end if;

  insert into public.bio_link_events (tenant_id, biosite_id, section_id, link_id, event_type, ip_hash)
    values (site.tenant_id, site.id, target.section_id, left(_link_id, 64), 'click',
            case when _ip_hash ~ '^[0-9a-f]{64}$' then _ip_hash else null end);
  return target.url;
end;
$$;

revoke all on function public.bio_track_click(text, text, text) from public, anon, authenticated;
grant execute on function public.bio_track_click(text, text, text) to service_role;
