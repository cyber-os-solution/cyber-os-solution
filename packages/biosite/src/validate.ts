export const SECTION_TYPES = ['hero', 'texto', 'catalogo', 'galeria', 'contato', 'links'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

const RESERVED_SLUGS = ['admin', 'api', 'auth', 'b', 'r', 'health', 'login', 'logout', 'static', 'favicon', 'robots', 'sitemap'];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NICHE_RE = /^[a-z][a-z0-9_]{1,40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const jsonSize = (v: unknown): number => JSON.stringify(v).length;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

function validSlug(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 3 && v.length <= 60 && SLUG_RE.test(v) && !RESERVED_SLUGS.includes(v);
}

function jsonField(body: Json, name: string, maxBytes: number): Result<Json | undefined> {
  const v = body[name];
  if (v === undefined) return { ok: true, value: undefined };
  if (!isObject(v)) return fail(`${name} deve ser um objeto`);
  if (jsonSize(v) > maxBytes) return fail(`${name} excede ${maxBytes} bytes`);
  return { ok: true, value: v };
}

export interface ProvisionInput {
  companyIdExterno: string;
  nicheKey: string;
  slug: string;
  title: string;
  theme: Json;
  settings: Json;
  sections: { section_type: SectionType; config: Json }[];
}

export function validateProvision(body: unknown): Result<ProvisionInput> {
  if (!isObject(body)) return fail('corpo deve ser um objeto JSON');
  const { company_id_externo: company, niche_key: niche, slug, title } = body;
  if (typeof company !== 'string' || company.length < 1 || company.length > 128) return fail('company_id_externo invalido (1 a 128 caracteres)');
  if (typeof niche !== 'string' || !NICHE_RE.test(niche)) return fail('niche_key invalido');
  if (!validSlug(slug)) return fail('slug invalido (minusculas, numeros e hifen, 3 a 60, nao reservado)');
  if (typeof title !== 'string' || title.length < 1 || title.length > 120) return fail('title invalido (1 a 120 caracteres)');

  const theme = jsonField(body, 'theme', 16384);
  if (!theme.ok) return theme;
  const settings = jsonField(body, 'settings', 16384);
  if (!settings.ok) return settings;

  const rawSections = body.sections ?? [];
  if (!Array.isArray(rawSections) || rawSections.length > 30) return fail('sections deve ser uma lista de ate 30 itens');
  const sections: ProvisionInput['sections'] = [];
  for (const [i, item] of rawSections.entries()) {
    if (!isObject(item)) return fail(`sections[${i}] deve ser um objeto`);
    const type = item.section_type;
    if (typeof type !== 'string' || !(SECTION_TYPES as readonly string[]).includes(type)) {
      return fail(`sections[${i}].section_type invalido (use ${SECTION_TYPES.join(', ')})`);
    }
    const config = jsonField(item, 'config', 32768);
    if (!config.ok) return fail(`sections[${i}].${config.message}`);
    sections.push({ section_type: type as SectionType, config: config.value ?? {} });
  }

  return {
    ok: true,
    value: { companyIdExterno: company, nicheKey: niche, slug, title, theme: theme.value ?? {}, settings: settings.value ?? {}, sections },
  };
}

export interface PatchInput {
  title?: string;
  theme?: Json;
  settings?: Json;
  published?: boolean;
}

export function validatePatch(body: unknown): Result<PatchInput> {
  if (!isObject(body)) return fail('corpo deve ser um objeto JSON');
  const allowed = ['title', 'theme', 'settings', 'published'];
  const unknown = Object.keys(body).filter((k) => !allowed.includes(k));
  if (unknown.length > 0) return fail(`campos nao permitidos: ${unknown.join(', ')}`);
  const out: PatchInput = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 120) return fail('title invalido (1 a 120 caracteres)');
    out.title = body.title;
  }
  const theme = jsonField(body, 'theme', 16384);
  if (!theme.ok) return theme;
  if (theme.value) out.theme = theme.value;
  const settings = jsonField(body, 'settings', 16384);
  if (!settings.ok) return settings;
  if (settings.value) out.settings = settings.value;
  if (body.published !== undefined) {
    if (typeof body.published !== 'boolean') return fail('published deve ser true ou false');
    out.published = body.published;
  }
  if (Object.keys(out).length === 0) return fail('nenhum campo para alterar');
  return { ok: true, value: out };
}

export function validateExternalQuery(params: URLSearchParams): Result<{ companyIdExterno: string; nicheKey: string }> {
  const company = params.get('company_id_externo');
  const niche = params.get('niche_key');
  if (!company || company.length > 128) return fail('company_id_externo obrigatorio (ate 128 caracteres)');
  if (!niche || !NICHE_RE.test(niche)) return fail('niche_key obrigatorio e valido');
  return { ok: true, value: { companyIdExterno: company, nicheKey: niche } };
}

export interface HandoffInput {
  actor: { email?: string; name?: string };
}

export function validateHandoff(body: unknown): Result<HandoffInput> {
  if (body === undefined || body === null) return { ok: true, value: { actor: {} } };
  if (!isObject(body)) return fail('corpo deve ser um objeto JSON');
  const actor: HandoffInput['actor'] = {};
  if (body.actor !== undefined) {
    if (!isObject(body.actor)) return fail('actor deve ser um objeto');
    const { email, name } = body.actor;
    if (email !== undefined) {
      if (typeof email !== 'string' || email.length > 254 || !email.includes('@')) return fail('actor.email invalido');
      actor.email = email;
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length > 120) return fail('actor.name invalido');
      actor.name = name;
    }
  }
  return { ok: true, value: { actor } };
}
