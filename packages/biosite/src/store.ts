import type { PatchInput, ProvisionInput } from './validate';

export class StoreError extends Error {
  constructor(public readonly code: 'slug_taken' | 'client_invalid' | 'unavailable', message: string) {
    super(message);
  }
}

export interface KeyRecord {
  id: string;
  apiClientId: string;
  secretHash: string;
  revokedAt: string | null;
  clientDisabledAt: string | null;
}

// Formato devolvido pela API (snake_case, vem pronto do banco).
export interface ApiBiosite {
  id: string;
  slug: string;
  title: string;
  niche_key: string;
  company_id_externo: string | null;
  published: boolean;
  theme: Record<string, unknown>;
  settings: Record<string, unknown>;
  sections: { id: string; section_type: string; position: number; enabled: boolean; config: Record<string, unknown> }[];
}

// Porta de acesso aos dados. A implementacao real (Supabase, service_role) vive em apps/web.
export interface BiositeStore {
  findKey(prefix: string): Promise<KeyRecord | null>;
  rateLimitHit(apiClientId: string, limitPerMinute: number): Promise<boolean>;
  touchKey(keyId: string): Promise<void>;
  provision(apiClientId: string, input: ProvisionInput): Promise<{ created: boolean; biosite: ApiBiosite }>;
  getById(apiClientId: string, id: string): Promise<ApiBiosite | null>;
  getByExternal(apiClientId: string, companyIdExterno: string, nicheKey: string): Promise<ApiBiosite | null>;
  patch(apiClientId: string, id: string, patch: PatchInput): Promise<ApiBiosite | null>;
  createHandoff(args: { apiClientId: string; biositeId: string; codeHash: string; actor: Record<string, unknown>; expiresAt: string }): Promise<boolean>;
  audit(args: { apiClientId: string; biositeId?: string; action: string; detail?: Record<string, unknown> }): Promise<void>;
}
