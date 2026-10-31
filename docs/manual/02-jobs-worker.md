# Ficha 2: Jobs e Worker

1. **Para que serve:** executar trabalho em segundo plano (e-mails, rollups, limpezas) sem travar o site.
2. **Funcoes do banco:**
   - `claim_jobs` reserva tarefas com `FOR UPDATE SKIP LOCKED`.
   - `complete_job` conclui.
   - `fail_job` agenda nova tentativa com espera `30 x 2^(tentativa-1)` segundos (teto 3600); vira `failed` ao passar de `max_attempts`; erro truncado em 500 caracteres.
   - `release_stale_jobs` devolve tarefas travadas (padrao 5 minutos).
3. **Onde esta:** `supabase/migrations/202610300002_jobs_lifecycle.sql`, `apps/worker`, `compose.yaml`.
4. **Variaveis do worker:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_ID`, `POLL_INTERVAL_MS`, `BATCH_SIZE`, `STALE_LOCK_MINUTES`.
5. **Como criar um tipo de tarefa novo:** registrar o handler em `apps/worker/src/handlers.ts` (deve ser idempotente) e criar o teste ao lado. O handler `system.ping` e o teste de fumaca.
6. **Cuidados:** so o `service_role` executa essas funcoes; a chave dele nunca vai para o navegador. Nunca registrar payload ou erro com dado pessoal.
7. **Pendencias:** rodar o pgTAP em banco efemero (P2); `docker build` e validado pela CI (job `worker-image`).
