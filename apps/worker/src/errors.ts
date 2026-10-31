/** Texto seguro de um erro. Erros do Supabase sao objetos simples (nao Error). */
export function errText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
