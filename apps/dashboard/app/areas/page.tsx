'use client';

import Link from 'next/link';
import { useState } from 'react';
import { REGIONS } from '@saudi-shield/core';
import { Shell } from '@/components/Shell';
import { KsaMap } from '@/components/KsaMap';
import { Card, ExerciseChip, LevelChip } from '@/components/ui';
import { useLive } from '@/lib/api';
import type { AreasResponse } from '@/lib/types';

export default function Areas() {
  const { data } = useLive<AreasResponse>('/api/areas', 4000);
  const [sel, setSel] = useState<string | null>(null);
  const areas = data?.areas ?? [];
  const selected = areas.find((a) => a.code === sel);
  return (
    <Shell title="Warning areas">
      {() => (
        <div className="stack" style={{ gap: 16 }}>
          <div className="notice info">
            Warning areas are supplied by the issuing authority. Operators can select from them but cannot draw new public warning areas. These exercise zones are
            coarse, fictional shapes. Whether a person is inside an area is calculated on their own phone, so the platform never learns their location.
          </div>
          <div className="grid g-main">
            <Card title="Map" right={<ExerciseChip />}>
              <KsaMap areas={areas} selected={sel} onSelect={setSel} />
            </Card>
            <div className="stack" style={{ gap: 16 }}>
              {selected && (
                <Card title={selected.name.en} sub={selected.code}>
                  <dl className="kv">
                    <dt>Arabic name</dt>
                    <dd className="rtl" style={{ textAlign: 'start' }}>{selected.name.ar}</dd>
                    <dt>Region</dt>
                    <dd>{REGIONS.find((r) => r.code === selected.regionCode)?.name.en}</dd>
                    <dt>Current level</dt>
                    <dd>{selected.currentLevel ? <LevelChip level={selected.currentLevel} /> : <span className="faint">No alert</span>}</dd>
                    <dt>Vertices</dt>
                    <dd>{selected.polygon.length - 1}</dd>
                    <dt>Alerts</dt>
                    <dd>
                      {selected.alertIds.length
                        ? selected.alertIds.map((id) => (
                            <Link key={id} href={`/alerts/${id}`} className="mono" style={{ textDecoration: 'underline', marginInlineEnd: 8 }}>
                              {id}
                            </Link>
                          ))
                        : '—'}
                    </dd>
                  </dl>
                </Card>
              )}
              <Card title="All exercise zones" pad={false}>
                <table className="t">
                  <tbody>
                    {areas.map((a) => (
                      <tr key={a.code} className="click" onClick={() => setSel(a.code)} style={sel === a.code ? { background: 'var(--green-50)' } : undefined}>
                        <td className="mono">{a.code}</td>
                        <td>{a.name.en}</td>
                        <td style={{ textAlign: 'end' }}>{a.currentLevel ? <LevelChip level={a.currentLevel} /> : <span className="faint small">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
