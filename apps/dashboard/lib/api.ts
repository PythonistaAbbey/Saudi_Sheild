'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Actor } from '@saudi-shield/core';

export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Session {
  token: string;
  user: Actor;
}

const KEY = 'ss.session';

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  try {
    if (s) window.sessionStorage.setItem(KEY, JSON.stringify(s));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const s = getSession();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(s ? { authorization: `Bearer ${s.token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? 'ERROR', body.message ?? res.statusText);
  return body as T;
}

export const post = <T = unknown>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

/** Fetch with polling and an SSE nudge, so screens update as soon as the platform changes. */
export function useLive<T>(path: string | null, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async () => {
    if (!pathRef.current) return;
    try {
      setData(await api<T>(pathRef.current));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, intervalMs);
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API}/api/public/stream`);
      es.onmessage = (ev) => {
        try {
          if (JSON.parse(ev.data).type !== 'ping') load();
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* SSE unavailable: polling continues */
    }
    return () => {
      clearInterval(t);
      es?.close();
    };
  }, [path, intervalMs, load]);

  return { data, error, reload: load };
}

export function fmtTime(iso?: string, withDate = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Riyadh',
    hour: '2-digit',
    minute: '2-digit',
    second: withDate ? undefined : '2-digit',
    ...(withDate ? { day: '2-digit', month: 'short' } : {}),
  });
}

export function ago(iso?: string) {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}
