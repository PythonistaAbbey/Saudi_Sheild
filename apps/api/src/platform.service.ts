import { Injectable } from '@nestjs/common';
import { DEMO_USERS, Platform, SCENARIOS, type Actor } from '@saudi-shield/core';

/**
 * Holds the in-memory platform. In a target deployment this is replaced by
 * repositories over PostgreSQL + PostGIS (see db/schema.sql) and a message queue.
 */
@Injectable()
export class PlatformService {
  private offsetMs = 0;
  platform: Platform;

  constructor() {
    this.reset(process.env.SEED !== '0');
  }

  private clock = () => new Date(Date.now() + this.offsetMs);

  reset(seed = true) {
    this.offsetMs = 0;
    this.platform = new Platform(this.clock);
    if (seed) this.seed();
  }

  user(id: string): Actor | undefined {
    return DEMO_USERS.find((u) => u.id === id);
  }

  /** Seed a believable recent history (all fictional) by running scenarios in the past. */
  private seed() {
    const p = this.platform;
    const OP = this.user('u-op-1')!;
    const AP = this.user('u-ap-1')!;
    const PB = this.user('u-pb-1')!;
    const at = (minAgo: number) => (this.offsetMs = -minAgo * 60_000);
    const full = (scenario: string, step: string, run: string) => {
      const r = p.runStep(scenario, step, run, 'seed');
      if (r.state !== 'VERIFIED') return r;
      let prep = p.prepare(r.id, OP);
      const t = prep.suggestions.findIndex((s) => s.kind === 'note_translation');
      if (t >= 0) prep = p.acceptSuggestion(r.id, OP, t);
      const plain = prep.suggestions.map((s, i) => (s.kind === 'plain_language' ? i : -1)).filter((i) => i >= 0);
      for (const i of plain) p.acceptSuggestion(r.id, OP, i);
      p.approve(r.id, AP);
      return p.publish(r.id, PB);
    };

    const floodRun = 'SEED01';
    at(150);
    full('flood-south', 'red', floodRun);
    at(95);
    full('flood-south', 'white', floodRun);

    const sandRun = 'SEED02';
    at(70);
    full('sandstorm-east', 'yellow', sandRun);

    at(40);
    p.runStep('integrity-failures', 'tampered', 'SEED03', 'seed');

    const unclear = 'SEED04';
    at(25);
    const c = p.runStep('unclear-content', 'conflict', unclear, 'seed');
    p.prepare(c.id, this.user('u-op-2')!);

    this.offsetMs = 0;
  }

  scenarios() {
    return SCENARIOS.map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      steps: s.steps.map((st) => ({ id: st.id, kind: st.kind, label: st.label, expect: st.expect })),
    }));
  }
}
