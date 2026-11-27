import { createClient } from '@supabase/supabase-js';
import type { ConsumedHandoff, HandoffDeps } from './handoff';

// Implementacao real das dependencias do handoff. Usa service_role: SO no servidor.
export function createHandoffDeps(): HandoffDeps {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('variaveis de ambiente ausentes');
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    async consume(codeHash) {
      const { data, error } = await db.rpc('bio_consume_handoff', { _code_hash: codeHash });
      if (error) throw new Error('falha ao consumir codigo');
      return (data as ConsumedHandoff | null) ?? null;
    },
    async createUser(email) {
      const { error } = await db.auth.admin.createUser({ email, email_confirm: true });
      // Usuario ja existente nao e erro: o login e o mesmo.
      if (error && (error as { code?: string }).code !== 'email_exists') throw new Error('falha ao criar usuario');
    },
    async issueLink(email) {
      const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email });
      if (error || !data.user || !data.properties?.hashed_token) throw new Error('falha ao gerar login');
      return { userId: data.user.id, tokenHash: data.properties.hashed_token };
    },
    async grant(tenantId, userId, role) {
      const { error } = await db.rpc('bio_grant_membership', { _tenant: tenantId, _user: userId, _role: role });
      if (error) throw new Error('falha ao conceder papel');
    },
  };
}
