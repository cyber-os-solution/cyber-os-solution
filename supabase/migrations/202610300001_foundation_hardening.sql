-- ==============================================================================
-- 202610300001 - Correcao da fundacao (achados G4a, G4b da auditoria de 30/10/2026)
-- Pedido: auditoria CYBER-OS. Aplicar PRIMEIRO em staging; nunca direto em producao.
--
-- G4a  (defensivo, NAO e bug de RLS) Concede USAGE no schema private. Testado em
--      Postgres real: as policies funcionam mesmo sem este grant, porque o nome da
--      funcao e resolvido na criacao da policy e, na execucao, so se confere EXECUTE.
--      O grant so e necessario se alguem chamar private.* por nome em SQL direto.
-- G4b  memberships_manage (for all, admin) deixava um admin conceder o papel owner
--      (escalada de privilegio). Agora: owner gerencia qualquer papel; admin gerencia
--      somente viewer e agent.
--
-- Como reverter (so em staging): recriar a policy memberships_manage da migration
-- 202610190001 e revogar o USAGE concedido abaixo.
-- Idempotente: pode ser reaplicada.
-- ==============================================================================

-- G4a --------------------------------------------------------------------------
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- A funcao ja concede EXECUTE a authenticated na migration anterior; reafirma e
-- garante o service_role de forma explicita.
grant execute on function private.is_member(uuid, public.member_role) to authenticated, service_role;

-- claim_jobs e usada so pelo worker (service_role). Concessao explicita.
grant execute on function public.claim_jobs(text, integer) to service_role;

-- G4b --------------------------------------------------------------------------
drop policy if exists memberships_manage on public.memberships;
drop policy if exists memberships_insert on public.memberships;
drop policy if exists memberships_update on public.memberships;
drop policy if exists memberships_delete on public.memberships;

-- Criar: owner concede qualquer papel; admin concede somente viewer ou agent.
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (
    (select private.is_member(tenant_id, 'owner'))
    or (
      (select private.is_member(tenant_id, 'admin'))
      and role in ('viewer', 'agent')
    )
  );

-- Alterar: owner altera qualquer linha; admin so altera linhas que hoje sao
-- viewer/agent e so pode deixa-las viewer/agent (nunca promover a admin/owner,
-- nunca mexer na propria linha de admin).
create policy memberships_update on public.memberships
  for update to authenticated
  using (
    (select private.is_member(tenant_id, 'owner'))
    or (
      (select private.is_member(tenant_id, 'admin'))
      and role in ('viewer', 'agent')
    )
  )
  with check (
    (select private.is_member(tenant_id, 'owner'))
    or (
      (select private.is_member(tenant_id, 'admin'))
      and role in ('viewer', 'agent')
    )
  );

-- Remover: owner remove qualquer linha; admin remove somente viewer/agent.
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (
    (select private.is_member(tenant_id, 'owner'))
    or (
      (select private.is_member(tenant_id, 'admin'))
      and role in ('viewer', 'agent')
    )
  );

-- Pendente (fase P2, com pgTAP): impedir que o ultimo owner se remova ou rebaixe;
-- FORCE ROW LEVEL SECURITY e revoke dos privilegios padrao de anon/authenticated.
