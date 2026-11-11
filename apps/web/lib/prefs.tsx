'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Lang } from '@saudi-shield/core';

export type Bi = { en: string; ar: string };

interface Prefs {
  lang: Lang;
  large: boolean;
  contrast: boolean;
}

interface PrefsCtx extends Prefs {
  setLang: (l: Lang) => void;
  toggleLarge: () => void;
  toggleContrast: () => void;
  t: (b: Bi) => string;
  ready: boolean;
}

const Ctx = createContext<PrefsCtx | null>(null);
const KEY = 'ss-web-prefs';

function readStored(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>({ lang: 'en', large: false, contrast: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored();
    const q = new URLSearchParams(window.location.search).get('lang');
    const browserAr = typeof navigator !== 'undefined' && navigator.language?.startsWith('ar');
    const lang: Lang = q === 'ar' || q === 'en' ? q : stored.lang ?? (browserAr ? 'ar' : 'en');
    setPrefs({ lang, large: !!stored.large, contrast: !!stored.contrast });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage may be blocked */
    }
    const html = document.documentElement;
    html.lang = prefs.lang;
    html.dir = prefs.lang === 'ar' ? 'rtl' : 'ltr';
    html.dataset.large = String(prefs.large);
    html.dataset.contrast = String(prefs.contrast);
  }, [prefs, ready]);

  const t = useCallback((b: Bi) => b[prefs.lang], [prefs.lang]);

  return (
    <Ctx.Provider
      value={{
        ...prefs,
        ready,
        t,
        setLang: (lang) => setPrefs((p) => ({ ...p, lang })),
        toggleLarge: () => setPrefs((p) => ({ ...p, large: !p.large })),
        toggleContrast: () => setPrefs((p) => ({ ...p, contrast: !p.contrast })),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error('PrefsProvider missing');
  return c;
}

/** Local, device-only storage helper. Nothing leaves the browser. */
export function useLocal<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [key]);
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key],
  );
  return [value, set, loaded];
}
