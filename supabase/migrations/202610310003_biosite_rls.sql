-- ==============================================================================
-- 202610310003 - Biosite: RLS, grants por coluna e acesso publico (fase P2)
-- anon NAO enxerga nenhuma tabela: so as RPCs get_public_* (migration anterior).
-- Tabelas de suporte (api_clients, chaves, idempotencia, handoff, rate limit): so service_role.
-- Como reverter (so em staging): drop policy ...; alter table ... disable row level security.
-- ==============================================================================

alter table public.api_clients          enable row level security;
alter table public.api_client_keys      enable row level security;
alter table public.biosites             enable row level security;
alter table public.bio_sections         enable row level security;
alter table public.bio_catalog_items    enable row level security;
alter table public.bio_link_events      enable row level security;
alter table public.bio_idempotency_keys enable row level security;
alter table public.bio_handoff_codes    enable row level security;
alter table public.bio_rate_limits      enable row level security;
alter table public.bio_audit_log        enable row level security;

alter table public.api_clients          force row level security;
alter table public.api_client_keys      force row level security;
alter table public.biosites             force row level security;
alter table public.bio_sections         force row level security;
alter table public.bio_catalog_items    force row level security;
alter table public.bio_link_events      force row level security;
alter table public.bio_idempotency_keys force row level security;
alter table public.bio_handoff_codes    force row level security;
alter table public.bio_rate_limits      force row level security;
alter table public.bio_audit_log        force row level security;

-- Grants: authenticated recebe so o minimo, por coluna quando faz sentido.
grant select on public.biosites to authenticated;
grant update (title, theme, settings, published) on public.biosites to authenticated;

grant select, delete on public.bio_sections to authenticated;
grant insert (tenant_id, biosite_id, section_type, position, enabled, config) on public.bio_sections to authenticated;
grant update (position, enabled, config) on public.bio_sections to authenticated;

grant select, delete on public.bio_catalog_items to authenticated;
grant insert (tenant_id, biosite_id, slug, title, summary, price, status, position, cover_url, metadata)
  on public.bio_catalog_items to authenticated;
grant update (slug, title, summary, price, status, position, cover_url, metadata)
  on public.bio_catalog_items to authenticated;

grant select on public.bio_link_events to authenticated;
grant select on public.bio_audit_log to authenticated;

-- service_role (API v1, worker): acesso total as tabelas do modulo.
grant all on public.api_clients, public.api_client_keys, public.biosites, public.bio_sections,
  public.bio_catalog_items, public.bio_link_events, public.bio_idempotency_keys,
  public.bio_handoff_codes, public.bio_rate_limits, public.bio_audit_log to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Policies -------------------------------------------------------------------------
create policy biosites_select on public.biosites for select to authenticated
  using ((select private.is_member(tenant_id)));
create policy biosites_update on public.biosites for update to authenticated
  using ((select private.is_member(tenant_id, 'admin')))
  with check ((select private.is_member(tenant_id, 'admin')));

create policy bio_sections_select on public.bio_sections for select to authenticated
  using ((select private.is_member(tenant_id)));
create policy bio_sections_insert on public.bio_sections for insert to authenticated
  with check ((select private.is_member(tenant_id, 'agent')));
create policy bio_sections_update on public.bio_sections for update to authenticated
  using ((select private.is_member(tenant_id, 'agent')))
  with check ((select private.is_member(tenant_id, 'agent')));
create policy bio_sections_delete on public.bio_sections for delete to authenticated
  using ((select private.is_member(tenant_id, 'agent')));

create policy bio_catalog_select on public.bio_catalog_items for select to authenticated
  using ((select private.is_member(tenant_id)));
create policy bio_catalog_insert on public.bio_catalog_items for insert to authenticated
  with check ((select private.is_member(tenant_id, 'agent')));
create policy bio_catalog_update on public.bio_catalog_items for update to authenticated
  using ((select private.is_member(tenant_id, 'agent')))
  with check ((select private.is_member(tenant_id, 'agent')));
create policy bio_catalog_delete on public.bio_catalog_items for delete to authenticated
  using ((select private.is_member(tenant_id, 'agent')));

create policy bio_events_select on public.bio_link_events for select to authenticated
  using ((select private.is_member(tenant_id)));

create policy bio_audit_select on public.bio_audit_log for select to authenticated
  using (tenant_id is not null and (select private.is_member(tenant_id, 'admin')));
