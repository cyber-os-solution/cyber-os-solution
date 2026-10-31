import { describe, expect, it, vi } from 'vitest';
import { handlers } from './handlers.js';
import type { Job } from './jobs.js';

const job: Job = {
  id: 'j1', tenant_id: 't1', type: 'system.ping', payload: {}, status: 'running', attempts: 1, max_attempts: 5,
};

describe('handlers', () => {
  it('registra o handler de teste system.ping', () => {
    expect(typeof handlers['system.ping']).toBe('function');
  });
  it('system.ping nao lanca erro e nao registra o payload', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    await handlers['system.ping']?.({ ...job, payload: { segredo: 'x' } });
    const saida = String(info.mock.calls[0]?.[0] ?? '');
    expect(saida).toContain('"jobId":"j1"');
    expect(saida).not.toContain('segredo');
    info.mockRestore();
  });
});
