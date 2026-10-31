import { createClient } from '@supabase/supabase-js';
import { errText } from './errors.js';
import { handlers } from './handlers.js';
import { claimJobs, completeJob, failJob, releaseStaleJobs, type Job } from './jobs.js';

type Level = 'info' | 'warn' | 'error';

function log(level: Level, msg: string, extra: Record<string, unknown> = {}): void {
  // Uma linha JSON por evento. Sem payload de job e sem dado pessoal.
  console[level === 'error' ? 'error' : 'log'](JSON.stringify({ level, msg, ...extra }));
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${name} deve ser um inteiro entre ${min} e ${max}`);
  }
  return n;
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  log('error', 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias');
  process.exit(1);
}

const workerId = process.env.WORKER_ID ?? `worker-${process.pid}`;
const pollMs = intEnv('POLL_INTERVAL_MS', 2_000, 250, 60_000);
const batchSize = intEnv('BATCH_SIZE', 10, 1, 100);
const staleMinutes = intEnv('STALE_LOCK_MINUTES', 5, 1, 120);
const reapEveryMs = 60_000;

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    log('info', 'encerramento solicitado', { signal });
    stopping = true;
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function runJob(job: Job): Promise<void> {
  const handler = handlers[job.type];
  try {
    if (!handler) throw new Error(`sem handler para o tipo "${job.type}"`);
    await handler(job);
  } catch (error) {
    const message = errText(error);
    log('warn', 'job falhou', { jobId: job.id, type: job.type, attempts: job.attempts });
    await failJob(db, job.id, workerId, message).catch((e) =>
      log('error', 'fail_job falhou', { jobId: job.id, err: errText(e) }),
    );
    return;
  }
  try {
    await completeJob(db, job.id, workerId);
  } catch (error) {
    // O job foi executado mas nao foi marcado. O release_stale_jobs o devolve a fila;
    // por isso os handlers precisam ser idempotentes.
    log('error', 'complete_job falhou', { jobId: job.id, err: errText(error) });
  }
}

async function main(): Promise<void> {
  log('info', 'worker iniciado', { workerId, pollMs, batchSize, staleMinutes });
  let lastReap = 0;

  while (!stopping) {
    try {
      if (Date.now() - lastReap >= reapEveryMs) {
        const released = await releaseStaleJobs(db, staleMinutes);
        lastReap = Date.now();
        if (released > 0) log('warn', 'jobs travados devolvidos a fila', { released });
      }

      const jobs = await claimJobs(db, workerId, batchSize);
      // Sequencial de proposito: os jobs ja reivindicados terminam mesmo durante o desligamento.
      for (const job of jobs) await runJob(job);

      if (jobs.length === 0) await sleep(pollMs);
    } catch (error) {
      log('error', 'ciclo falhou', { err: errText(error) });
      await sleep(Math.min(pollMs * 5, 30_000));
    }
  }
  log('info', 'worker encerrado');
}

void main();
