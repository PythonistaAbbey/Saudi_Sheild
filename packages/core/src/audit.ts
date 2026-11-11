import { canonicalJson, sha256Hex } from './crypto';

export interface AuditEvent {
  seq: number;
  at: string;
  actor: string;
  action: string;
  subject?: string;
  detail: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export const GENESIS_HASH = '0'.repeat(64);

function hashEvent(e: Omit<AuditEvent, 'hash'>): string {
  return sha256Hex(canonicalJson(e));
}

/** Append-only, hash-chained audit log. Any edit or deletion breaks the chain. */
export class AuditLog {
  private events: AuditEvent[] = [];

  append(input: { at: string; actor: string; action: string; subject?: string; detail?: Record<string, unknown> }): AuditEvent {
    const prev = this.events[this.events.length - 1];
    const base = {
      seq: (prev?.seq ?? 0) + 1,
      at: input.at,
      actor: input.actor,
      action: input.action,
      subject: input.subject,
      detail: input.detail ?? {},
      prevHash: prev?.hash ?? GENESIS_HASH,
    };
    const ev: AuditEvent = { ...base, hash: hashEvent(base) };
    this.events.push(ev);
    return ev;
  }

  list(): readonly AuditEvent[] {
    return this.events;
  }

  /** For tests and the tamper demo only. */
  _unsafeMutate(seq: number, patch: Partial<AuditEvent>) {
    const i = this.events.findIndex((e) => e.seq === seq);
    if (i >= 0) this.events[i] = { ...this.events[i], ...patch };
  }
}

export interface ChainVerification {
  ok: boolean;
  checked: number;
  firstBrokenSeq?: number;
}

export function verifyChain(events: readonly AuditEvent[]): ChainVerification {
  let prevHash = GENESIS_HASH;
  for (const e of events) {
    const { hash, ...rest } = e;
    if (e.prevHash !== prevHash || hashEvent(rest) !== hash) {
      return { ok: false, checked: events.length, firstBrokenSeq: e.seq };
    }
    prevHash = hash;
  }
  return { ok: true, checked: events.length };
}
