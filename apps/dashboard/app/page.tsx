'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEMO_USERS, ROLE_LABELS, type Actor } from '@saudi-shield/core';
import { post, setSession } from '@/lib/api';
import { Mark } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setSession(null), []);

  async function signIn(u: Actor) {
    try {
      const res = await post<{ token: string; user: Actor }>('/api/auth/login', { userId: u.id });
      setSession(res);
      router.push('/overview');
    } catch (e) {
      setErr(`Could not reach the API (${(e as Error).message}). Start it with: pnpm --filter @saudi-shield/api dev`);
    }
  }

  return (
    <div className="login-wrap">
      <section className="login-hero">
        <div className="row">
          <Mark size={42} light />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>Saudi Shield</div>
            <div style={{ fontSize: 12, color: '#8fb3a3' }}>Civilian emergency communication · Operations</div>
          </div>
        </div>
        <h1>Verified alerts, human approval, clear public guidance.</h1>
        <p>
          This operations console shows how authorised warnings could be received, verified, reviewed by two people, published to a companion app,
          and cleared. It cannot originate a warning.
        </p>
        <div style={{ marginTop: 'auto', fontSize: 12.5, color: '#8fb3a3', lineHeight: 1.6 }}>
          <strong style={{ color: '#e3defb' }}>Independent prototype.</strong> Not affiliated with or endorsed by any government entity. All alerts, areas,
          people and figures are fictional exercise data. Official cell broadcast alerts and sirens remain authoritative.
        </div>
      </section>
      <section className="login-panel">
        <span className="chip exercise" style={{ alignSelf: 'flex-start' }}>
          EXERCISE ENVIRONMENT
        </span>
        <h2 style={{ fontSize: 22, margin: '14px 0 4px' }}>Sign in as a demo staff member</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Each role sees only the actions it is allowed to take. A real deployment would use authority single sign-on with multi-factor authentication.
        </p>
        <div className="user-grid">
          {DEMO_USERS.map((u) => (
            <button key={u.id} className="user-card" onClick={() => signIn(u)}>
              <div style={{ fontWeight: 600 }}>{u.name.split(' (')[0]}</div>
              <div className="small muted">{u.roles.map((r) => ROLE_LABELS[r].en).join(', ')}</div>
              <div className="small faint" style={{ marginTop: 4 }}>
                {ROLE_LABELS[u.roles[0]].description}
              </div>
            </button>
          ))}
        </div>
        {err && (
          <div className="notice blocking" style={{ marginTop: 14 }}>
            {err}
          </div>
        )}
      </section>
    </div>
  );
}
