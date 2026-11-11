export type Role = 'viewer' | 'operator' | 'approver' | 'publisher' | 'auditor' | 'admin';

export type Permission =
  | 'alerts.read'
  | 'alerts.prepare'
  | 'alerts.approve'
  | 'alerts.reject'
  | 'alerts.publish'
  | 'alerts.clear'
  | 'alerts.cancel'
  | 'assist.use'
  | 'areas.read'
  | 'stats.read'
  | 'health.read'
  | 'audit.read'
  | 'audit.verify'
  | 'users.manage'
  | 'keys.manage'
  | 'simulator.run';

const ALL_READ: Permission[] = ['alerts.read', 'areas.read', 'stats.read', 'health.read'];

/** Single source of truth used by API guards and dashboard UI. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [...ALL_READ],
  operator: [...ALL_READ, 'alerts.prepare', 'assist.use', 'simulator.run'],
  approver: [...ALL_READ, 'alerts.approve', 'alerts.reject', 'alerts.cancel', 'assist.use'],
  publisher: [...ALL_READ, 'alerts.publish', 'alerts.clear', 'alerts.cancel'],
  auditor: [...ALL_READ, 'audit.read', 'audit.verify'],
  admin: [...ALL_READ, 'users.manage', 'keys.manage', 'audit.read', 'simulator.run'],
};

export const ROLE_LABELS: Record<Role, { en: string; ar: string; description: string }> = {
  viewer: { en: 'Viewer', ar: 'مطّلع', description: 'Read-only access to alerts, areas and statistics.' },
  operator: { en: 'Operator', ar: 'مشغّل', description: 'Prepares verified alerts and reviews AI drafts. Cannot approve or publish.' },
  approver: { en: 'Approver', ar: 'معتمِد', description: 'Approves or rejects alerts prepared by someone else.' },
  publisher: { en: 'Duty publisher', ar: 'ناشر مناوب', description: 'Publishes approved alerts and issues clears or cancellations. Cannot edit.' },
  auditor: { en: 'Auditor', ar: 'مدقّق', description: 'Reads and verifies the tamper-evident audit log.' },
  admin: { en: 'Administrator', ar: 'مسؤول النظام', description: 'Manages users and keys. Cannot prepare, approve or publish alerts.' },
};

export interface Actor {
  id: string;
  name: string;
  roles: Role[];
}

export function can(actor: Pick<Actor, 'roles'> | undefined, perm: Permission): boolean {
  if (!actor) return false;
  return actor.roles.some((r) => ROLE_PERMISSIONS[r].includes(perm));
}

export const DEMO_USERS: Actor[] = [
  { id: 'u-op-1', name: 'Noura (Operator)', roles: ['operator'] },
  { id: 'u-op-2', name: 'Faisal (Operator)', roles: ['operator'] },
  { id: 'u-ap-1', name: 'Huda (Approver)', roles: ['approver'] },
  { id: 'u-ap-2', name: 'Khalid (Approver)', roles: ['approver'] },
  { id: 'u-pb-1', name: 'Sara (Duty publisher)', roles: ['publisher'] },
  { id: 'u-au-1', name: 'Omar (Auditor)', roles: ['auditor'] },
  { id: 'u-ad-1', name: 'Reem (Administrator)', roles: ['admin'] },
  { id: 'u-vw-1', name: 'Visitor (Viewer)', roles: ['viewer'] },
];
