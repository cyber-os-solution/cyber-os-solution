import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Formato: bio_<prefixo 8 [a-z0-9]>_<segredo 43 base64url>. No banco fica so o sha256 do segredo.
const KEY_RE = /^bio_([a-z0-9]{8})_([A-Za-z0-9_-]{43})$/;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface GeneratedKey {
  key: string; // mostrado UMA vez
  prefix: string;
  secretHash: string;
}

export function generateApiKey(): GeneratedKey {
  const bytes = randomBytes(8);
  let prefix = '';
  for (const byte of bytes) prefix += ALPHABET[byte % ALPHABET.length];
  const secret = randomBytes(32).toString('base64url');
  return { key: `bio_${prefix}_${secret}`, prefix, secretHash: sha256Hex(secret) };
}

export function parseApiKey(raw: string): { prefix: string; secret: string } | null {
  const match = KEY_RE.exec(raw);
  if (!match || !match[1] || !match[2]) return null;
  return { prefix: match[1], secret: match[2] };
}

export function secretMatches(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(sha256Hex(secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function newHandoffCode(): { code: string; codeHash: string } {
  const code = randomBytes(24).toString('base64url');
  return { code, codeHash: sha256Hex(code) };
}

// IP nunca e gravado puro: hash com sal secreto (BIO_IP_SALT). Sem sal, nao se grava nada.
export function hashIp(ip: string, salt: string): string {
  return sha256Hex(`${salt}:${ip}`);
}
