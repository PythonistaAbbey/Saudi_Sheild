import {
  DEMO_PUBLISHER_KEY,
  DEMO_USERS,
  Platform as DemoPlatform,
  areasContaining,
  cityByCode,
  verifyPublicAlert,
  verifyLiteAlert,
  expandLite,
  type LiteFeed,
  type PublicAlert,
  type PublicFeed,
} from '@saudi-shield/core';

/**
 * The publisher key is PINNED in the app. The app never trusts a key served by
 * the feed itself, so a spoofed server or push cannot make it display a fake alert.
 */
export const PINNED_PUBLISHER_KEY = DEMO_PUBLISHER_KEY.publicKeyHex;

export type FeedSource = 'live' | 'cache' | 'device-demo';

export interface FeedState {
  alerts: PublicAlert[];
  rejected: number;
  source: FeedSource;
  fetchedAt: string; // when the shown data was generated/verified
  lite?: boolean;
}

function apiBase(): string | null {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    if (q.get('offline') === '1' || q.get('demo') === 'device') return null;
    if (q.get('api')) return q.get('api');
  }
  return env ?? 'http://localhost:4000';
}

export function verifyFeed(feed: PublicFeed): { alerts: PublicAlert[]; rejected: number } {
  const ok: PublicAlert[] = [];
  let rejected = 0;
  for (const env of feed.alerts ?? []) {
    if (verifyPublicAlert(env, PINNED_PUBLISHER_KEY)) ok.push(env.payload);
    else rejected++;
  }
  ok.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  return { alerts: ok, rejected };
}

/** Data-saver: use the compact feed on slow connections or when the user's browser asks to save data. */
export function wantsLite(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location && new URLSearchParams(window.location.search).get('lite') === '1') return true;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!conn && (conn.saveData === true || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
}

export async function fetchLiveFeed(timeoutMs = 4000): Promise<FeedState> {
  const base = apiBase();
  if (!base) throw new Error('offline mode');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs * (wantsLite() ? 3 : 1));
  try {
    if (wantsLite()) {
      const res = await fetch(`${base}/api/public/feed/lite`, { signal: ctrl.signal, cache: 'no-store' } as RequestInit);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const lf = (await res.json()) as LiteFeed;
      if (lf.e !== 'EXERCISE') throw new Error('Unexpected environment');
      const ok = lf.alerts.filter((a) => verifyLiteAlert(a, PINNED_PUBLISHER_KEY)).map((a) => expandLite(a.payload));
      ok.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
      return { alerts: ok, rejected: lf.alerts.length - ok.length, source: 'live', fetchedAt: lf.g, lite: true };
    }
    const res = await fetch(`${base}/api/public/feed`, { signal: ctrl.signal, cache: 'no-store' } as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const feed = (await res.json()) as PublicFeed;
    if (feed.environment !== 'EXERCISE') throw new Error('Unexpected environment');
    return { ...verifyFeed(feed), source: 'live', fetchedAt: feed.generatedAt };
  } finally {
    clearTimeout(t);
  }
}

export function streamUrl(): string | null {
  const base = apiBase();
  return base ? `${base}/api/public/stream` : null;
}

/**
 * A self-contained demo feed generated on the device when no API is reachable.
 * It runs the same core pipeline (signed issuer message → verification →
 * two-person approval → signed public feed) so the app still verifies it.
 */
export function deviceDemoFeed(now = new Date()): FeedState {
  let offset = -150 * 60_000;
  const p = new DemoPlatform(() => new Date(now.getTime() + offset));
  const [op, ap, pb] = ['u-op-1', 'u-ap-1', 'u-pb-1'].map((id) => DEMO_USERS.find((u) => u.id === id)!);
  const full = (sc: string, st: string, run: string) => {
    const r = p.runStep(sc, st, run, 'device-demo');
    let prep = p.prepare(r.id, op);
    prep.suggestions.forEach((s, i) => {
      if (s.kind === 'plain_language' || s.kind === 'note_translation') prep = p.acceptSuggestion(r.id, op, i);
    });
    p.approve(r.id, ap);
    p.publish(r.id, pb);
  };
  full('flood-south', 'red', 'DEV1');
  offset = -100 * 60_000;
  full('flood-south', 'white', 'DEV1');
  offset = -60 * 60_000;
  full('sandstorm-east', 'yellow', 'DEV2');
  offset = -12 * 60_000;
  full('aerial-drill-riyadh', 'yellow', 'DEV3');
  offset = -4 * 60_000;
  full('aerial-drill-riyadh', 'red', 'DEV3');
  offset = 0;
  return { ...verifyFeed(p.publicFeed()), source: 'device-demo', fetchedAt: now.toISOString() };
}

export function userZones(cityCode: string): string[] {
  const c = cityByCode(cityCode);
  return c ? areasContaining(c.city.lonLat).map((a) => a.code) : [];
}

export function affectsUser(a: PublicAlert, zones: string[]) {
  return a.areas.some((x) => zones.includes(x));
}

export function currentForUser(alerts: PublicAlert[], zones: string[]) {
  const mine = alerts.filter((a) => affectsUser(a, zones));
  const active = mine.filter((a) => a.publicState === 'active');
  const latest = mine[0];
  return { active, latest };
}
