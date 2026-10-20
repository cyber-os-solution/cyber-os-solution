create extension if not exists pgcrypto;
create schema if not exists private;

create type public.member_role as enum ('viewer', 'agent', 'admin', 'owner');
create type public.job_status as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 120),
  timezone text not null default 'America/Sao_Paulo',
  brand jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'agent',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create or replace function private.is_member(_tenant uuid, _min public.member_role default 'viewer')
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships membership
    where membership.tenant_id = _tenant
      and membership.user_id = (select auth.uid())
      and membership.role >= _min
  );
$$;

revoke all on function private.is_member(uuid, public.member_role) from public, anon;
grant execute on function private.is_member(uuid, public.member_role) to authenticated;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text,
  phone_e164 text,
  email text,
  consent_at timestamptz,
  consent_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (tenant_id, phone_e164)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null check (type ~ '^[a-z][a-z0-9._-]{1,100}$'),
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'pending',
  run_at timestamptz not null default now(),
  attempts smallint not null default 0 check (attempts >= 0),
  max_attempts smallint not null default 5 check (max_attempts between 1 and 20),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (tenant_id, idempotency_key)
);

create index jobs_available_idx on public.jobs (run_at, created_at) where status = 'pending';
create index contacts_tenant_idx on public.contacts (tenant_id, created_at desc);

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.contacts enable row level security;
alter table public.jobs enable row level security;

create policy tenants_select on public.tenants for select to authenticated using ((select private.is_member(id)));
create policy memberships_select on public.memberships for select to authenticated using ((select private.is_member(tenant_id)));
create policy memberships_manage on public.memberships for all to authenticated using ((select private.is_member(tenant_id, 'admin'))) with check ((select private.is_member(tenant_id, 'admin')));
create policy contacts_select on public.contacts for select to authenticated using ((select private.is_member(tenant_id)));
create policy contacts_write on public.contacts for all to authenticated using ((select private.is_member(tenant_id, 'agent'))) with check ((select private.is_member(tenant_id, 'agent')));
create policy jobs_select on public.jobs for select to authenticated using ((select private.is_member(tenant_id, 'admin')));

create or replace function public.claim_jobs(_worker_id text, _limit integer default 10)
returns setof public.jobs
language plpgsql security definer
set search_path = ''
as $$
begin
  return query
  with next_jobs as (
    select id from public.jobs
    where status = 'pending' and run_at <= now()
    order by run_at, created_at
    for update skip locked
    limit greatest(1, least(_limit, 100))
  )
  update public.jobs job
  set status = 'processing', locked_at = now(), locked_by = _worker_id, attempts = attempts + 1
  from next_jobs
  where job.id = next_jobs.id
  returning job.*;
end;
$$;

revoke all on function public.claim_jobs(text, integer) from public, anon, authenticated;
