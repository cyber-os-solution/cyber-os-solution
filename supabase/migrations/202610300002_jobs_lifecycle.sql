-- ==============================================================================
-- 202610300002 - Ciclo de vida dos jobs (achado G5b da auditoria de 30/10/2026)
-- O worker reivindicava jobs (claim_jobs) e nunca os concluia: ficavam em
-- "processing" para sempre. Esta migration adiciona concluir, falhar com backoff
-- e recuperar jobs travados.
-- Aplicar PRIMEIRO em staging. Idempotente.
-- Como reverter: drop function public.complete_job(uuid, text);
--                drop function public.fail_job(uuid, text, text);
--                drop function public.release_stale_jobs(integer);
-- ==============================================================================

-- Conclui um job que ESTE worker reivindicou. Devolve false se nao for dono do lock.
create or replace function public.complete_job(_job_id uuid, _worker_id text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.jobs
     set status = 'completed',
         completed_at = now(),
         locked_at = null,
         locked_by = null,
         last_error = null
   where id = _job_id
     and status = 'processing'
     and locked_by = _worker_id;
  return found;
end;
$$;

-- Registra falha. Se ainda ha tentativas, volta para "pending" com backoff
-- exponencial (30 s, 60 s, 120 s ... limite de 1 h); senao fica "failed".
-- A mensagem de erro e truncada em 500 caracteres (nao enviar dado pessoal).
create or replace function public.fail_job(_job_id uuid, _worker_id text, _error text)
returns public.job_status
language plpgsql security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
  v_status public.job_status;
begin
  select * into v_job
    from public.jobs
   where id = _job_id and status = 'processing' and locked_by = _worker_id
   for update;
  if not found then
    return null;
  end if;

  if v_job.attempts >= v_job.max_attempts then
    v_status := 'failed';
  else
    v_status := 'pending';
  end if;

  update public.jobs
     set status = v_status,
         locked_at = null,
         locked_by = null,
         last_error = left(coalesce(_error, ''), 500),
         run_at = case
                    when v_status = 'pending'
                      then now() + make_interval(secs => least(30 * power(2, v_job.attempts - 1), 3600))
                    else run_at
                  end,
         completed_at = case when v_status = 'failed' then now() else completed_at end
   where id = _job_id;

  return v_status;
end;
$$;

-- Libera jobs "processing" cujo lock venceu (worker caiu). Devolve quantos liberou.
create or replace function public.release_stale_jobs(_older_than_minutes integer default 5)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with stale as (
    select id, attempts, max_attempts
      from public.jobs
     where status = 'processing'
       and locked_at < now() - make_interval(mins => greatest(_older_than_minutes, 1))
     for update skip locked
  ), upd as (
    update public.jobs j
       set status = case when s.attempts >= s.max_attempts
                         then 'failed'::public.job_status
                         else 'pending'::public.job_status end,
           locked_at = null,
           locked_by = null,
           last_error = 'trava vencida: o worker nao concluiu o job',
           completed_at = case when s.attempts >= s.max_attempts then now() else j.completed_at end
      from stale s
     where j.id = s.id
    returning j.id
  )
  select count(*) into v_count from upd;
  return v_count;
end;
$$;

revoke all on function public.complete_job(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_job(uuid, text, text) from public, anon, authenticated;
revoke all on function public.release_stale_jobs(integer) from public, anon, authenticated;
grant execute on function public.complete_job(uuid, text) to service_role;
grant execute on function public.fail_job(uuid, text, text) to service_role;
grant execute on function public.release_stale_jobs(integer) to service_role;
