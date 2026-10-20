import { z } from 'zod';

export const generatedMessageSchema = z.object({
  text: z.string().min(1).max(4_000),
  factsUsed: z.array(z.string()).max(20),
  requiresHumanReview: z.boolean(),
});

export type GeneratedMessage = z.infer<typeof generatedMessageSchema>;

export interface AiProvider {
  generate(input: { system: string; prompt: string }): Promise<GeneratedMessage>;
  embed(input: string[]): Promise<number[][]>;
}

export function validateGeneratedMessage(value: unknown): GeneratedMessage {
  return generatedMessageSchema.parse(value);
}
