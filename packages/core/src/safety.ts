import type { IssuerMessage } from './types';

/**
 * The prototype is hard-wired to exercise mode. There is no configuration flag
 * in this repository that enables processing of `Actual` messages.
 */
export const DEPLOYMENT_MODE = 'prototype-exercise-only' as const;

export class SafetyBoundaryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SafetyBoundaryError';
  }
}

export function assertExerciseOnly(msg: Pick<IssuerMessage, 'status'>): void {
  if (msg.status !== 'Exercise') {
    throw new SafetyBoundaryError(
      'NON_EXERCISE_STATUS',
      `Prototype refuses CAP status "${msg.status}". Only "Exercise" messages can be processed.`,
    );
  }
}

/**
 * Field names that would indicate military or tracking data. Payloads that
 * contain any of them are rejected outright: the platform never stores them.
 */
export const FORBIDDEN_FIELD_PATTERNS = [
  /trajector/i,
  /track/i,
  /heading/i,
  /velocity/i,
  /speed/i,
  /altitude/i,
  /azimuth/i,
  /bearing/i,
  /impact/i,
  /launch/i,
  /target/i,
  /intercept/i,
  /warhead/i,
  /munition/i,
];

export function findForbiddenFields(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') return [];
  const hits: string[] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const p = path ? `${path}.${k}` : k;
    if (FORBIDDEN_FIELD_PATTERNS.some((re) => re.test(k))) hits.push(p);
    hits.push(...findForbiddenFields(v, p));
  }
  return hits;
}

/** Wording that turns uncertainty into instructions. Blocked in any public text. */
export const SPECULATIVE_PATTERNS: { re: RegExp; lang: 'en' | 'ar' }[] = [
  { re: /\b(may|might|could|likely to|expected to)\s+(hit|strike|land|impact|fall)/i, lang: 'en' },
  { re: /\b(impact|landing|crash)\s+(zone|point|site|area)\b/i, lang: 'en' },
  { re: /\btrajector(y|ies)\b|\bflight path\b|\blaunch(ed)? (site|from)\b/i, lang: 'en' },
  { re: /\btarget(ed|ing)?\b/i, lang: 'en' },
  { re: /\b\d{1,3}\s?%|\bprobabilit(y|ies)\b|\bestimated\b/i, lang: 'en' },
  { re: /مسار|منطقة (السقوط|الارتطام)|سقوط متوقع|نقطة (السقوط|الارتطام)|موقع الإطلاق|مستهدف|يستهدف|احتمال(ية)?|نسبة\s?\d|٪/, lang: 'ar' },
];

export function findSpeculativeLanguage(text: string): string[] {
  return SPECULATIVE_PATTERNS.filter(({ re }) => re.test(text)).map(({ re }) => text.match(re)?.[0] ?? '');
}
