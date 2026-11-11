'use client';

import { Check, Minus } from 'lucide-react';
import { ROLE_LABELS, ROLE_PERMISSIONS, type Permission, type Role } from '@saudi-shield/core';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui';
import { useLive } from '@/lib/api';

const PERMS: { p: Permission; label: string }[] = [
  { p: 'alerts.read', label: 'View alerts' },
  { p: 'alerts.prepare', label: 'Prepare alerts' },
  { p: 'assist.use', label: 'Use AI assistant' },
  { p: 'alerts.approve', label: 'Approve' },
  { p: 'alerts.reject', label: 'Reject' },
  { p: 'alerts.publish', label: 'Publish' },
  { p: 'alerts.cancel', label: 'Retract' },
  { p: 'audit.read', label: 'Read audit log' },
  { p: 'users.manage', label: 'Manage users' },
  { p: 'keys.manage', label: 'Manage keys' },
  { p: 'simulator.run', label: 'Run simulator' },
];
const ROLES = Object.keys(ROLE_PERMISSIONS) as Role[];

export default function Users() {
  const { data } = useLive<{ users: { id: string; name: string; roles: Role[] }[] }>('/api/roles', 30000);
  return (
    <Shell title="Users & roles">
      {() => (
        <div className="stack" style={{ gap: 16 }}>
          <div className="notice info">
            One permission table drives both the API guards and this interface. Publication needs three different people: an operator prepares, an approver approves,
            and a duty publisher publishes. Administrators manage users and keys but cannot touch alert content.
          </div>
          <Card title="Permission matrix" pad={false}>
            <div style={{ overflowX: 'auto' }}>
              <table className="t">
                <thead>
                  <tr>
                    <th>Permission</th>
                    {ROLES.map((r) => (
                      <th key={r} style={{ textAlign: 'center' }}>
                        {ROLE_LABELS[r].en}
                        <div className="faint" style={{ fontWeight: 500 }}>{ROLE_LABELS[r].ar}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMS.map(({ p, label }) => (
                    <tr key={p}>
                      <td>
                        {label} <span className="mono faint">{p}</span>
                      </td>
                      {ROLES.map((r) => (
                        <td key={r} style={{ textAlign: 'center' }}>
                          {ROLE_PERMISSIONS[r].includes(p) ? <Check size={16} color="#0e5e43" aria-label="allowed" /> : <Minus size={14} color="#c8c5bd" aria-label="not allowed" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Demo accounts" sub="Fictional staff" pad={false}>
            <table className="t">
              <tbody>
                {(data?.users ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="mono faint">{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name.split(' (')[0]}</td>
                    <td>{u.roles.map((r) => <span key={r} className="chip neutral">{ROLE_LABELS[r].en}</span>)}</td>
                    <td className="small muted">{ROLE_LABELS[u.roles[0]].description}</td>
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
