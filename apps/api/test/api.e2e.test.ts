import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DEMO_ISSUER_KEY, sign, verifyPublicAlert, type IssuerMessage } from '@saudi-shield/core';
// Tests run against the compiled output so Nest's decorator metadata is present.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../dist/main');

type App = Awaited<ReturnType<typeof createApp>>;
let app: App;
let http: ReturnType<App['getHttpServer']>;
const tokens: Record<string, string> = {};

async function login(userId: string) {
  const res = await request(http).post('/api/auth/login').send({ userId }).expect(201);
  tokens[userId] = res.body.token;
}
const as = (u: string) => ({ Authorization: `Bearer ${tokens[u]}` });

function msg(identifier: string, over: Partial<IssuerMessage> = {}): IssuerMessage {
  const now = Date.now();
  return {
    identifier,
    sender: 'DEMO-ISSUER',
    sent: new Date(now).toISOString(),
    status: 'Exercise',
    msgType: 'Alert',
    level: 'red',
    hazard: 'aerial_threat',
    areas: ['EX-MDN-A'],
    instructions: ['SHELTER_INTERIOR_ROOM', 'FOLLOW_OFFICIAL_CHANNELS'],
    expires: new Date(now + 60 * 60_000).toISOString(),
    ...over,
  };
}

beforeAll(async () => {
  process.env.SEED = '0';
  app = await createApp();
  await app.init();
  http = app.getHttpServer();
  for (const u of ['u-op-1', 'u-ap-1', 'u-pb-1', 'u-au-1', 'u-ad-1', 'u-vw-1']) await login(u);
});
afterAll(async () => app?.close());

describe('authentication and access control', () => {
  it('requires a session for operational endpoints', async () => {
    await request(http).get('/api/alerts').expect(401);
    await request(http).get('/api/alerts').set({ Authorization: 'Bearer forged.123.abc' }).expect(401);
  });

  it('rejects unknown demo users', async () => {
    await request(http).post('/api/auth/login').send({ userId: 'nobody' }).expect(400);
  });

  it('limits the audit log to auditors and admins', async () => {
    await request(http).get('/api/audit').set(as('u-op-1')).expect(403);
    await request(http).get('/api/audit').set(as('u-vw-1')).expect(403);
    const res = await request(http).get('/api/audit').set(as('u-au-1')).expect(200);
    expect(res.body.verification.ok).toBe(true);
    expect(res.body.events.some((e: { action: string }) => e.action === 'access.denied')).toBe(true);
  });
});

describe('end-to-end alert journey', () => {
  let id: string;

  it('ingests a signed exercise message', async () => {
    const res = await request(http).post('/api/ingest').send(sign(msg('EX-E2E-1'), DEMO_ISSUER_KEY)).expect(201);
    expect(res.body.state).toBe('VERIFIED');
    id = res.body.id;
  });

  it('blocks every role except the right one at each step', async () => {
    await request(http).post(`/api/alerts/${id}/prepare`).set(as('u-ap-1')).expect(403);
    await request(http).post(`/api/alerts/${id}/prepare`).set(as('u-op-1')).expect(201);
    await request(http).post(`/api/alerts/${id}/approve`).set(as('u-op-1')).expect(403);
    await request(http).post(`/api/alerts/${id}/publish`).set(as('u-pb-1')).expect(409);
    await request(http).post(`/api/alerts/${id}/approve`).set(as('u-ap-1')).expect(201);
    await request(http).post(`/api/alerts/${id}/publish`).set(as('u-ad-1')).expect(403);
    const pub = await request(http).post(`/api/alerts/${id}/publish`).set(as('u-pb-1')).expect(201);
    expect(pub.body.state).toBe('PUBLISHED');
  });

  it('serves a signed public feed the app can verify', async () => {
    const key = (await request(http).get('/api/public/key').expect(200)).body;
    const feed = (await request(http).get('/api/public/feed').expect(200)).body;
    expect(feed.environment).toBe('EXERCISE');
    const item = feed.alerts.find((a: { payload: { id: string } }) => a.payload.id === id);
    expect(item).toBeTruthy();
    expect(verifyPublicAlert(item, key.publicKeyHex)).toBe(true);
  });

  it('clears the alert with a referenced White message', async () => {
    const white = sign(msg('EX-E2E-2', { level: 'white', msgType: 'Update', references: ['EX-E2E-1'], instructions: ['RESUME_WITH_CAUTION'] }), DEMO_ISSUER_KEY);
    const w = (await request(http).post('/api/ingest').send(white).expect(201)).body;
    await request(http).post(`/api/alerts/${w.id}/prepare`).set(as('u-op-1')).expect(201);
    await request(http).post(`/api/alerts/${w.id}/approve`).set(as('u-ap-1')).expect(201);
    await request(http).post(`/api/alerts/${w.id}/publish`).set(as('u-pb-1')).expect(201);
    const orig = (await request(http).get(`/api/alerts/${id}`).set(as('u-vw-1')).expect(200)).body;
    expect(orig.state).toBe('CLEARED');
  });
});

describe('safe failure', () => {
  it('quarantines tampered messages and keeps them out of the feed', async () => {
    const env = sign(msg('EX-E2E-3', { level: 'yellow' }), DEMO_ISSUER_KEY);
    const res = await request(http)
      .post('/api/ingest')
      .send({ ...env, payload: { ...env.payload, level: 'red' } })
      .expect(201);
    expect(res.body.state).toBe('QUARANTINED');
    expect(res.body.verification.code).toBe('BAD_SIGNATURE');
    await request(http).post(`/api/alerts/${res.body.id}/prepare`).set(as('u-op-1')).expect(409);
    const feed = (await request(http).get('/api/public/feed')).body;
    expect(feed.alerts.some((a: { payload: { id: string } }) => a.payload.id === res.body.id)).toBe(false);
  });

  it('refuses Actual (non-exercise) messages', async () => {
    const res = await request(http).post('/api/ingest').send(sign(msg('EX-E2E-4', { status: 'Actual' }), DEMO_ISSUER_KEY)).expect(201);
    expect(res.body.state).toBe('QUARANTINED');
  });

  it('handles malformed input without crashing', async () => {
    const res = await request(http).post('/api/ingest').send({ hello: 'world' }).expect(201);
    expect(res.body.state).toBe('QUARANTINED');
    expect(res.body.verification.code).toBe('MALFORMED');
  });

  it('keeps the audit chain intact after all of the above', async () => {
    const res = await request(http).get('/api/health').set(as('u-vw-1')).expect(200);
    expect(res.body.auditChain.ok).toBe(true);
  });
});

describe('simulator', () => {
  it('runs a full scenario through the autopilot', async () => {
    const s = (await request(http).post('/api/simulator/run').set(as('u-op-1')).send({ scenarioId: 'aerial-drill-riyadh', stepId: 'yellow' }).expect(201)).body;
    const id = s.alert.id;
    for (const expected of ['IN_REVIEW', 'APPROVED', 'PUBLISHED']) {
      const r = (await request(http).post(`/api/simulator/advance/${id}`).set(as('u-op-1')).expect(201)).body;
      expect(r.state).toBe(expected);
    }
  });

  it('cannot autopilot past the content checker', async () => {
    const s = (await request(http).post('/api/simulator/run').set(as('u-op-1')).send({ scenarioId: 'unclear-content', stepId: 'speculative' }).expect(201)).body;
    await request(http).post(`/api/simulator/advance/${s.alert.id}`).set(as('u-op-1')).expect(201);
    const res = await request(http).post(`/api/simulator/advance/${s.alert.id}`).set(as('u-op-1')).expect(409);
    expect(res.body.error).toBe('BLOCKING_FINDINGS');
  });

  it('is not available to viewers', async () => {
    await request(http).post('/api/simulator/run').set(as('u-vw-1')).send({ scenarioId: 'aerial-drill-riyadh', stepId: 'yellow' }).expect(403);
  });
});
