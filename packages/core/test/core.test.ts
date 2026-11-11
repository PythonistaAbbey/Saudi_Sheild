import { describe, expect, it } from 'vitest';
import {
  AuditLog,
  DEMO_ISSUER_KEY,
  DEMO_USERS,
  Platform,
  RuleBasedAssist,
  SCENARIOS,
  WorkflowError,
  areasContaining,
  can,
  checkContent,
  cityByCode,
  demoRegistry,
  envelopeForStep,
  findForbiddenFields,
  hasBlocking,
  renderText,
  sign,
  verifyChain,
  verifyPublicAlert,
  assertExerciseOnly,
  SafetyBoundaryError,
  checkIn,
  demoFamily,
  setPaused,
  visibleStatus,
  leave,
  type IssuerMessage,
} from '../src';

const user = (id: string) => DEMO_USERS.find((u) => u.id === id)!;
const OP = user('u-op-1');
const OP2 = user('u-op-2');
const AP = user('u-ap-1');
const AP2 = user('u-ap-2');
const PB = user('u-pb-1');
const ADMIN = user('u-ad-1');
const VIEWER = user('u-vw-1');

function fixedClock(start = '2026-11-11T10:00:00Z') {
  let t = new Date(start).getTime();
  return { now: () => new Date(t), advance: (min: number) => (t += min * 60_000) };
}

function baseMsg(over: Partial<IssuerMessage> = {}): IssuerMessage {
  return {
    identifier: 'EX-T-1',
    sender: 'DEMO-ISSUER',
    sent: '2026-11-11T10:00:00Z',
    status: 'Exercise',
    msgType: 'Alert',
    level: 'red',
    hazard: 'aerial_threat',
    areas: ['EX-RIY-A'],
    instructions: ['SHELTER_INTERIOR_ROOM', 'FOLLOW_OFFICIAL_CHANNELS'],
    expires: '2026-11-11T11:30:00Z',
    ...over,
  };
}

function runToPublished(p: Platform, env = sign(baseMsg(), DEMO_ISSUER_KEY)) {
  const r = p.ingest(env);
  p.prepare(r.id, OP);
  p.approve(r.id, AP);
  return p.publish(r.id, PB);
}

describe('signature verification', () => {
  it('verifies a genuine demo-issuer message', () => {
    const reg = demoRegistry();
    const res = reg.verify(sign(baseMsg(), DEMO_ISSUER_KEY), new Date('2026-11-11T10:00:00Z'));
    expect(res.ok).toBe(true);
    expect(res.code).toBe('OK');
    expect(res.payloadSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('detects tampering', () => {
    const env = sign(baseMsg({ level: 'yellow' }), DEMO_ISSUER_KEY);
    const tampered = { ...env, payload: { ...env.payload, level: 'red' as const } };
    expect(demoRegistry().verify(tampered, new Date('2026-11-11T10:00:00Z')).code).toBe('BAD_SIGNATURE');
  });

  it('rejects unknown, revoked and expired keys, and issuer mismatch', () => {
    const now = new Date('2026-11-11T10:00:00Z');
    const reg = demoRegistry();
    const sc = SCENARIOS.find((s) => s.id === 'integrity-failures')!;
    expect(reg.verify(envelopeForStep(sc.steps[1], now, 'r'), now).code).toBe('UNKNOWN_KEY');
    expect(reg.verify(sign(baseMsg({ sender: 'SOMEONE-ELSE' }), DEMO_ISSUER_KEY), now).code).toBe('ISSUER_MISMATCH');
    expect(reg.verify(sign(baseMsg(), DEMO_ISSUER_KEY), new Date('2028-06-01T00:00:00Z')).code).toBe('KEY_EXPIRED');
    reg.revoke(DEMO_ISSUER_KEY.keyId, '2026-11-01T00:00:00Z');
    expect(reg.verify(sign(baseMsg(), DEMO_ISSUER_KEY), now).code).toBe('KEY_REVOKED');
  });

  it('rejects messages dated too far in the future', () => {
    const env = sign(baseMsg({ sent: '2026-11-11T11:00:00Z' }), DEMO_ISSUER_KEY);
    expect(demoRegistry().verify(env, new Date('2026-11-11T10:00:00Z')).code).toBe('CLOCK_SKEW');
  });
});

describe('safety boundaries', () => {
  it('refuses non-Exercise status', () => {
    expect(() => assertExerciseOnly({ status: 'Actual' })).toThrow(SafetyBoundaryError);
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = p.ingest(sign(baseMsg({ status: 'Actual' }), DEMO_ISSUER_KEY));
    expect(r.state).toBe('QUARANTINED');
    expect(() => p.prepare(r.id, OP)).toThrow(WorkflowError);
  });

  it('quarantines payloads carrying tracking or targeting fields and does not retain them', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const payload = { ...baseMsg(), trajectory: [[1, 2]], impactPoint: { lat: 1, lon: 2 } } as unknown as IssuerMessage;
    expect(findForbiddenFields(payload)).toEqual(['trajectory', 'impactPoint']);
    const r = p.ingest(sign(payload, DEMO_ISSUER_KEY));
    expect(r.state).toBe('QUARANTINED');
    expect(JSON.stringify(r)).not.toContain('trajectory');
    expect(JSON.stringify(r)).not.toContain('impactPoint');
  });

  it('blocks speculative wording in public notes', () => {
    const f = checkContent(baseMsg({ note: { en: 'Debris may fall near the north.', ar: 'سقوط متوقع لحطام.' } }), new Date('2026-11-11T10:00:00Z'));
    expect(f.find((x) => x.code === 'SPECULATIVE_LANGUAGE')?.severity).toBe('blocking');
  });

  it('blocks shelter/evacuate conflicts and Arabic/English number mismatches', () => {
    const now = new Date('2026-11-11T10:00:00Z');
    expect(checkContent(baseMsg({ note: { en: 'Evacuate now.', ar: 'إخلاء الآن.' } }), now).map((x) => x.code)).toContain('SHELTER_EVACUATE_CONFLICT');
    expect(checkContent(baseMsg({ note: { en: 'Until 14:00.', ar: 'حتى ١٥:٠٠.' } }), now).map((x) => x.code)).toContain('NUMBER_MISMATCH');
    expect(checkContent(baseMsg({ note: { en: 'Until 14:00.', ar: 'حتى ١٤:٠٠.' } }), now).map((x) => x.code)).not.toContain('NUMBER_MISMATCH');
  });

  it('blocks a White message that still tells people to shelter', () => {
    const f = checkContent(baseMsg({ level: 'white', instructions: ['SHELTER_INTERIOR_ROOM'] }), new Date('2026-11-11T10:00:00Z'));
    expect(hasBlocking(f)).toBe(true);
  });
});

describe('roles and workflow', () => {
  it('maps permissions to roles', () => {
    expect(can(OP, 'alerts.prepare')).toBe(true);
    expect(can(OP, 'alerts.publish')).toBe(false);
    expect(can(AP, 'alerts.approve')).toBe(true);
    expect(can(ADMIN, 'alerts.publish')).toBe(false);
    expect(can(ADMIN, 'alerts.approve')).toBe(false);
    expect(can(VIEWER, 'alerts.prepare')).toBe(false);
  });

  it('runs the happy path: received → verified → in review → approved → published', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const rec = runToPublished(p);
    expect(rec.state).toBe('PUBLISHED');
    expect(rec.history.map((h) => h.state)).toEqual(['RECEIVED', 'VERIFIED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED']);
    expect(rec.preparedBy).toBe(OP.id);
    expect(rec.approvedBy).toBe(AP.id);
  });

  it('prevents unauthorised publication', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = p.ingest(sign(baseMsg(), DEMO_ISSUER_KEY));
    expect(() => p.publish(r.id, PB)).toThrow(/expected APPROVED/);
    p.prepare(r.id, OP);
    expect(() => p.publish(r.id, PB)).toThrow(/expected APPROVED/);
    expect(() => p.approve(r.id, OP2)).toThrow(/lacks permission/);
    p.approve(r.id, AP);
    expect(() => p.publish(r.id, OP)).toThrow(/lacks permission/);
    expect(() => p.publish(r.id, AP)).toThrow(/lacks permission/);
    expect(() => p.publish(r.id, ADMIN)).toThrow(/lacks permission/);
    expect(p.publish(r.id, PB).state).toBe('PUBLISHED');
  });

  it('enforces the two-person rule', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = p.ingest(sign(baseMsg(), DEMO_ISSUER_KEY));
    const dual = { id: 'u-dual', name: 'Dual role', roles: ['operator', 'approver'] as const };
    p.prepare(r.id, { ...dual, roles: [...dual.roles] });
    expect(() => p.approve(r.id, { ...dual, roles: [...dual.roles] })).toThrow(/different person/);
  });

  it('never lets a quarantined message be prepared, approved or published', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const sc = SCENARIOS.find((s) => s.id === 'integrity-failures')!;
    const r = p.ingest(envelopeForStep(sc.steps[0], c.now(), 'x'));
    expect(r.state).toBe('QUARANTINED');
    expect(r.verification.code).toBe('BAD_SIGNATURE');
    expect(() => p.prepare(r.id, OP)).toThrow();
    expect(() => p.approve(r.id, AP)).toThrow();
    expect(() => p.publish(r.id, PB)).toThrow();
    expect(p.publicFeed().alerts).toHaveLength(0);
  });

  it('rejects replays of the same identifier', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const env = sign(baseMsg(), DEMO_ISSUER_KEY);
    expect(p.ingest(env).state).toBe('VERIFIED');
    c.advance(1);
    expect(p.ingest(env).state).toBe('QUARANTINED');
  });

  it('blocks approval while blocking findings remain', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = p.ingest(sign(baseMsg({ note: { en: 'Residents should evacuate the area.', ar: 'على السكان إخلاء المنطقة.' } }), DEMO_ISSUER_KEY));
    p.prepare(r.id, OP);
    expect(() => p.approve(r.id, AP)).toThrow(/blocking findings/);
  });

  it('clears an alert when the issuer sends a referenced White message', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const first = runToPublished(p);
    c.advance(10);
    const white = sign(
      baseMsg({ identifier: 'EX-T-2', msgType: 'Update', references: ['EX-T-1'], level: 'white', instructions: ['RESUME_WITH_CAUTION'], sent: c.now().toISOString() }),
      DEMO_ISSUER_KEY,
    );
    const w = runToPublished(p, white);
    expect(w.supersedes).toBe(first.id);
    expect(p.get(first.id)!.state).toBe('CLEARED');
    const feed = p.publicFeed();
    expect(feed.alerts.map((a) => a.payload.publicState).sort()).toEqual(['cleared', 'cleared']);
  });

  it('requires two different people to retract a published alert', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = runToPublished(p);
    expect(() => p.confirmRetraction(r.id, PB)).toThrow(/No retraction/);
    expect(() => p.requestRetraction(r.id, PB, 'error')).toThrow(/Only an approver/);
    p.requestRetraction(r.id, AP2, 'Issued in error');
    expect(() => p.confirmRetraction(r.id, AP2)).toThrow(/different person/);
    expect(p.confirmRetraction(r.id, PB).state).toBe('CANCELLED');
  });

  it('expires published alerts when validity ends', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = runToPublished(p);
    c.advance(120);
    expect(p.get(r.id)!.state).toBe('EXPIRED');
  });
});

describe('audit chain', () => {
  it('records every action and detects tampering', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    runToPublished(p);
    const actions = p.audit.list().map((e) => e.action);
    expect(actions).toEqual(['platform.start', 'inbound.verified', 'alert.prepared', 'alert.approved', 'alert.published']);
    expect(verifyChain(p.audit.list()).ok).toBe(true);
    p.audit._unsafeMutate(3, { actor: 'someone-else' });
    expect(verifyChain(p.audit.list())).toMatchObject({ ok: false, firstBrokenSeq: 3 });
  });

  it('detects deleted entries', () => {
    const log = new AuditLog();
    for (let i = 0; i < 4; i++) log.append({ at: 't', actor: 'a', action: `x${i}` });
    const events = [...log.list()];
    events.splice(1, 1);
    expect(verifyChain(events).ok).toBe(false);
  });
});

describe('AI assist guardrails', () => {
  it('labels every suggestion as an AI draft and never changes structured fields', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = p.ingest(sign(baseMsg(), DEMO_ISSUER_KEY));
    const before = JSON.stringify(r.message);
    const prepared = p.prepare(r.id, OP);
    expect(prepared.suggestions.length).toBeGreaterThan(0);
    expect(prepared.suggestions.every((s) => s.aiDraft === true)).toBe(true);
    expect(JSON.stringify(prepared.message)).toBe(before);
  });

  it('only translates notes from the approved phrasebook, otherwise asks for a human translator', () => {
    const a = new RuleBasedAssist();
    const ok = a.translateNote(baseMsg({ note: { en: 'This is a scheduled exercise. Further updates will follow.' } }), 'ar');
    expect(ok.suggestion?.text).toBe('هذا تمرين مجدول. ستصدر تحديثات لاحقة.');
    const unknown = a.translateNote(baseMsg({ note: { en: 'Something unusual happened.' } }), 'ar');
    expect(unknown.suggestion).toBeUndefined();
    expect(unknown.finding?.code).toBe('NEEDS_HUMAN_TRANSLATOR');
  });

  it('accepting a phrasebook translation resolves the missing-translation finding', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    const r = p.ingest(sign(baseMsg({ note: { en: 'This is a scheduled exercise.' } }), DEMO_ISSUER_KEY));
    const prep = p.prepare(r.id, OP);
    expect(prep.findings.map((f) => f.code)).toContain('NOTE_MISSING_TRANSLATION');
    const idx = prep.suggestions.findIndex((s) => s.kind === 'note_translation');
    const acc = p.acceptSuggestion(r.id, OP, idx);
    expect(acc.message.note?.ar).toBe('هذا تمرين مجدول.');
    expect(hasBlocking(acc.findings)).toBe(false);
    expect(p.approve(r.id, AP).state).toBe('APPROVED');
  });
});

describe('templates, geography and public feed', () => {
  it('renders Arabic and English from the same structured fields', () => {
    const en = renderText(baseMsg(), 'en');
    const ar = renderText(baseMsg(), 'ar');
    expect(en.headline).toBe('Red alert: Aerial threat. Take protective action now');
    expect(ar.headline).toContain('إنذار أحمر');
    expect(en.steps).toHaveLength(2);
    expect(ar.steps).toHaveLength(2);
  });

  it('finds the exercise zone for a city on the device', () => {
    const riyadh = cityByCode('RIY-RIYADH')!.city.lonLat;
    expect(areasContaining(riyadh).map((a) => a.code)).toEqual(['EX-RIY-A']);
    expect(areasContaining([45, 20])).toEqual([]);
  });

  it('signs the public feed so clients can verify it', () => {
    const c = fixedClock();
    const p = new Platform(c.now);
    runToPublished(p);
    const feed = p.publicFeed();
    expect(feed.environment).toBe('EXERCISE');
    const key = p.publisherPublicKey().publicKeyHex;
    expect(verifyPublicAlert(feed.alerts[0], key)).toBe(true);
    const forged = { ...feed.alerts[0], payload: { ...feed.alerts[0].payload, level: 'yellow' as const } };
    expect(verifyPublicAlert(forged, key)).toBe(false);
  });
});

describe('scenarios', () => {
  it('every scenario step behaves as documented', () => {
    for (const sc of SCENARIOS) {
      const c = fixedClock();
      const p = new Platform(c.now);
      const run = 'T';
      for (const step of sc.steps) {
        const r = p.runStep(sc.id, step.id, run, 'test');
        if (step.expect === 'quarantined') {
          expect(r.state, `${sc.id}/${step.id}`).toBe('QUARANTINED');
          continue;
        }
        expect(r.state, `${sc.id}/${step.id}`).toBe('VERIFIED');
        let prep = p.prepare(r.id, OP);
        const tIdx = prep.suggestions.findIndex((s) => s.kind === 'note_translation');
        if (tIdx >= 0) prep = p.acceptSuggestion(r.id, OP, tIdx);
        if (step.expect === 'blocked_by_checker') {
          expect(() => p.approve(r.id, AP), `${sc.id}/${step.id}`).toThrow(/blocking/);
          continue;
        }
        p.approve(r.id, AP);
        expect(p.publish(r.id, PB).state).toBe('PUBLISHED');
        c.advance(5);
      }
      expect(p.audit.list().length).toBeGreaterThan(1);
    }
  });

  it('all scenario messages are Exercise status', () => {
    for (const sc of SCENARIOS) for (const st of sc.steps) expect(st.build(new Date(), 'r').status).toBe('Exercise');
  });
});

describe('family check-ins', () => {
  it('shares only status and time, respects pause and leave, and expires', () => {
    const now = new Date('2026-11-11T10:00:00Z');
    let fam = demoFamily(now);
    fam = checkIn(fam, 'me', 'safe', now);
    const me = fam.members.find((m) => m.id === 'me')!;
    expect(Object.keys(me.lastCheckIn!)).toEqual(['status', 'at']);
    expect(visibleStatus(me, now)).toBe('safe');
    fam = setPaused(fam, 'me', true);
    expect(visibleStatus(fam.members.find((m) => m.id === 'me')!, now)).toBe('paused');
    expect(fam.members.find((m) => m.id === 'me')!.lastCheckIn).toBeUndefined();
    fam = setPaused(fam, 'me', false);
    fam = checkIn(fam, 'me', 'need_help', now);
    expect(visibleStatus(fam.members.find((m) => m.id === 'me')!, new Date(now.getTime() + 73 * 3600_000))).toBe('no_update');
    fam = leave(fam, 'me');
    expect(fam.members.find((m) => m.id === 'me')).toBeUndefined();
  });
});
