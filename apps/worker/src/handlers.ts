import type { Job } from './jobs.js';

/**
 * Cada handler DEVE ser idempotente: a entrega dos jobs e "pelo menos uma vez"
 * (um job pode rodar de novo se o worker cair antes de concluir).
 * Nunca registrar payload nem mensagem de erro com dado pessoal.
 */
export type JobHandler = (job: Job) => Promise<void>;

export const handlers: Record<string, JobHandler> = {
  // Job de teste de fumaca: insira um job com type "system.ping" para validar o worker.
  'system.ping': async (job) => {
    console.info(JSON.stringify({ level: 'info', msg: 'ping', jobId: job.id }));
  },
};
