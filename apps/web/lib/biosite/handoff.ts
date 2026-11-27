import { sha256Hex } from '@cyber/biosite';

// Papel dado ao cliente que recebe o codigo do integrador. Decisao em aberto (ver docs/manual/05-biosite.md).
export const HANDOFF_ROLE = 'agent' as const;

export interface ConsumedHandoff {
  tenant_id: string;
  biosite_id: string;
  actor: { email?: unknown; name?: unknown };
}

// Operacoes de banco e de Auth usadas pelo fluxo. A rota injeta a implementacao com service_role.
export interface HandoffDeps {
  consume(codeHash: string): Promise<ConsumedHandoff | null>;
  createUser(email: string): Promise<void>; // ja existente nao e erro
  issueLink(email: string): Promise<{ userId: string; tokenHash: string }>;
  grant(tenantId: string, userId: string, role: typeof HANDOFF_ROLE): Promise<void>;
}

export type HandoffResult =
  | { ok: true; tokenHash: string }
  | { ok: false; reason: 'invalid' | 'no_email' };

// Consome o codigo (uso unico, 60 s), cria ou acha o usuario, concede papel no tenant do biosite
// e devolve o token de login (verifyOtp na rota cria a sessao). Codigo ja consumido nao volta.
export async function acceptHandoff(deps: HandoffDeps, code: string): Promise<HandoffResult> {
  const handoff = await deps.consume(sha256Hex(code));
  if (!handoff) return { ok: false, reason: 'invalid' };

  const email = typeof handoff.actor.email === 'string' ? handoff.actor.email.trim().toLowerCase() : '';
  if (!email) return { ok: false, reason: 'no_email' };

  await deps.createUser(email);
  const { userId, tokenHash } = await deps.issueLink(email);
  await deps.grant(handoff.tenant_id, userId, HANDOFF_ROLE);
  return { ok: true, tokenHash };
}
