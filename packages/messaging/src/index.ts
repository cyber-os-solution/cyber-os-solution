import type { SendMessageCommand } from '@cyber/contracts';

export interface MessagingProvider {
  send(command: SendMessageCommand): Promise<{ providerMessageId: string }>;
}

/** Boundary for Meta Cloud API. Keep Meta SDK and credentials in the adapter, not in modules. */
export interface WhatsAppProvider extends MessagingProvider {
  verifyWebhook(signature: string, body: string): boolean;
}
