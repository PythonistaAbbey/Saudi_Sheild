'use client';

import { Shell } from '@/components/Shell';
import { AlertTable } from '@/components/AlertTable';
import { Card } from '@/components/ui';
import { useLive } from '@/lib/api';
import type { AlertSummary } from '@/lib/types';

export default function Inbound() {
  const { data } = useLive<AlertSummary[]>('/api/alerts', 3000);
  const rows = data ?? [];
  const queue = rows.filter((a) => ['VERIFIED', 'IN_REVIEW', 'APPROVED'].includes(a.state));
  const held = rows.filter((a) => ['QUARANTINED', 'REJECTED'].includes(a.state));
  return (
    <Shell title="Inbound & review">
      {() => (
        <div className="stack" style={{ gap: 16 }}>
          <div className="notice info">
            Messages arrive here from registered issuers. Each is checked against the issuer&apos;s public key before anyone can work on it. Saudi Shield
            cannot create a warning itself.
          </div>
          <Card title="Review queue" sub={`${queue.length} message(s)`} pad={false}>
            <AlertTable rows={queue} authenticity empty="No messages waiting for review." />
          </Card>
          <Card title="Quarantined and rejected" sub="Never publishable" pad={false}>
            <AlertTable rows={held} authenticity empty="Nothing quarantined." />
          </Card>
        </div>
      )}
    </Shell>
  );
}
