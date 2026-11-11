import { AuditLog, verifyChain } from './audit';
import { RuleBasedAssist, type AssistProvider } from './assist/provider';
import { DEMO_ISSUER, DEMO_PUBLISHER_KEY, KeyRegistry, demoRegistry, sign, verifySignature, type KeyPair } from './crypto';
import { areaByCode } from './geo';
import { renderAll } from './templates';
import type { Actor } from './rbac';
import { envelopeForStep, scenarioById } from './scenarios';
import type { AlertRecord, PublicAlert, PublicFeed, SignedEnvelope } from './types';
import * as wf from './workflow';

export interface DeliveryStats {
  alertId: string;
  channels: { channel: 'feed' | 'push' | 'partner'; queued: number; sent: number; delivered: number; opened: number }[];
  safeCheckIns: number;
}

/** Fictional subscriber counts per exercise zone, for delivery statistics. */
const FICTIONAL_SUBSCRIBERS: Record<string, number> = {
  'EX-RIY-A': 48200, 'EX-RIY-B': 6100, 'EX-MKK-A': 31800, 'EX-MKK-B': 14900, 'EX-MKK-C': 5200, 'EX-MDN-A': 11300,
  'EX-EAS-A': 17600, 'EX-EAS-B': 8900, 'EX-QAS-A': 5400, 'EX-TBK-A': 4700, 'EX-ASR-A': 4300, 'EX-JAZ-A': 3600, 'EX-HAI-A': 3100,
};

function hashInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export function simulatedDelivery(rec: AlertRecord, now: Date): DeliveryStats | undefined {
  if (!rec.publishedAt) return undefined;
  const mins = Math.max(0, (now.getTime() - new Date(rec.publishedAt).getTime()) / 60_000);
  const ramp = Math.min(1, 0.55 + mins / 6); // reaches steady state after ~3 minutes
  const total = rec.message.areas.reduce((n, c) => n + (FICTIONAL_SUBSCRIBERS[c] ?? 1000), 0);
  const j = (hashInt(rec.id) % 100) / 100;
  const mk = (channel: 'feed' | 'push' | 'partner', share: number, dRate: number, oRate: number) => {
    const queued = Math.round(total * share);
    const sent = Math.round(queued * (0.985 + j * 0.01) * ramp);
    const delivered = Math.round(sent * dRate);
    return { channel, queued, sent, delivered, opened: Math.round(delivered * oRate * ramp) };
  };
  const channels = [mk('push', 1, 0.962, 0.71), mk('feed', 0.84, 0.995, 0.88), mk('partner', 0.12, 0.98, 0.4)];
  const safeCheckIns = rec.message.level === 'white' ? 0 : Math.round(channels[0].opened * 0.23 * ramp);
  return { alertId: rec.id, channels, safeCheckIns };
}

export interface HealthReport {
  generatedAt: string;
  services: { name: string; status: 'ok' | 'degraded' | 'down'; detail: string }[];
  feedFreshnessSec: number;
  lastIssuerMessageAt?: string;
  keys: { keyId: string; issuerId: string; validTo: string; revoked: boolean }[];
  auditChain: ReturnType<typeof verifyChain>;
}

/**
 * In-memory platform used by the API and by offline demos. Every action is audited.
 */
export class Platform {
  readonly registry: KeyRegistry;
  readonly audit = new AuditLog();
  private records = new Map<string, AlertRecord>();
  private lastInboundAt?: Date;
  private listeners = new Set<(ev: { type: string; alertId?: string }) => void>();
  private runCounter = 0;

  constructor(
    private readonly clock: () => Date = () => new Date(),
    readonly assist: AssistProvider = new RuleBasedAssist(),
    private readonly publisherKey: KeyPair = DEMO_PUBLISHER_KEY,
    registry?: KeyRegistry,
  ) {
    this.registry = registry ?? demoRegistry();
    this.audit.append({ at: this.clock().toISOString(), actor: 'system', action: 'platform.start', detail: { mode: 'exercise-only' } });
  }

  on(fn: (ev: { type: string; alertId?: string }) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(type: string, alertId?: string) {
    for (const l of this.listeners) l({ type, alertId });
  }

  now() {
    return this.clock();
  }

  list(): AlertRecord[] {
    this.tick();
    return [...this.records.values()].sort((a, b) => b.history[0].at.localeCompare(a.history[0].at));
  }

  get(id: string): AlertRecord | undefined {
    this.tick();
    return this.records.get(id);
  }

  private require(id: string): AlertRecord {
    const r = this.get(id);
    if (!r) throw new wf.WorkflowError('NOT_FOUND', `Alert ${id} not found.`);
    return r;
  }

  private save(rec: AlertRecord, actor: string, action: string, detail: Record<string, unknown> = {}) {
    this.records.set(rec.id, rec);
    this.audit.append({ at: this.clock().toISOString(), actor, action, subject: rec.id, detail: { state: rec.state, ...detail } });
    this.emit(action, rec.id);
    return rec;
  }

  /** Close out alerts whose validity has ended. */
  tick() {
    const now = this.clock();
    for (const r of this.records.values()) {
      const next = wf.expireIfDue(r, now);
      if (next !== r) this.save(next, 'system:clock', 'alert.expired');
    }
  }

  ingest(env: SignedEnvelope): AlertRecord {
    const now = this.clock();
    this.lastInboundAt = now;
    const rec = wf.ingest(env, this.registry, now, [...this.records.values()]);
    return this.save(rec, 'system:ingest', rec.state === 'QUARANTINED' ? 'inbound.quarantined' : 'inbound.verified', {
      identifier: rec.message.identifier,
      keyId: rec.verification.keyId,
      verification: rec.verification.code,
      reason: rec.history[rec.history.length - 1].note,
    });
  }

  prepare(id: string, actor: Actor) {
    return this.save(wf.prepare(this.require(id), actor, this.clock(), this.assist), actor.id, 'alert.prepared');
  }
  acceptSuggestion(id: string, actor: Actor, index: number) {
    return this.save(wf.acceptSuggestion(this.require(id), actor, index, this.clock()), actor.id, 'alert.suggestion_accepted', { index });
  }
  approve(id: string, actor: Actor) {
    return this.save(wf.approve(this.require(id), actor, this.clock()), actor.id, 'alert.approved');
  }
  reject(id: string, actor: Actor, reason: string) {
    return this.save(wf.reject(this.require(id), actor, this.clock(), reason), actor.id, 'alert.rejected', { reason });
  }
  publish(id: string, actor: Actor) {
    const now = this.clock();
    const rec = this.save(wf.publish(this.require(id), actor, now), actor.id, 'alert.published');
    if (rec.supersedes) {
      const old = this.records.get(rec.supersedes);
      if (old && old.state === 'PUBLISHED') {
        const closing = rec.message.level === 'white' ? 'CLEARED' : rec.message.msgType === 'Cancel' ? 'CANCELLED' : 'PUBLISHED';
        const updated: AlertRecord = {
          ...old,
          state: closing,
          supersededBy: rec.id,
          closedAt: closing === 'PUBLISHED' ? undefined : now.toISOString(),
          history: [...old.history, { state: closing, at: now.toISOString(), by: actor.id, note: `Superseded by ${rec.message.identifier}` }],
        };
        this.save(updated, actor.id, closing === 'PUBLISHED' ? 'alert.superseded' : `alert.${closing.toLowerCase()}`, { by: rec.id });
      }
    }
    return rec;
  }
  requestRetraction(id: string, actor: Actor, reason: string) {
    return this.save(wf.requestRetraction(this.require(id), actor, this.clock(), reason), actor.id, 'alert.retraction_requested', { reason });
  }
  confirmRetraction(id: string, actor: Actor) {
    return this.save(wf.confirmRetraction(this.require(id), actor, this.clock()), actor.id, 'alert.retracted');
  }

  /* ---------------------------- public feed ---------------------------- */

  toPublic(rec: AlertRecord): PublicAlert {
    const successor = rec.supersededBy ? this.records.get(rec.supersededBy) : undefined;
    let publicState: PublicAlert['publicState'] = 'active';
    if (rec.state === 'CANCELLED') publicState = 'cancelled';
    else if (rec.state === 'CLEARED' || rec.message.level === 'white') publicState = 'cleared';
    else if (rec.state === 'EXPIRED') publicState = 'expired';
    else if (successor) publicState = 'superseded';
    const plain: PublicAlert['plain'] = {};
    for (const s of rec.suggestions) if (s.kind === 'plain_language' && s.accepted) plain[s.lang] = s.text;
    return {
      id: rec.id,
      identifier: rec.message.identifier,
      status: rec.message.status,
      issuer: this.registry.getIssuer(rec.message.sender) ?? DEMO_ISSUER,
      level: rec.message.level,
      hazard: rec.message.hazard,
      areas: rec.message.areas,
      instructions: rec.message.instructions,
      texts: rec.texts,
      plain,
      issuedAt: rec.publishedAt!,
      updatedAt: rec.history[rec.history.length - 1].at,
      expires: rec.message.expires,
      publicState,
      references: rec.message.references,
    };
  }

  publicFeed(): PublicFeed {
    const items = this.list().filter((r) => r.publishedAt);
    return {
      generatedAt: this.clock().toISOString(),
      environment: 'EXERCISE',
      alerts: items.map((r) => sign(this.toPublic(r), this.publisherKey)),
    };
  }

  /** Active alerts plus anything updated in the last 24 hours, codes only. */
  liteFeed(): LiteFeed {
    const cutoff = this.clock().getTime() - 24 * 3600_000;
    const items = this.list()
      .filter((r) => r.publishedAt)
      .map((r) => this.toPublic(r))
      .filter((a) => a.publicState === 'active' || new Date(a.updatedAt).getTime() >= cutoff);
    return { g: this.clock().toISOString(), e: 'EXERCISE', k: this.publisherKey.keyId, alerts: items.map((a) => sign(toLite(a), this.publisherKey)) };
  }

  publisherPublicKey() {
    return { keyId: this.publisherKey.keyId, publicKeyHex: this.publisherKey.publicKeyHex };
  }

  /* ------------------------------ stats -------------------------------- */

  delivery(): DeliveryStats[] {
    const now = this.clock();
    return this.list()
      .map((r) => simulatedDelivery(r, now))
      .filter((x): x is DeliveryStats => !!x);
  }

  health(): HealthReport {
    const now = this.clock();
    const quarantined = this.list().filter((r) => r.state === 'QUARANTINED').length;
    return {
      generatedAt: now.toISOString(),
      services: [
        { name: 'Ingest gateway', status: 'ok', detail: 'Accepting signed Exercise messages' },
        { name: 'Signature verification', status: quarantined ? 'degraded' : 'ok', detail: quarantined ? `${quarantined} message(s) quarantined` : 'All messages verified' },
        { name: 'Workflow engine', status: 'ok', detail: 'Two-person rule enforced' },
        { name: 'Public feed signer', status: 'ok', detail: `Key ${this.publisherKey.keyId}` },
        { name: 'Push relay (simulated)', status: 'ok', detail: 'Wake-and-fetch mode' },
        { name: 'AI assist', status: 'ok', detail: this.assist.name },
      ],
      feedFreshnessSec: 4,
      lastIssuerMessageAt: this.lastInboundAt?.toISOString(),
      keys: this.registry.listKeys().map((k) => ({ keyId: k.keyId, issuerId: k.issuerId, validTo: k.validTo, revoked: !!k.revokedAt })),
      auditChain: verifyChain(this.audit.list()),
    };
  }

  /* ---------------------------- simulator ------------------------------ */

  newRunId() {
    this.runCounter += 1;
    const d = this.clock();
    return `${d.toISOString().slice(2, 10).replace(/-/g, '')}${String(this.runCounter).padStart(2, '0')}${Math.floor(Math.random() * 90 + 10)}`;
  }

  runStep(scenarioId: string, stepId: string, run: string, actor: string): AlertRecord {
    const sc = scenarioById(scenarioId);
    const step = sc?.steps.find((s) => s.id === stepId);
    if (!sc || !step) throw new wf.WorkflowError('NOT_FOUND', 'Unknown scenario step.');
    this.audit.append({ at: this.clock().toISOString(), actor, action: 'simulator.step', subject: `${scenarioId}/${stepId}`, detail: { run } });
    return this.ingest(envelopeForStep(step, this.clock(), run));
  }
}

/** Client-side verification of a public feed item (used by the mobile app). */
export function verifyPublicAlert(env: SignedEnvelope<PublicAlert>, publisherPublicKeyHex: string): boolean {
  return env.payload.status === 'Exercise' && verifySignature(env, publisherPublicKeyHex);
}

export function areaNames(codes: string[], lang: 'ar' | 'en') {
  return codes.map((c) => areaByCode(c)?.name[lang] ?? c);
}

/* ------------------------- low-bandwidth "lite" feed ------------------------- */

/**
 * Compact alert for slow or expensive connections. It carries only codes; the
 * app renders Arabic and English text locally from the same approved templates,
 * so the wording is identical to the full feed. Signed like the full feed.
 */
export interface LiteAlert {
  i: string; // id
  n: string; // identifier
  st: PublicAlert['status'];
  l: PublicAlert['level'];
  h: PublicAlert['hazard'];
  a: string[];
  s: PublicAlert['instructions'];
  t: string; // issuedAt
  u: string; // updatedAt
  x: string; // expires
  p: PublicAlert['publicState'];
  r?: string[];
}

export function toLite(a: PublicAlert): LiteAlert {
  return { i: a.id, n: a.identifier, st: a.status, l: a.level, h: a.hazard, a: a.areas, s: a.instructions, t: a.issuedAt, u: a.updatedAt, x: a.expires, p: a.publicState, r: a.references };
}

export function expandLite(l: LiteAlert): PublicAlert {
  const msg = { identifier: l.n, sender: DEMO_ISSUER.id, sent: l.t, status: l.st, msgType: (l.r?.length ? 'Update' : 'Alert') as 'Update' | 'Alert', references: l.r, level: l.l, hazard: l.h, areas: l.a, instructions: l.s, expires: l.x };
  return { id: l.i, identifier: l.n, status: l.st, issuer: DEMO_ISSUER, level: l.l, hazard: l.h, areas: l.a, instructions: l.s, texts: renderAll(msg), issuedAt: l.t, updatedAt: l.u, expires: l.x, publicState: l.p, references: l.r };
}

export interface LiteFeed {
  g: string;
  e: 'EXERCISE';
  k: string; // publisher key id
  alerts: SignedEnvelope<LiteAlert>[];
}

export function verifyLiteAlert(env: SignedEnvelope<LiteAlert>, publisherPublicKeyHex: string): boolean {
  return env.payload.st === 'Exercise' && verifySignature(env, publisherPublicKeyHex);
}
