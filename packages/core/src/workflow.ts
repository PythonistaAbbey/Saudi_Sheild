import { checkContent, hasBlocking } from './assist/checker';
import type { AssistProvider } from './assist/provider';
import { KeyRegistry, sha256Hex, canonicalJson } from './crypto';
import { can, type Actor, type Permission } from './rbac';
import { findForbiddenFields } from './safety';
import { renderAll } from './templates';
import type { AlertRecord, AlertState, Finding, IssuerMessage, SignedEnvelope, VerificationResult } from './types';

export class WorkflowError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

function need(actor: Actor, perm: Permission) {
  if (!can(actor, perm)) throw new WorkflowError('FORBIDDEN', `${actor.name} lacks permission ${perm}.`);
}

function needState(rec: AlertRecord, ...states: AlertState[]) {
  if (!states.includes(rec.state))
    throw new WorkflowError('INVALID_STATE', `Alert is ${rec.state}; expected ${states.join(' or ')}.`);
}

function move(rec: AlertRecord, state: AlertState, by: string, at: Date, note?: string): AlertRecord {
  return { ...rec, state, history: [...rec.history, { state, at: at.toISOString(), by, note }] };
}

/**
 * Ingest a signed issuer envelope. Never throws for bad input: problems lead to QUARANTINED.
 */
export function ingest(env: SignedEnvelope, registry: KeyRegistry, now: Date, existing: readonly AlertRecord[]): AlertRecord {
  const id = `al-${sha256Hex(canonicalJson(env ?? null) + now.toISOString()).slice(0, 10)}`;
  let verification: VerificationResult = registry.verify(env, now);
  let quarantineReason: string | undefined;

  const forbidden = findForbiddenFields(env?.payload);
  if (forbidden.length) quarantineReason = `Safety boundary: ${forbidden.length} forbidden military/tracking field(s) present; payload discarded`;
  else if (!verification.ok) quarantineReason = `Verification failed: ${verification.code}`;
  else if (env.payload.status !== 'Exercise') quarantineReason = `Safety boundary: CAP status "${env.payload.status}" refused in prototype`;
  else if (existing.some((r) => r.message.sender === env.payload.sender && r.message.identifier === env.payload.identifier && r.state !== 'QUARANTINED'))
    quarantineReason = 'Replay: identifier already received from this issuer';

  const msg = env?.payload as IssuerMessage;
  const safeMsg: IssuerMessage = quarantineReason && forbidden.length
    ? // do not retain forbidden data, keep only harmless identifying fields
      { identifier: String(msg?.identifier ?? ''), sender: String(msg?.sender ?? ''), sent: String(msg?.sent ?? now.toISOString()), status: 'Exercise', msgType: 'Alert', level: 'yellow', hazard: 'aerial_threat', areas: [], instructions: [], expires: now.toISOString() }
    : msg;

  let texts;
  try {
    if (forbidden.length) throw new Error('discarded');
    texts = renderAll(safeMsg);
  } catch {
    texts = { ar: { headline: '', body: '', steps: [] }, en: { headline: '', body: '', steps: [] } };
    if (!quarantineReason) {
      quarantineReason = 'Malformed message';
      verification = { ...verification, ok: false, code: 'MALFORMED' };
    }
  }

  const referenced = safeMsg.references?.length
    ? existing.find((r) => r.message.sender === safeMsg.sender && safeMsg.references!.includes(r.message.identifier) && r.state !== 'QUARANTINED')
    : undefined;

  const base: AlertRecord = {
    id,
    envelope: forbidden.length ? { ...env, payload: safeMsg } : env,
    message: safeMsg,
    verification,
    state: 'RECEIVED',
    texts,
    suggestions: [],
    findings: quarantineReason ? [] : checkContent(safeMsg, now, { hasPreviousAlert: !!referenced }),
    supersedes: referenced?.id,
    history: [{ state: 'RECEIVED', at: now.toISOString(), by: 'system:ingest' }],
  };
  return quarantineReason ? move(base, 'QUARANTINED', 'system:verify', now, quarantineReason) : move(base, 'VERIFIED', 'system:verify', now);
}

/** Operator prepares the alert: AI drafts are attached for human review. */
export function prepare(rec: AlertRecord, actor: Actor, now: Date, assist: AssistProvider): AlertRecord {
  need(actor, 'alerts.prepare');
  needState(rec, 'VERIFIED');
  const suggestions = [
    assist.plainLanguage(rec.message, 'ar'),
    assist.plainLanguage(rec.message, 'en'),
    assist.shortForm(rec.message, 'ar'),
    assist.shortForm(rec.message, 'en'),
    assist.screenReader(rec.message, 'ar'),
    assist.screenReader(rec.message, 'en'),
  ];
  const findings: Finding[] = [...checkContent(rec.message, now, { hasPreviousAlert: !!rec.supersedes })];
  for (const to of ['ar', 'en'] as const) {
    if (rec.message.note && !rec.message.note[to]) {
      const r = assist.translateNote(rec.message, to);
      if (r.suggestion) suggestions.push(r.suggestion);
      if (r.finding) findings.push(r.finding);
    }
  }
  return { ...move(rec, 'IN_REVIEW', actor.id, now), preparedBy: actor.id, suggestions, findings };
}

/** Operator accepts an AI draft (it stays labelled as AI-drafted, now human-accepted). */
export function acceptSuggestion(rec: AlertRecord, actor: Actor, index: number, now: Date): AlertRecord {
  need(actor, 'alerts.prepare');
  needState(rec, 'IN_REVIEW');
  const s = rec.suggestions[index];
  if (!s) throw new WorkflowError('NOT_FOUND', 'No such suggestion.');
  const suggestions = rec.suggestions.map((x, i) => (i === index ? { ...x, accepted: { by: actor.id, at: now.toISOString() } } : x));
  let message = rec.message;
  let findings = rec.findings;
  if (s.kind === 'note_translation') {
    // An accepted note translation fills the missing language and resolves the finding.
    message = { ...message, note: { ...message.note, [s.lang]: s.text } };
    findings = checkContent(message, now, { hasPreviousAlert: !!rec.supersedes });
  }
  return { ...rec, suggestions, message, findings };
}

export function approve(rec: AlertRecord, actor: Actor, now: Date): AlertRecord {
  need(actor, 'alerts.approve');
  needState(rec, 'IN_REVIEW');
  if (actor.id === rec.preparedBy) throw new WorkflowError('TWO_PERSON_RULE', 'The approver must be a different person from the preparer.');
  if (hasBlocking(rec.findings)) throw new WorkflowError('BLOCKING_FINDINGS', 'Resolve blocking findings before approval.');
  return { ...move(rec, 'APPROVED', actor.id, now), approvedBy: actor.id };
}

export function reject(rec: AlertRecord, actor: Actor, now: Date, reason: string): AlertRecord {
  need(actor, 'alerts.reject');
  needState(rec, 'IN_REVIEW', 'APPROVED');
  return move(rec, 'REJECTED', actor.id, now, reason);
}

export function publish(rec: AlertRecord, actor: Actor, now: Date): AlertRecord {
  need(actor, 'alerts.publish');
  needState(rec, 'APPROVED');
  if (!rec.verification.ok) throw new WorkflowError('UNVERIFIED', 'Signature is not verified.');
  if (rec.message.status !== 'Exercise') throw new WorkflowError('SAFETY_BOUNDARY', 'Prototype publishes Exercise messages only.');
  if (actor.id === rec.preparedBy || actor.id === rec.approvedBy)
    throw new WorkflowError('TWO_PERSON_RULE', 'The publisher must be different from the preparer and approver.');
  if (new Date(rec.message.expires) <= now) throw new WorkflowError('EXPIRED', 'Message has expired.');
  const findings = checkContent(rec.message, now, { hasPreviousAlert: !!rec.supersedes });
  if (hasBlocking(findings)) throw new WorkflowError('BLOCKING_FINDINGS', 'Content check failed at publication time.');
  return { ...move(rec, 'PUBLISHED', actor.id, now), publishedBy: actor.id, publishedAt: now.toISOString() };
}

/** First approver requests retraction of a published alert (e.g. issued in error). */
export function requestRetraction(rec: AlertRecord, actor: Actor, now: Date, reason: string): AlertRecord {
  need(actor, 'alerts.cancel');
  needState(rec, 'PUBLISHED');
  if (!actor.roles.includes('approver')) throw new WorkflowError('FORBIDDEN', 'Only an approver can request a retraction.');
  return { ...rec, retraction: { requestedBy: actor.id, reason, at: now.toISOString() } };
}

/** A second person (publisher) confirms the retraction. */
export function confirmRetraction(rec: AlertRecord, actor: Actor, now: Date): AlertRecord {
  need(actor, 'alerts.cancel');
  needState(rec, 'PUBLISHED');
  if (!rec.retraction) throw new WorkflowError('NO_REQUEST', 'No retraction has been requested.');
  if (rec.retraction.requestedBy === actor.id) throw new WorkflowError('TWO_PERSON_RULE', 'A different person must confirm the retraction.');
  return { ...move(rec, 'CANCELLED', actor.id, now, rec.retraction.reason), closedAt: now.toISOString() };
}

export function expireIfDue(rec: AlertRecord, now: Date): AlertRecord {
  if (rec.state === 'PUBLISHED' && !rec.supersededBy && new Date(rec.message.expires) <= now) {
    return { ...move(rec, 'EXPIRED', 'system:clock', now), closedAt: now.toISOString() };
  }
  return rec;
}
