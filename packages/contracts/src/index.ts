export type TenantId = string & { readonly __brand: 'TenantId' };

export interface Job<TPayload = Record<string, unknown>> {
  id: string;
  tenantId: TenantId;
  type: string;
  payload: TPayload;
  attempts: number;
}

export interface SendMessageCommand {
  tenantId: TenantId;
  contactId: string;
  channel: 'whatsapp' | 'email';
  idempotencyKey: string;
  template?: string;
  text?: string;
}
