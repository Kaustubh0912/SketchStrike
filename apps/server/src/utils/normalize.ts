import { LIMITS } from '@sketchstrike/shared';

// U+0300..U+036F is the Combining Diacritical Marks block.
const DIACRITIC_RE = new RegExp('[\\u0300-\\u036f]', 'g');
const CONTROL_RE = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');
const NON_ALPHANUM_RE = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE_RE = /\s+/g;

export function normalizeGuess(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIC_RE, '')
    .replace(NON_ALPHANUM_RE, ' ')
    .replace(WHITESPACE_RE, ' ')
    .trim();
}

export function sanitizeChat(input: string, maxLength: number): string {
  return input.replace(CONTROL_RE, '').slice(0, maxLength).trim();
}

export function sanitizeCustomWords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const cleaned = sanitizeChat(raw, LIMITS.maxCustomWordLength).replace(WHITESPACE_RE, ' ');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= LIMITS.maxCustomWords) break;
  }
  return out;
}
