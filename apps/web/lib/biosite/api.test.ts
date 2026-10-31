import { describe, expect, it } from 'vitest';
import { readJson, toResponse } from './api';

const req = (body: string, headers: Record<string, string> = {}) => new Request('http://x/api', { method: 'POST', body, headers });

describe('readJson', () => {
  it('le JSON valido', async () => {
    expect(await readJson(req('{"a":1}'))).toEqual({ ok: true, value: { a: 1 } });
  });
  it('corpo vazio vira undefined', async () => {
    expect(await readJson(req(''))).toEqual({ ok: true, value: undefined });
  });
  it('400 para JSON quebrado', async () => {
    const r = await readJson(req('{x'));
    expect(!r.ok && r.response.status).toBe(400);
  });
  it('413 acima do limite (por tamanho real e por content-length)', async () => {
    const big = await readJson(req('x'.repeat(100)), 10);
    expect(!big.ok && big.response.status).toBe(413);
    const declared = await readJson(req('{}', { 'content-length': '999999' }));
    expect(!declared.ok && declared.response.status).toBe(413);
  });
});

describe('toResponse', () => {
  it('sempre no-store e repassa status e cabecalhos', async () => {
    const res = toResponse({ status: 429, body: { error: 'x' }, headers: { 'Retry-After': '60' } });
    expect(res.status).toBe(429);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Retry-After')).toBe('60');
  });
});
