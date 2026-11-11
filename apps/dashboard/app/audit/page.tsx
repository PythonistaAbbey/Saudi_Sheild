'use client';

import { Link2, ShieldCheck, ShieldX } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui';
import { fmtTime, useLive } from '@/lib/api';

interface Ev { seq: number; at: string; actor: string; action: string; subject?: string; detail: Record<string, unknown>; prevHash: string; hash: string }

export default function Audit() {
  const { data, error } = useLive<{ events: Ev[]; verification: { ok: boolean; checked: number; firstBrokenSeq?: number } }>('/api/audit', 4000);
  return (
    <Shell title="Audit log">
      {() => (
        <div className="stack" style={{ gap: 16 }}>
          {error && <div className="notice blocking">{error}</div>}
          {data && (
            <div className={`notice ${data.verification.ok ? 'ok' : 'blocking'}`}>
              {data.verification.ok ? <ShieldCheck size={18} /> : <ShieldX size={18} />}
              <div>
                <strong>{data.verification.ok ? 'Hash chain intact.' : `Chain broken at event #${data.verification.firstBrokenSeq}.`}</strong> Recomputed{' '}
                {data.verification.checked} events. Each entry includes the SHA-256 hash of the one before, so any edit or deletion is detectable.
              </div>
            </div>
          )}
          <Card title="Events" sub="Newest first" pad={false}>
            <table className="t">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time (AST)</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Subject and detail</th>
                  <th>Chain</th>
                </tr>
              </thead>
              <tbody>
                {(data?.events ?? []).map((e) => (
                  <tr key={e.seq}>
                    <td className="mono faint">{e.seq}</td>
                    <td className="small">{fmtTime(e.at, true)}</td>
                    <td className="small">{e.actor}</td>
                    <td style={{ fontWeight: 600 }}>{e.action}</td>
                    <td className="small muted" style={{ maxWidth: 380 }}>
                      {e.subject && <span className="mono">{e.subject} </span>}
                      {Object.entries(e.detail)
                        .filter(([, v]) => v !== undefined)
                        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
                        .join(' · ')}
                    </td>
                    <td className="mono faint" title={`prev ${e.prevHash}`}>
                      <Link2 size={11} /> {e.hash.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </Shell>
  );
}
