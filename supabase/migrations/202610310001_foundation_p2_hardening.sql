-- ==============================================================================
-- 202610310001 - Hardening da fundacao (fase P2; achados G4c e G4e)
-- Aplicar PRIMEIRO em staging; nunca direto em producao (backup antes).
--
-- G4c  FORCE ROW LEVEL SECURITY nas tabelas da fundacao e revogacao dos privilegios
--      padrao de anon/authenticated. A partir daqui toda tabela nova nasce SEM acesso
--      para anon/authenticated e cada migration concede somente o necessario.
-- G4e  O ultimo owner de um tenant nao pode sair nem ser rebaixado.
--
-- Como reverter (so em staging): drop trigger memberships_last_owner on public.memberships;
--   drop function private.memberships_last_owner(); alter table ... no force row level security;
--   e conceder de volta os privilegios revogados.
-- ==============================================================================

-- G4c --------------------------------------------------------------------------
alter table public.tenants      force row level security;
alter table public.memberships  force row level security;
alter table public.contacts     force row level security;
alter table public.jobs         force row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Reconcede exatamente o que as policies da fundacao usam.
grant select                         on public.tenants     to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.contacts    to authenticated;
grant select                         on public.jobs        to authenticated;

-- Objetos futuros (criados por esta role de migration) nascem sem acesso publico.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- G4e --------------------------------------------------------------------------
create or replace function private.memberships_last_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Excecao: o tenant esta sendo apagado (cascata).
  if not exists (select 1 from public.tenants where id = old.tenant_id) then
    return coalesce(new, old);
  end if;

  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role is distinct from 'owner')
     and not exists (
       select 1 from public.memberships membership
       where membership.tenant_id = old.tenant_id
         and membership.role = 'owner'
         and membership.user_id <> old.user_id
     )
  then
    raise exception 'o ultimo owner do tenant nao pode sair nem ser rebaixado'
      using errcode = '23514';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists memberships_last_owner on public.memberships;
create trigger memberships_last_owner
  before update of role or delete on public.memberships
  for each row execute function private.memberships_last_owner();
