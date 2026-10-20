import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const workerId = process.env.WORKER_ID ?? `worker-${process.pid}`;
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function poll(): Promise<void> {
  const { data, error } = await supabase.rpc('claim_jobs', { _worker_id: workerId, _limit: 10 });
  if (error) throw error;
  for (const job of data ?? []) console.info('Claimed job', { id: job.id, type: job.type });
}

setInterval(() => void poll().catch((error) => console.error('Job poll failed', error)), 2_000);
void poll();
