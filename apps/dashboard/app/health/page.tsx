'use client';

import { CheckCircle2, KeyRound, TriangleAlert } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card, Kpi } from '@/components/ui';
import { ago, fmtTime, useLive } from '@/lib/api';
import type { Health } from '@/lib/types';

export default function HealthPage() {
  const { data: h } = useLive<Health>('/api/health', 3000);
  return (
    <Shell title="System health">
      {() =>
        !h ? null : (
          <div className="stack" style={{ gap: 16 }}>
            <div className="grid g-4">
              <Kpi label="Services healthy" value={`${h.services.filter((s) => s.status === 'ok').length}/${h.services.length}`} />
              <Kpi label="Feed freshness" value={`${h.feedFreshnessSec}s`} foot="Target under 10 s" />
              <Kpi label="Last issuer message" value={h.lastIssuerMessageAt ? ago(h.lastIssuerMessageAt) : '—'} foot={fmtTime(h.lastIssuerMessageAt, true)} />
              <Kpi label="Audit chain" value={h.auditChain.ok ? 'Intact' : 'BROKEN'} foot={`${h.auditChain.checked} events verified`} />
            </div>
            <div className="grid g-2">
              <Card title="Services" pad={false}>
                <table className="t">
                  <tbody>
                    {h.services.map((s) => (
                      <tr key={s.name}>
                        <td style={{ width: 28 }}>{s.status === 'ok' ? <CheckCircle2 size={17} color="#2f8a63" /> : <TriangleAlert size={17} color="#b07a00" />}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td className="small muted">{s.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <Card title="Trusted issuer keys" pad={false}>
                <table className="t">
                  <tbody>
                    {h.keys.map((k) => (
                      <tr key={k.keyId}>
                        <td style={{ width: 28 }}><KeyRound size={16} /></td>
                        <td>
                          <div className="mono">{k.keyId}</div>
                          <div className="small muted">{k.issuerId} · Ed25519</div>
                        </td>
                        <td className="small">valid to {k.validTo.slice(0, 10)}</td>
                        <td>{k.revoked ? <span className="chip bad">revoked</span> : <span className="chip ok">active</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="card-b small muted">Demo keys are published in the repository and are worthless for real signing.</div>
              </Card>
            </div>
            <Card title="Safe failure behaviour">
              <table className="t">
                <tbody>
                  <tr><td style={{ fontWeight: 600 }}>Bad signature or unknown key</td><td className="muted">Quarantined; never publishable; operators alerted</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Non-exercise CAP status</td><td className="muted">Refused by the prototype at ingest</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Tracking or targeting fields in payload</td><td className="muted">Payload discarded and quarantined</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>App cannot reach feed</td><td className="muted">Shows last verified state with its time and tells people to follow official channels</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>AI assistant unavailable</td><td className="muted">Templates still render; publication unaffected</td></tr>
                </tbody>
              </table>
            </Card>
          </div>
        )
      }
    </Shell>
  );
}
