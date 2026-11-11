'use client';

import {
  Activity,
  BarChart3,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  Map as MapIcon,
  ScrollText,
  Siren,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ROLE_LABELS, can, type Permission } from '@saudi-shield/core';
import { getSession, setSession, useLive, type Session } from '@/lib/api';
import { Mark } from './ui';

const NAV: { href: string; label: string; icon: ReactNode; perm: Permission; section?: string }[] = [
  { href: '/overview', label: 'Overview', icon: <LayoutDashboard size={17} />, perm: 'alerts.read', section: 'Operations' },
  { href: '/inbound', label: 'Inbound & review', icon: <Inbox size={17} />, perm: 'alerts.read' },
  { href: '/alerts', label: 'Published alerts', icon: <Siren size={17} />, perm: 'alerts.read' },
  { href: '/areas', label: 'Warning areas', icon: <MapIcon size={17} />, perm: 'areas.read' },
  { href: '/delivery', label: 'Delivery', icon: <BarChart3 size={17} />, perm: 'stats.read' },
  { href: '/simulator', label: 'Simulator', icon: <FlaskConical size={17} />, perm: 'alerts.read', section: 'Exercise' },
  { href: '/health', label: 'System health', icon: <Activity size={17} />, perm: 'health.read', section: 'Assurance' },
  { href: '/audit', label: 'Audit log', icon: <ScrollText size={17} />, perm: 'audit.read' },
  { href: '/users', label: 'Users & roles', icon: <Users size={17} />, perm: 'alerts.read' },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="clock">
      {now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Riyadh' })} AST
    </span>
  );
}

export function Shell({ title, actions, children }: { title: string; actions?: ReactNode; children: (s: Session) => ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [session, setS] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const { data: pending } = useLive<unknown[]>(session ? '/api/alerts?state=VERIFIED,IN_REVIEW,APPROVED' : null, 8000);
  const { data: health } = useLive<{ services: { status: string }[]; auditChain: { ok: boolean } }>(session ? '/api/health' : null, 10000);

  useEffect(() => {
    const s = getSession();
    if (!s) router.replace('/');
    setS(s);
    setReady(true);
  }, [router]);

  if (!ready || !session) return null;
  const degraded = health?.services.some((s) => s.status !== 'ok') || health?.auditChain.ok === false;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Mark size={34} />
          <div>
            <div className="brand-name">Saudi Shield</div>
            <div className="brand-sub">Operations · Independent prototype</div>
          </div>
        </div>
        <div className="env-badge">Exercise environment</div>
        <nav className="nav" aria-label="Main">
          {NAV.filter((n) => can(session.user, n.perm)).map((n) => (
            <div key={n.href} style={{ display: 'contents' }}>
              {n.section && <div className="nav-section">{n.section}</div>}
              <Link href={n.href} className={path?.startsWith(n.href) ? 'active' : ''}>
                {n.icon}
                {n.label}
                {n.href === '/inbound' && pending && pending.length > 0 && <span className="count">{pending.length}</span>}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">{session.user.name}</div>
          <div className="who-role">{session.user.roles.map((r) => ROLE_LABELS[r].en).join(', ')}</div>
          <button
            className="signout"
            onClick={() => {
              setSession(null);
              router.replace('/');
            }}
          >
            Switch user
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="proto-strip">Independent prototype · Fictional exercise data · Not an official service · Official cell broadcast alerts remain authoritative</div>
        <header className="topbar">
          <h1>{title}</h1>
          <div className="spacer" />
          {actions}
          <span className="health-pill">
            <span className={`dot ${degraded ? 'amber' : ''}`} />
            {degraded ? 'Attention needed' : 'All systems normal'}
          </span>
          <Clock />
        </header>
        <main className="content">{children(session)}</main>
      </div>
    </div>
  );
}
