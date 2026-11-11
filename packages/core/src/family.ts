/**
 * Voluntary family check-ins. Privacy rules:
 *  - opt-in by invitation code, consent recorded per member;
 *  - shares only a status ('safe' | 'need_help') and a time, never location;
 *  - any member can pause sharing or leave, which deletes their data;
 *  - check-ins expire after 72 hours.
 */
export type CheckInStatus = 'safe' | 'need_help';

export interface FamilyMember {
  id: string;
  displayName: string;
  relation?: string;
  consentAt: string;
  paused: boolean;
  lastCheckIn?: { status: CheckInStatus; at: string };
}

export interface FamilyCircle {
  id: string;
  inviteCode: string;
  members: FamilyMember[];
}

export const CHECKIN_RETENTION_MS = 72 * 3600_000;

export function checkIn(circle: FamilyCircle, memberId: string, status: CheckInStatus, now: Date): FamilyCircle {
  return {
    ...circle,
    members: circle.members.map((m) => (m.id === memberId && !m.paused ? { ...m, lastCheckIn: { status, at: now.toISOString() } } : m)),
  };
}

export function setPaused(circle: FamilyCircle, memberId: string, paused: boolean): FamilyCircle {
  return {
    ...circle,
    members: circle.members.map((m) => (m.id === memberId ? { ...m, paused, lastCheckIn: paused ? undefined : m.lastCheckIn } : m)),
  };
}

export function leave(circle: FamilyCircle, memberId: string): FamilyCircle {
  return { ...circle, members: circle.members.filter((m) => m.id !== memberId) };
}

/** What other members can see. Paused members and expired check-ins show no status. */
export function visibleStatus(m: FamilyMember, now: Date): CheckInStatus | 'no_update' | 'paused' {
  if (m.paused) return 'paused';
  if (!m.lastCheckIn) return 'no_update';
  if (now.getTime() - new Date(m.lastCheckIn.at).getTime() > CHECKIN_RETENTION_MS) return 'no_update';
  return m.lastCheckIn.status;
}

export function purgeExpired(circle: FamilyCircle, now: Date): FamilyCircle {
  return {
    ...circle,
    members: circle.members.map((m) =>
      m.lastCheckIn && now.getTime() - new Date(m.lastCheckIn.at).getTime() > CHECKIN_RETENTION_MS ? { ...m, lastCheckIn: undefined } : m,
    ),
  };
}

/** Fictional demo family. */
export function demoFamily(now: Date): FamilyCircle {
  const ago = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  return {
    id: 'fam-demo',
    inviteCode: 'DEMO-4821',
    members: [
      { id: 'me', displayName: 'You', consentAt: ago(9000), paused: false },
      { id: 'm1', displayName: 'Layla', relation: 'Sister', consentAt: ago(8000), paused: false, lastCheckIn: { status: 'safe', at: ago(6) } },
      { id: 'm2', displayName: 'Ahmed', relation: 'Father', consentAt: ago(8000), paused: false, lastCheckIn: { status: 'safe', at: ago(14) } },
      { id: 'm3', displayName: 'Mariam', relation: 'Mother', consentAt: ago(8000), paused: false },
      { id: 'm4', displayName: 'Yousef', relation: 'Cousin', consentAt: ago(7000), paused: true },
    ],
  };
}
