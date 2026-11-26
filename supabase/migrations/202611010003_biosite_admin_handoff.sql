-- ==============================================================================
-- 202611010003 - Biosite: consumo do codigo de handoff e vinculo de usuario (fase P5)
-- O codigo de uso unico (60 s) emitido pela API vira acesso ao painel /admin.
-- So o service_role executa (o servidor do painel usa a chave de servico).
-- Papel 'owner' nunca e concedido por aqui.
-- Como reverter (so em staging): drop function public.bio_consume_handoff(text),
--   public.bio_grant_membership(uuid, uuid, public.member_role).
-- ==============================================================================

-- Consome o codigo em uma unica instrucao: dois pedidos simultaneos nao usam o mesmo codigo.
-- Devolve null se o codigo nao existe, ja foi usado ou expirou.
create or replace function public.bio_consume_handoff(_code_hash text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  h public.bio_handoff_codes%rowtype;
  client_id uuid;
begin
  update public.bio_handoff_codes
     set used_at = now()
   where code_hash = _code_hash
     and used_at is null
     and expires_at > now()
  returning * into h;

  if not found then
    return null;
  end if;

  select b.api_client_id into client_id from public.biosites b where b.id = h.biosite_id;
  insert into public.bio_audit_log (tenant_id, biosite_id, api_client_id, action, detail)
    values (h.tenant_id, h.biosite_id, client_id, 'handoff.consumed', '{}'::jsonb);

  return jsonb_build_object(
    'tenant_id', h.tenant_id,
    'biosite_id', h.biosite_id,
    'actor', h.actor);
end;
$$;

-- Concede papel no tenant do biosite. Repetir a concessao nao muda o papel existente.
create or replace function public.bio_grant_membership(_tenant uuid, _user uuid, _role public.member_role)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if _role = 'owner' then
    raise exception 'papel owner nao pode ser concedido pelo painel' using errcode = '42501';
  end if;
  insert into public.memberships (tenant_id, user_id, role)
    values (_tenant, _user, _role)
    on conflict (tenant_id, user_id) do nothing;
end;
$$;

revoke all on function public.bio_consume_handoff(text) from public, anon, authenticated;
revoke all on function public.bio_grant_membership(uuid, uuid, public.member_role) from public, anon, authenticated;
grant execute on function public.bio_consume_handoff(text) to service_role;
grant execute on function public.bio_grant_membership(uuid, uuid, public.member_role) to service_role;
