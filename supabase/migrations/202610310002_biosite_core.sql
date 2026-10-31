-- ==============================================================================
-- 202610310002 - Biosite: tabelas, gatilhos e RPCs publicas (fase P2)
-- Prefixo bio_ para o modulo ser portavel (modelo B). Depende da fundacao apenas por:
--   public.tenants, public.memberships, private.is_member().
-- Aplicar PRIMEIRO em staging. RLS e permissoes ficam na migration seguinte.
-- Como reverter (so em staging): drop das tabelas bio_*, biosites, api_client_keys,
--   api_clients e das funcoes private.bio_* e public.get_public_*, public.bio_rate_limit_hit.
-- ==============================================================================

create or replace function private.bio_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Integradores (sistemas que chamam a API v1) ----------------------------------
create table public.api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.api_client_keys (
  id uuid primary key default gen_random_uuid(),
  api_client_id uuid not null references public.api_clients(id) on delete cascade,
  key_prefix text not null unique check (key_prefix ~ '^[a-z0-9]{8}$'),
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$'),   -- sha256 hex do segredo
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_client_keys_active_idx on public.api_client_keys (api_client_id) where revoked_at is null;

-- No maximo 2 chaves ativas por integrador (rotacao sem queda).
create or replace function private.bio_api_keys_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.revoked_at is null then
    perform pg_advisory_xact_lock(hashtextextended(new.api_client_id::text, 0));
    if (select count(*) from public.api_client_keys
         where api_client_id = new.api_client_id and revoked_at is null and id <> new.id) >= 2 then
      raise exception 'limite de 2 chaves ativas por integrador' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger api_client_keys_limit
  before insert or update of revoked_at on public.api_client_keys
  for each row execute function private.bio_api_keys_limit();

-- Biosite -----------------------------------------------------------------------
create table public.biosites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  api_client_id uuid references public.api_clients(id) on delete restrict,  -- nulo se criado pelo operador/painel
  company_id_externo text check (company_id_externo is null or char_length(company_id_externo) between 1 and 128),
  niche_key text not null check (niche_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 60
    and slug <> all (array['admin','api','auth','b','r','health','login','logout','static','favicon','robots','sitemap'])
  ),
  title text not null check (char_length(title) between 1 and 120),
  published boolean not null default false,
  theme jsonb not null default '{}'::jsonb
    check (jsonb_typeof(theme) = 'object' and octet_length(theme::text) <= 16384),
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object' and octet_length(settings::text) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  check ((api_client_id is null) = (company_id_externo is null))
);
-- Chave natural da integracao (idempotencia do provisionamento).
create unique index biosites_natural_key
  on public.biosites (api_client_id, company_id_externo, niche_key) where api_client_id is not null;
create index biosites_tenant_idx on public.biosites (tenant_id);

-- Imutabilidade, regra de publicacao e updated_at.
create or replace function private.bio_biosites_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.api_client_id is distinct from old.api_client_id
     or new.company_id_externo is distinct from old.company_id_externo
     or new.niche_key is distinct from old.niche_key
     or new.slug is distinct from old.slug then
    raise exception 'campos imutaveis do biosite' using errcode = '23514';
  end if;

  -- Usuario autenticado: so o owner publica ou despublica. Sem usuario (service_role/migration): livre.
  if new.published is distinct from old.published
     and (select auth.uid()) is not null
     and not private.is_member(old.tenant_id, 'owner') then
    raise exception 'somente o owner publica ou despublica' using errcode = '42501';
  end if;

  new.updated_at = now();
  return new;
end;
$$;
create trigger biosites_guard before update on public.biosites
  for each row execute function private.bio_biosites_guard();

-- Secoes ------------------------------------------------------------------------
create table public.bio_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  biosite_id uuid not null,
  section_type text not null check (section_type ~ '^[a-z][a-z0-9_]{1,40}$'),
  position integer not null check (position >= 0),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 32768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (biosite_id, tenant_id) references public.biosites (id, tenant_id) on delete cascade,
  unique (biosite_id, position) deferrable initially deferred
);
create trigger bio_sections_touch before update on public.bio_sections
  for each row execute function private.bio_touch_updated_at();

-- Catalogo generico -------------------------------------------------------------
create table public.bio_catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  biosite_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 80),
  title text not null check (char_length(title) between 1 and 160),
  summary text check (summary is null or char_length(summary) <= 1000),
  price numeric(14,2) check (price is null or price >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  position integer not null default 0,
  cover_url text check (cover_url is null or (cover_url ~ '^https://' and char_length(cover_url) <= 2000)),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 32768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (biosite_id, tenant_id) references public.biosites (id, tenant_id) on delete cascade,
  unique (biosite_id, slug)
);
create index bio_catalog_items_list_idx on public.bio_catalog_items (biosite_id, status, position, created_at);
create trigger bio_catalog_items_touch before update on public.bio_catalog_items
  for each row execute function private.bio_touch_updated_at();

-- Eventos (visualizacao e clique); sem contador mutavel, sem IP puro -------------
create table public.bio_link_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  biosite_id uuid not null,
  section_id uuid references public.bio_sections(id) on delete set null,
  link_id text check (link_id is null or char_length(link_id) <= 64),
  event_type text not null check (event_type in ('view', 'click')),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null default now(),
  foreign key (biosite_id, tenant_id) references public.biosites (id, tenant_id) on delete cascade
);
create index bio_link_events_report_idx on public.bio_link_events (biosite_id, occurred_at desc);

-- Suporte da API v1 (so service_role) ---------------------------------------------
create table public.bio_idempotency_keys (
  api_client_id uuid not null references public.api_clients(id) on delete cascade,
  key text not null check (char_length(key) between 1 and 200),
  request_hash text not null,
  status_code integer,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (api_client_id, key)
);
create index bio_idempotency_keys_age_idx on public.bio_idempotency_keys (created_at);

create table public.bio_handoff_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  tenant_id uuid not null,
  biosite_id uuid not null,
  actor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  foreign key (biosite_id, tenant_id) references public.biosites (id, tenant_id) on delete cascade,
  check (expires_at > created_at)
);
create index bio_handoff_codes_age_idx on public.bio_handoff_codes (expires_at);

create table public.bio_rate_limits (
  api_client_id uuid not null references public.api_clients(id) on delete cascade,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (api_client_id, window_start)
);

-- Auditoria somente-inclusao (sem FK: sobrevive a remocao de tenant/biosite) --------
create table public.bio_audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid,
  biosite_id uuid,
  api_client_id uuid,
  action text not null check (char_length(action) between 1 and 80),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index bio_audit_log_tenant_idx on public.bio_audit_log (tenant_id, created_at desc);

create or replace function private.bio_audit_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'bio_audit_log e somente-inclusao' using errcode = '42501';
end;
$$;
create trigger bio_audit_no_change before update or delete on public.bio_audit_log
  for each row execute function private.bio_audit_immutable();
create trigger bio_audit_no_truncate before truncate on public.bio_audit_log
  for each statement execute function private.bio_audit_immutable();

-- Rate limit por janela de 1 minuto, em tabela (serverless nao tem memoria compartilhada).
create or replace function public.bio_rate_limit_hit(_client uuid, _limit integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  hits_now integer;
begin
  insert into public.bio_rate_limits (api_client_id, window_start, hits)
  values (_client, date_trunc('minute', now()), 1)
  on conflict (api_client_id, window_start)
  do update set hits = public.bio_rate_limits.hits + 1
  returning hits into hits_now;
  return hits_now <= _limit;
end;
$$;
revoke all on function public.bio_rate_limit_hit(uuid, integer) from public, anon, authenticated;
grant execute on function public.bio_rate_limit_hit(uuid, integer) to service_role;

-- RPCs publicas: unica porta de leitura do anon. Devolvem SO campos publicos. ----------
create or replace function public.get_public_biosite(_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'slug', b.slug,
    'title', b.title,
    'niche_key', b.niche_key,
    'theme', b.theme,
    'settings', b.settings,
    'brand', jsonb_build_object(
      'name', t.brand -> 'name',
      'logo_url', t.brand -> 'logo_url',
      'powered_by', t.brand -> 'powered_by',
      'hide_powered_by', coalesce(t.brand -> 'hide_powered_by', 'false'::jsonb)
    ),
    'sections', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', s.id, 'type', s.section_type, 'position', s.position, 'config', s.config)
               order by s.position)
        from public.bio_sections s
       where s.biosite_id = b.id and s.enabled
    ), '[]'::jsonb)
  )
  from public.biosites b
  join public.tenants t on t.id = b.tenant_id
  where b.slug = _slug and b.published;
$$;

create or replace function public.get_public_catalog(_slug text, _limit integer default 20, _offset integer default 0)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(
      jsonb_build_object('slug', i.slug, 'title', i.title, 'summary', i.summary, 'price', i.price,
                         'cover_url', i.cover_url, 'metadata', i.metadata)
      order by i.position, i.created_at, i.id), '[]'::jsonb),
    'limit', greatest(1, least(coalesce(_limit, 20), 100)),
    'offset', greatest(0, coalesce(_offset, 0))
  )
  from (
    select ci.*
      from public.bio_catalog_items ci
      join public.biosites b on b.id = ci.biosite_id
     where b.slug = _slug and b.published and ci.status = 'published'
     order by ci.position, ci.created_at, ci.id
     limit greatest(1, least(coalesce(_limit, 20), 100))
     offset greatest(0, coalesce(_offset, 0))
  ) i;
$$;

revoke all on function public.get_public_biosite(text) from public;
revoke all on function public.get_public_catalog(text, integer, integer) from public;
grant execute on function public.get_public_biosite(text) to anon, authenticated, service_role;
grant execute on function public.get_public_catalog(text, integer, integer) to anon, authenticated, service_role;
