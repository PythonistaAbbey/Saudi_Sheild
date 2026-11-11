'use client';

import Link from 'next/link';
import { Bot, Inbox, Radio, ShieldAlert, Users } from 'lucide-react';
import { areaNames, DEMO_USERS, HAZARDS } from '@saudi-shield/core';
import { Shell } from '@/components/Shell';
import { KsaMap } from '@/components/KsaMap';
import { Card, ExerciseChip, Kpi, LevelChip, StateBadge, VerifyChip } from '@/components/ui';
import { ago, useLive } from '@/lib/api';
import type { AlertSummary, AreasResponse, DeliveryRow } from '@/lib/types';

export default function Overview() {
  const { data: alerts } = useLive<AlertSummary[]>('/api/alerts', 4000);
  const { data: areas } = useLive<AreasResponse>('/api/areas', 4000);
  const { data: delivery } = useLive<DeliveryRow[]>('/api/stats/delivery', 4000);
  const { data: recent } = useLive<{ seq: number; at: string; actor: string; action: string; subject?: string }[]>('/api/audit/recent', 4000);
  const { data: summary } = useLive<{ text: string }>('/api/assist/summary?lang=en', 8000);

  const active = (alerts ?? []).filter((a) => a.state === 'PUBLISHED' && !a.supersededBy && a.level !== 'white');
  const pending = (alerts ?? []).filter((a) => ['VERIFIED', 'IN_REVIEW', 'APPROVED'].includes(a.state));
  const quarantined = (alerts ?? []).filter((a) => a.state === 'QUARANTINED');
  const reached = (delivery ?? []).reduce((n, d) => n + d.channels.reduce((m, c) => m + c.delivered, 0), 0);
  const safe = (delivery ?? []).reduce((n, d) => n + d.safeCheckIns, 0);

  return (
    <Shell title="Overview">
      {() => (
        <div className="stack" style={{ gap: 16 }}>
          <div className="grid g-4">
            <Kpi icon={<Radio size={14} />} label="Active public alerts" value={active.length} foot={active.length ? `${active.filter((a) => a.level === 'red').length} red · ${active.filter((a) => a.level === 'yellow').length} yellow` : 'No active alerts'} />
            <Kpi icon={<Inbox size={14} />} label="Awaiting action" value={pending.length} foot="Verified, in review or approved" />
            <Kpi icon={<ShieldAlert size={14} />} label="Quarantined messages" value={quarantined.length} foot="Failed verification or safety checks" />
            <Kpi icon={<Users size={14} />} label="Deliveries (fictional)" value={reached.toLocaleString('en')} foot={`${safe.toLocaleString('en')} "I'm safe" check-ins`} />
          </div>

          <div className="grid g-main">
            <Card title="Warning areas" sub="Current level per exercise zone" right={<ExerciseChip />}>
              {areas && <KsaMap areas={areas.areas} />}
              <div className="legend" style={{ marginTop: 10 }}>
                <span><i style={{ background: 'rgba(180,35,24,0.55)' }} />Red · danger has occurred</span>
                <span><i style={{ background: 'rgba(227,160,8,0.55)' }} />Yellow · risk may occur</span>
                <span><i style={{ background: '#fff', border: '1px solid #0e5e43' }} />White · danger has ended</span>
                <span><i style={{ background: 'rgba(14,94,67,0.08)', border: '1px dashed rgba(14,94,67,0.45)' }} />No alert</span>
              </div>
            </Card>

            <div className="stack" style={{ gap: 16 }}>
              <Card title="Active alerts" right={<Link className="btn sm" href="/alerts">All published</Link>} pad={false}>
                {active.length === 0 && <div className="card-b muted">No active alerts. Areas show their last official status.</div>}
                {active.map((a) => (
                  <Link key={a.id} href={`/alerts/${a.id}`} className="card-b" style={{ display: 'block', borderBottom: '1px solid var(--neutral-200)' }}>
                    <div className="row">
                      <LevelChip level={a.level} />
                      <strong>{HAZARDS[a.hazard].en}</strong>
                      <span className="faint small" style={{ marginInlineStart: 'auto' }}>{ago(a.updatedAt)}</span>
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>{areaNames(a.areas, 'en').join(', ')}</div>
                  </Link>
                ))}
              </Card>

              <Card title="Inbound queue" right={<Link className="btn sm" href="/inbound">Open</Link>} pad={false}>
                {pending.length === 0 && <div className="card-b muted">Nothing waiting.</div>}
                {pending.slice(0, 4).map((a) => (
                  <Link key={a.id} href={`/alerts/${a.id}`} className="card-b" style={{ display: 'block', borderBottom: '1px solid var(--neutral-200)' }}>
                    <div className="row">
                      <StateBadge state={a.state} />
                      <LevelChip level={a.level} />
                      <span className="small">{HAZARDS[a.hazard].en}</span>
                      {a.blocking > 0 && <span className="chip bad" style={{ marginInlineStart: 'auto' }}>{a.blocking} blocking</span>}
                    </div>
                    <div className="row small muted" style={{ marginTop: 6 }}>
                      <VerifyChip ok={a.verification.ok} code={a.verification.code} />
                      <span className="mono faint">{a.identifier}</span>
                    </div>
                  </Link>
                ))}
              </Card>
            </div>
          </div>

          <div className="grid g-2">
            <Card title={<span className="row"><Bot size={16} /> Briefing summary</span>} sub="AI draft · needs human review before sharing">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', margin: 0, fontSize: 13 }}>{summary?.text ?? '…'}</pre>
              <div className="notice ai small" style={{ marginTop: 12 }}>
                Generated from approved structured data only. It cannot declare emergencies, change levels or issue instructions.
              </div>
            </Card>
            <Card title="Recent activity" sub="From the tamper-evident audit log" pad={false}>
              <table className="t">
                <tbody>
                  {(recent ?? []).slice(0, 7).map((e) => (
                    <tr key={e.seq}>
                      <td className="mono faint" style={{ width: 60 }}>#{e.seq}</td>
                      <td>{e.action}</td>
                      <td className="small muted">{DEMO_USERS.find((u) => u.id === e.actor)?.name.split(' (')[0] ?? e.actor}</td>
                      <td className="small faint" style={{ textAlign: 'end' }}>{ago(e.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </Shell>
  );
}
