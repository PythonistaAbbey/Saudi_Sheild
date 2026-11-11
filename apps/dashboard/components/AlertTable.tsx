'use client';

import { useRouter } from 'next/navigation';
import { areaNames, HAZARDS } from '@saudi-shield/core';
import { fmtTime } from '@/lib/api';
import type { AlertSummary } from '@/lib/types';
import { LevelChip, StateBadge, VerifyChip } from './ui';

export function AlertTable({ rows, authenticity = false, empty }: { rows: AlertSummary[]; authenticity?: boolean; empty: string }) {
  const router = useRouter();
  if (!rows.length) return <div className="card-b muted">{empty}</div>;
  return (
    <table className="t">
      <thead>
        <tr>
          <th>State</th>
          <th>Level</th>
          <th>Hazard and areas</th>
          {authenticity ? (
            <>
              <th>Authenticity</th>
              <th>Key and payload hash</th>
            </>
          ) : (
            <th>Type</th>
          )}
          <th>Received</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id} className="click" onClick={() => router.push(`/alerts/${a.id}`)}>
            <td>
              <StateBadge state={a.state} />
              {a.supersededBy && <div className="small faint" style={{ marginTop: 4 }}>superseded</div>}
            </td>
            <td>
              <LevelChip level={a.level} />
            </td>
            <td>
              <div style={{ fontWeight: 600 }}>{a.areas.length ? HAZARDS[a.hazard].en : <span className="faint">Content withheld</span>}</div>
              <div className="small muted">{areaNames(a.areas, 'en').join(', ') || '—'}</div>
              <div className="mono faint">{a.identifier}</div>
            </td>
            {authenticity ? (
              <>
                <td>
                  <VerifyChip ok={a.verification.ok} code={a.verification.code} />
                  {a.blocking > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <span className="chip bad">{a.blocking} blocking finding{a.blocking > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </td>
                <td>
                  <div className="mono">{a.verification.keyId || '—'}</div>
                  <div className="mono faint">sha256 {a.verification.payloadSha256.slice(0, 16)}…</div>
                </td>
              </>
            ) : (
              <td className="small">{a.msgType}</td>
            )}
            <td className="small muted">{fmtTime(a.receivedAt, true)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
