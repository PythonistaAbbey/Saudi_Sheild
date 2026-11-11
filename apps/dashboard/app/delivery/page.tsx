'use client';

import Link from 'next/link';
import { areaNames, HAZARDS } from '@saudi-shield/core';
import { Shell } from '@/components/Shell';
import { Card, Kpi, LevelChip, StateBadge } from '@/components/ui';
import { useLive } from '@/lib/api';
import type { DeliveryRow } from '@/lib/types';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export default function Delivery() {
  const { data } = useLive<DeliveryRow[]>('/api/stats/delivery', 3000);
  const rows = data ?? [];
  const sum = (k: 'queued' | 'sent' | 'delivered' | 'opened') => rows.reduce((n, r) => n + r.channels.reduce((m, c) => m + c[k], 0), 0);
  return (
    <Shell title="Delivery">
      {() => (
        <div className="stack" style={{ gap: 16 }}>
          <div className="notice warning">
            All figures are simulated for demonstration. Push notifications are only a wake-up signal: the app always fetches and verifies the signed alert. The
            app is a companion channel; official cell broadcast remains the primary, authoritative channel.
          </div>
          <div className="grid g-4">
            <Kpi label="Queued" value={sum('queued').toLocaleString('en')} />
            <Kpi label="Sent" value={sum('sent').toLocaleString('en')} foot={`${pct(sum('sent'), sum('queued'))}% of queued`} />
            <Kpi label="Delivered" value={sum('delivered').toLocaleString('en')} foot={`${pct(sum('delivered'), sum('sent'))}% of sent`} />
            <Kpi label="Opened" value={sum('opened').toLocaleString('en')} foot={`${pct(sum('opened'), sum('delivered'))}% of delivered`} />
          </div>
          {rows.map((r) => (
            <Card
              key={r.alertId}
              title={
                <span className="row">
                  <LevelChip level={r.alert.level} /> {HAZARDS[r.alert.hazard].en}
                </span>
              }
              sub={areaNames(r.alert.areas, 'en').join(', ')}
              right={
                <>
                  <StateBadge state={r.alert.state} />
                  <Link className="btn sm" href={`/alerts/${r.alertId}`}>Open</Link>
                </>
              }
              pad={false}
            >
              <table className="t">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Queued</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th style={{ width: '32%' }}>Delivery rate</th>
                    <th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {r.channels.map((c) => (
                    <tr key={c.channel}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{c.channel === 'feed' ? 'Signed feed (in-app)' : c.channel === 'push' ? 'Push wake-up' : 'Partner channels'}</td>
                      <td>{c.queued.toLocaleString('en')}</td>
                      <td>{c.sent.toLocaleString('en')}</td>
                      <td>{c.delivered.toLocaleString('en')}</td>
                      <td>
                        <div className="row">
                          <div className="bar" style={{ flex: 1 }}>
                            <span style={{ width: `${pct(c.delivered, c.queued)}%` }} />
                          </div>
                          <span className="small" style={{ width: 48, textAlign: 'end' }}>{pct(c.delivered, c.queued)}%</span>
                        </div>
                      </td>
                      <td>{c.opened.toLocaleString('en')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="card-b small muted">“I’m safe” check-ins after this alert: <strong>{r.safeCheckIns.toLocaleString('en')}</strong> (voluntary, no location shared)</div>
            </Card>
          ))}
          {rows.length === 0 && <div className="muted">No published alerts yet.</div>}
        </div>
      )}
    </Shell>
  );
}
