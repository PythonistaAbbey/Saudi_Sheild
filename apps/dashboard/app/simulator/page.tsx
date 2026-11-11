'use client';

import Link from 'next/link';
import { FastForward, FlaskConical, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { can, type LocalizedText } from '@saudi-shield/core';
import { Shell } from '@/components/Shell';
import { Card, LevelChip, StateBadge, VerifyChip, useToast } from '@/components/ui';
import { post, useLive, type Session } from '@/lib/api';
import type { AlertSummary } from '@/lib/types';

interface ScenarioDto {
  id: string;
  title: LocalizedText & { en: string };
  summary: LocalizedText & { en: string };
  steps: { id: string; kind: string; label: LocalizedText & { en: string }; expect: string }[];
}

const EXPECT: Record<string, string> = {
  publishable: 'Expected: can be reviewed and published',
  quarantined: 'Expected: quarantined at ingest',
  blocked_by_checker: 'Expected: approval blocked by content checks',
};

function Simulator({ session }: { session: Session }) {
  const { data: scenarios } = useLive<ScenarioDto[]>('/api/simulator/scenarios', 60000);
  const { data: alerts, reload } = useLive<AlertSummary[]>('/api/alerts', 2500);
  const [runs, setRuns] = useState<Record<string, { runId: string; alerts: Record<string, string> }>>({});
  const toast = useToast();
  const allowed = can(session.user, 'simulator.run');
  const byId = new Map((alerts ?? []).map((a) => [a.id, a]));

  async function send(sc: ScenarioDto, stepId: string) {
    try {
      const run = runs[sc.id];
      const res = await post<{ runId: string; alert: AlertSummary }>('/api/simulator/run', { scenarioId: sc.id, stepId, runId: run?.runId });
      setRuns((r) => ({ ...r, [sc.id]: { runId: res.runId, alerts: { ...(r[sc.id]?.alerts ?? {}), [stepId]: res.alert.id } } }));
      toast.show(`Issuer message received: ${res.alert.state}`);
      reload();
    } catch (e) {
      toast.show((e as Error).message, true);
    }
  }

  async function advance(id: string) {
    try {
      const r = await post<{ state: string }>(`/api/simulator/advance/${id}`);
      toast.show(`Autopilot: now ${r.state}`);
      reload();
    } catch (e) {
      toast.show((e as Error).message, true);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="notice ai">
        <FlaskConical size={18} style={{ flex: 'none' }} />
        <div>
          <strong>Exercise simulator.</strong> A fictional issuer signs messages with a published demo key and sends them to the ingest endpoint, exactly as an
          authorised issuer would. You can then work each message by hand in the alert workspace (sign in as different roles), or use <em>Autopilot</em>, which
          performs the next step as fictional staff under the same rules. Nothing here is real.
        </div>
      </div>
      {!allowed && <div className="notice warning">Your role can watch scenarios but not run them. Sign in as an operator or administrator.</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {allowed && (
          <button
            className="btn"
            onClick={async () => {
              await post('/api/simulator/reset', { seed: true });
              setRuns({});
              toast.show('Demo data reset.');
              reload();
            }}
          >
            <RotateCcw size={15} /> Reset demo data
          </button>
        )}
      </div>
      <div className="grid g-2">
        {(scenarios ?? []).map((sc) => {
          const run = runs[sc.id];
          return (
            <Card key={sc.id} title={sc.title.en} sub={run ? `Run ${run.runId}` : undefined}>
              <p className="muted" style={{ marginTop: 0 }}>
                {sc.summary.en}
              </p>
              <ol className="step-list">
                {sc.steps.map((st, i) => {
                  const alertId = run?.alerts[st.id];
                  const a = alertId ? byId.get(alertId) : undefined;
                  const canAdvance = a && ['VERIFIED', 'IN_REVIEW', 'APPROVED'].includes(a.state);
                  return (
                    <li key={st.id} className={`step ${a ? 'done' : ''}`}>
                      <span className="num">{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{st.label.en}</div>
                        <div className="small faint">{EXPECT[st.expect]}</div>
                        {a && (
                          <div className="row wrap" style={{ marginTop: 6 }}>
                            <StateBadge state={a.state} />
                            <LevelChip level={a.level} />
                            <VerifyChip ok={a.verification.ok} code={a.verification.code} />
                            {a.blocking > 0 && <span className="chip bad">{a.blocking} blocking</span>}
                            <Link href={`/alerts/${a.id}`} className="small" style={{ textDecoration: 'underline' }}>
                              Open workspace
                            </Link>
                          </div>
                        )}
                      </div>
                      {allowed && !a && (
                        <button className="btn sm primary" onClick={() => send(sc, st.id)}>
                          <Play size={13} /> Send
                        </button>
                      )}
                      {allowed && canAdvance && (
                        <button className="btn sm" onClick={() => advance(a.id)} title="Perform the next step as fictional staff">
                          <FastForward size={13} /> Autopilot
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          );
        })}
      </div>
      {toast.node}
    </div>
  );
}

export default function SimulatorPage() {
  return <Shell title="Exercise simulator">{(s) => <Simulator session={s} />}</Shell>;
}
