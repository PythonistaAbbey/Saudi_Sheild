import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkIn, demoFamily, setPaused, type CheckInStatus, type FamilyCircle, type Lang, type PublicAlert } from '@saudi-shield/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { deviceDemoFeed, fetchLiveFeed, streamUrl, userZones, type FeedState } from './feed';
import { highContrast as hcPalette, palette, type Palette } from './theme';

export interface Prefs {
  onboarded: boolean;
  lang: Lang;
  city: string;
  textScale: number;
  highContrast: boolean;
  autoRead: boolean;
}

const DEFAULT_PREFS: Prefs = { onboarded: false, lang: 'ar', city: 'RIY-RIYADH', textScale: 1, highContrast: false, autoRead: false };

interface Ctx {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  p: Palette;
  feed: FeedState | null;
  zones: string[];
  refresh: () => void;
  family: FamilyCircle;
  doCheckIn: (s: CheckInStatus) => void;
  togglePause: () => void;
  openAlert: PublicAlert | null;
  setOpenAlert: (a: PublicAlert | null) => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
async function save(key: string, v: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: app still works */
  }
}

function initialPrefsFromUrl(): Partial<Prefs> {
  if (typeof window === 'undefined' || !window.location) return {};
  const q = new URLSearchParams(window.location.search);
  const out: Partial<Prefs> = {};
  if (q.get('lang') === 'en' || q.get('lang') === 'ar') out.lang = q.get('lang') as Lang;
  if (q.get('city')) out.city = q.get('city')!;
  if (q.get('onboarded') === '1') out.onboarded = true;
  if (q.get('hc') === '1') out.highContrast = true;
  if (q.get('scale')) out.textScale = Number(q.get('scale'));
  return out;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>({ ...DEFAULT_PREFS, ...initialPrefsFromUrl() });
  const [feed, setFeed] = useState<FeedState | null>(null);
  const [family, setFamily] = useState<FamilyCircle>(() => demoFamily(new Date()));
  const [openAlert, setOpenAlert] = useState<PublicAlert | null>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    load<Prefs>('prefs').then((stored) => stored && setPrefsState((cur) => ({ ...cur, ...stored, ...initialPrefsFromUrl() })));
  }, []);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...patch };
      save('prefs', next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const live = await fetchLiveFeed();
      setFeed(live);
      save('feed', live);
    } catch {
      if (typeof window !== 'undefined' && window.location && new URLSearchParams(window.location.search).get('demo') === 'device') {
        setFeed((cur) => cur ?? deviceDemoFeed());
        return;
      }
      const cached = await load<FeedState>('feed');
      setFeed((cur) => {
        if (cur && cur.source !== 'live') return cur;
        if (cached) return { ...cached, source: 'cache' };
        return deviceDemoFeed();
      });
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    let es: EventSource | null = null;
    const url = streamUrl();
    if (url && typeof EventSource !== 'undefined') {
      try {
        es = new EventSource(url);
        es.onmessage = (ev) => {
          if (!String(ev.data).includes('ping')) refresh();
        };
      } catch {
        /* polling continues */
      }
    }
    return () => {
      clearInterval(t);
      es?.close();
    };
  }, [refresh]);

  const zones = useMemo(() => userZones(prefs.city), [prefs.city]);

  // Open a new active alert for the user's area immediately (like tapping a notification).
  useEffect(() => {
    if (!feed) return;
    const ids = new Set(feed.alerts.map((a) => a.id));
    if (seen.current && prefs.onboarded) {
      const fresh = feed.alerts.find((a) => !seen.current!.has(a.id) && a.publicState === 'active' && a.areas.some((z) => zones.includes(z)));
      const clear = feed.alerts.find((a) => !seen.current!.has(a.id) && a.level === 'white' && a.areas.some((z) => zones.includes(z)));
      if (fresh || clear) setOpenAlert(fresh ?? clear!);
    }
    seen.current = ids;
  }, [feed, zones, prefs.onboarded]);

  const doCheckIn = useCallback((s: CheckInStatus) => setFamily((f) => checkIn(f, 'me', s, new Date())), []);
  const togglePause = useCallback(() => setFamily((f) => setPaused(f, 'me', !f.members.find((m) => m.id === 'me')?.paused)), []);

  const value: Ctx = {
    prefs,
    setPrefs,
    p: prefs.highContrast ? hcPalette : palette,
    feed,
    zones,
    refresh,
    family,
    doCheckIn,
    togglePause,
    openAlert,
    setOpenAlert,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
