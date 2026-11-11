'use client';

import { Shell } from '@/components/Shell';
import { AlertTable } from '@/components/AlertTable';
import { Card } from '@/components/ui';
import { useLive } from '@/lib/api';
import type { AlertSummary } from '@/lib/types';

export default function Published() {
  const { data } = useLive<AlertSummary[]>('/api/alerts?state=PUBLISHED,CLEARED,CANCELLED,EXPIRED', 4000);
  const rows = data ?? [];
  const current = rows.filter((a) => a.state === 'PUBLISHED' && !a.supersededBy);
  const past = rows.filter((a) => !(a.state === 'PUBLISHED' && !a.supersededBy));
  return (
    <Shell title="Published alerts">
      {() => (
        <div className="stack" style={{ gap: 16 }}>
          <Card title="Current" sub="Latest message in each chain" pad={false}>
            <AlertTable rows={current} empty="Nothing currently published." />
          </Card>
          <Card title="History" sub="Superseded, cleared, cancelled and expired" pad={false}>
            <AlertTable rows={past} empty="No history yet." />
          </Card>
        </div>
      )}
    </Shell>
  );
}
