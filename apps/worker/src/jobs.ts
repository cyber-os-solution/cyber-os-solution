import type { SupabaseClient } from '@supabase/supabase-js';

export interface Job {
  id: string;
  tenant_id: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
}

export async function claimJobs(db: SupabaseClient, workerId: string, limit: number): Promise<Job[]> {
  const { data, error } = await db.rpc('claim_jobs', { _worker_id: workerId, _limit: limit });
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function completeJob(db: SupabaseClient, jobId: string, workerId: string): Promise<void> {
  const { error } = await db.rpc('complete_job', { _job_id: jobId, _worker_id: workerId });
  if (error) throw error;
}

export async function failJob(db: SupabaseClient, jobId: string, workerId: string, message: string): Promise<void> {
  const { error } = await db.rpc('fail_job', { _job_id: jobId, _worker_id: workerId, _error: message });
  if (error) throw error;
}

export async function releaseStaleJobs(db: SupabaseClient, olderThanMinutes: number): Promise<number> {
  const { data, error } = await db.rpc('release_stale_jobs', { _older_than_minutes: olderThanMinutes });
  if (error) throw error;
  return Number(data ?? 0);
}
