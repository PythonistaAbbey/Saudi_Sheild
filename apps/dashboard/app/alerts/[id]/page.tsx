'use client';

import { Bot, CheckCheck, FileSignature, Info, OctagonAlert, Send, ShieldCheck, Undo2, XCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { HAZARDS, INSTRUCTIONS, LEVELS, WARNING_AREAS, areaNames, can, type AssistSuggestion, type Finding } from '@saudi-shield/core';
import { Shell } from '@/components/Shell';
import { KsaMap } from '@/components/KsaMap';
import { Card, Confirm, ExerciseChip, LevelChip, StateBadge, VerifyChip, useToast } from '@/components/ui';
import { fmtTime, post, useLive, type Session } from '@/lib/api';
import type { AlertDetail } from '@/lib/types';

const PIPE = ['RECEIVED', 'VERIFIED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'];
const KIND_LABEL: Record<AssistSuggestion['kind'], string> = {
  plain_language: 'Plain-language version',
  short_form: 'Short notification text',
  screen_reader: 'Screen-reader version',
  note_translation: 'Note translation (approved phrasebook)',
  summary: 'Summary',
};

function Pipeline({ a }: { a: AlertDetail }) {
  const reached = new Set<string>(a.history.map((h) => h.state));
  const end = ['CLEARED', 'CANCELLED', 'EXPIRED', 'QUARANTINED', 'REJECTED'].find((s) => reached.has(s));
  return (
    <div className="pipeline" aria-label="Lifecycle">
      {PIPE.map((s) => (
        <span key={s} className={`pipe ${reached.has(s) ? 'on' : ''}`}>
          {s.replace('_', ' ').toLowerCase()}
        </span>
      ))}
      {end && <span className={`pipe ${['QUARANTINED', 'REJECTED', 'CANCELLED'].includes(end) ? 'bad' : 'on'}`}>{end.toLowerCase()}</span>}
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const Icon = f.severity === 'blocking' ? OctagonAlert : f.severity === 'warning' ? Info : Info;
  return (
    <div className={`notice ${f.severity}`}>
      <Icon size={16} style={{ flex: 'none', marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 600 }}>
          {f.severity === 'blocking' ? 'Blocking' : f.severity === 'warning' ? 'Warning' : 'Suggestion'} · <span className="mono">{f.code}</span>
        </div>
        <div>{f.message.en}</div>
        <div className="rtl small" style={{ marginTop: 2 }}>
          {f.message.ar}
        </div>
      </div>
    </div>
  );
}

function Workspace({ id, session }: { id: string; session: Session }) {
  const { data: a, reload } = useLive<AlertDetail>(`/api/alerts/${id}`, 4000);
  const [dialog, setDialog] = useState<null | 'publish' | 'reject' | 'retract' | 'confirmRetract'>(null);
  const [reason, setReason] = useState('');
  const toast = useToast();
  const me = session.user;

  if (!a) return <div className="muted">Loading…</div>;
  const name = (uid?: string) => (uid ? (a.actorNames[uid] ?? uid) : '—');
  const blocking = a.findings.filter((f) => f.severity === 'blocking');
  const quarantined = a.state === 'QUARANTINED';

  async function act(path: string, body?: unknown, ok?: string) {
    try {
      await post(`/api/alerts/${id}/${path}`, body);
      toast.show(ok ?? 'Done');
      setDialog(null);
      setReason('');
      reload();
    } catch (e) {
      toast.show((e as Error).message, true);
      setDialog(null);
    }
  }

  /* -------- what can this user do now? -------- */
  const actions: React.ReactNode[] = [];
  let waiting = '';
  if (a.state === 'VERIFIED') {
    if (can(me, 'alerts.prepare'))
      actions.push(
        <button key="prep" className="btn primary" onClick={() => act('prepare', undefined, 'Prepared for review. AI drafts attached.')}>
          <FileSignature size={15} /> Prepare for review
        </button>,
      );
    else waiting = 'Waiting for an operator to prepare this alert.';
  }
  if (a.state === 'IN_REVIEW') {
    if (can(me, 'alerts.approve')) {
      const self = a.preparedBy === me.id;
      actions.push(
        <button key="ap" className="btn primary" disabled={self || blocking.length > 0} onClick={() => act('approve', undefined, 'Approved. A duty publisher can now publish it.')}>
          <CheckCheck size={15} /> Approve
        </button>,
        <button key="rj" className="btn danger" onClick={() => setDialog('reject')}>
          <XCircle size={15} /> Reject
        </button>,
      );
      if (self) waiting = 'You prepared this alert, so a different approver must approve it (two-person rule).';
      else if (blocking.length) waiting = 'Approval is blocked until the issuer resolves the blocking findings.';
    } else waiting = `Prepared by ${name(a.preparedBy)}. Waiting for a different person with the Approver role.`;
  }
  if (a.state === 'APPROVED') {
    if (can(me, 'alerts.publish'))
      actions.push(
        <button key="pb" className="btn primary" onClick={() => setDialog('publish')}>
          <Send size={15} /> Publish to public feed
        </button>,
      );
    else waiting = 'Approved. Waiting for the duty publisher.';
    if (can(me, 'alerts.reject'))
      actions.push(
        <button key="rj" className="btn danger" onClick={() => setDialog('reject')}>
          <XCircle size={15} /> Withdraw approval
        </button>,
      );
  }
  if (a.state === 'PUBLISHED' && !a.supersededBy) {
    if (!a.retraction && me.roles.includes('approver'))
      actions.push(
        <button key="rr" className="btn danger" onClick={() => setDialog('retract')}>
          <Undo2 size={15} /> Request retraction
        </button>,
      );
    if (a.retraction && can(me, 'alerts.cancel') && a.retraction.requestedBy !== me.id)
      actions.push(
        <button key="cr" className="btn danger" onClick={() => setDialog('confirmRetract')}>
          <Undo2 size={15} /> Confirm retraction
        </button>,
      );
    if (!actions.length)
      waiting = a.retraction
        ? `Retraction requested by ${name(a.retraction.requestedBy)}. A second person must confirm it.`
        : 'Published. To clear it, the issuer sends a signed White (all clear) update.';
  }
  if (quarantined) waiting = 'Quarantined messages can never be prepared, approved or published.';

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card card-b" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <StateBadge state={a.state} />
        <LevelChip level={a.message.level} />
        <ExerciseChip />
        <span className="mono muted">{a.message.identifier}</span>
        <span className="small faint">{a.message.msgType}</span>
        <div style={{ marginInlineStart: 'auto' }}>
          <Pipeline a={a} />
        </div>
      </div>

      <div className="grid g-main">
        <div className="stack" style={{ gap: 16 }}>
          {quarantined ? (
            <Card title="Quarantined">
              <div className="notice blocking">
                <OctagonAlert size={16} style={{ flex: 'none', marginTop: 2 }} />
                <div>
                  <strong>This message is held and can never be published.</strong>
                  <div>{a.history[a.history.length - 1].note}</div>
                </div>
              </div>
            </Card>
          ) : (
            <section className="card">
              <div className={`levelband ${a.message.level}`}>
                <LevelChip level={a.message.level} />
                <strong>{LEVELS[a.message.level].meaning.en}</strong>
                <span className="small" style={{ marginInlineStart: 'auto' }}>
                  {HAZARDS[a.message.hazard].en} · {HAZARDS[a.message.hazard].ar}
                </span>
              </div>
              <div className="card-b">
                <div className="small muted" style={{ marginBottom: 10 }}>
                  Public text is rendered from the issuer&apos;s structured fields using pre-approved templates. Nobody, including the AI assistant, can edit it.
                </div>
                <div className="bilingual">
                  <div className="lang-col rtl" lang="ar">
                    <div className="lang-tag">العربية</div>
                    <h3>{a.texts.ar.headline}</h3>
                    <div className="muted">{a.texts.ar.body}</div>
                    <ol>
                      {a.texts.ar.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="lang-col" lang="en">
                    <div className="lang-tag">ENGLISH</div>
                    <h3>{a.texts.en.headline}</h3>
                    <div className="muted">{a.texts.en.body}</div>
                    <ol>
                      {a.texts.en.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </div>
                {a.message.note && (
                  <div style={{ marginTop: 14 }}>
                    <div className="small muted" style={{ fontWeight: 600, marginBottom: 6 }}>
                      Issuer note (free text, checked before use)
                    </div>
                    <div className="bilingual">
                      <div className="lang-col rtl">{a.message.note.ar ?? <span className="faint">لا يوجد نص عربي</span>}</div>
                      <div className="lang-col">{a.message.note.en ?? <span className="faint">No English text</span>}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {!quarantined && (
            <Card title="Content checks" sub={blocking.length ? `${blocking.length} blocking` : 'No blocking issues'}>
              <div className="stack">
                {a.findings.length === 0 && <div className="notice ok">All checks passed.</div>}
                {a.findings.map((f, i) => (
                  <FindingRow key={i} f={f} />
                ))}
              </div>
            </Card>
          )}

          {!quarantined && (
            <Card title={<span className="row"><Bot size={16} /> AI communication assistant</span>} sub="Drafts only · human review required">
              {a.suggestions.length === 0 ? (
                <div className="muted">Drafts appear when an operator prepares the alert.</div>
              ) : (
                <div className="stack">
                  <div className="notice ai small">
                    The assistant can only suggest wording. It cannot change the level, hazard, areas, instructions or timing, cannot declare an emergency,
                    and nothing it writes is published without operator acceptance and approval by a second person. Provider: <span className="mono">{a.suggestions[0].provider}</span>
                  </div>
                  {a.suggestions.map((s, i) => (
                    <div key={i} className="lang-col" style={{ background: '#fff' }}>
                      <div className="row" style={{ marginBottom: 6 }}>
                        <span className="chip exercise">AI draft</span>
                        <strong className="small">{KIND_LABEL[s.kind]}</strong>
                        <span className="chip neutral">{s.lang === 'ar' ? 'العربية' : 'English'}</span>
                        <span style={{ marginInlineStart: 'auto' }}>
                          {s.accepted ? (
                            <span className="chip ok">
                              <ShieldCheck size={12} /> Accepted by {name(s.accepted.by)}
                            </span>
                          ) : (
                            a.state === 'IN_REVIEW' &&
                            can(me, 'alerts.prepare') && (
                              <button className="btn sm" onClick={() => act(`suggestions/${i}/accept`, undefined, 'Draft accepted for review.')}>
                                Accept draft
                              </button>
                            )
                          )}
                        </span>
                      </div>
                      <div className={s.lang === 'ar' ? 'rtl' : ''} style={{ whiteSpace: 'pre-wrap' }}>
                        {s.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <Card title="Actions" sub={me.name}>
            <div className="stack">
              {actions.length > 0 && <div className="row wrap">{actions}</div>}
              {waiting && <div className="notice info small">{waiting}</div>}
              <div className="small faint">Every action is recorded in the audit log with your identity and time.</div>
            </div>
          </Card>

          <Card title="Authenticity">
            <dl className="kv">
              <dt>Signature</dt>
              <dd>
                <VerifyChip ok={a.verification.ok} code={a.verification.code} />
              </dd>
              <dt>Issuer</dt>
              <dd>{a.issuer?.name.en ?? a.message.sender}</dd>
              <dt>Key ID</dt>
              <dd className="mono">{a.verification.keyId || '—'}</dd>
              <dt>Payload SHA-256</dt>
              <dd className="mono">{a.verification.payloadSha256}</dd>
              <dt>CAP status</dt>
              <dd>
                <span className="chip exercise">{a.message.status}</span>
              </dd>
              <dt>Sent / expires</dt>
              <dd>
                {fmtTime(a.message.sent)} → {fmtTime(a.message.expires)}
              </dd>
              {a.message.references?.length ? (
                <>
                  <dt>References</dt>
                  <dd className="mono">{a.message.references.join(', ')}</dd>
                </>
              ) : null}
            </dl>
          </Card>

          <Card title="Approvals" sub="Two-person rule">
            <dl className="kv">
              <dt>Prepared by</dt>
              <dd>{name(a.preparedBy)}</dd>
              <dt>Approved by</dt>
              <dd>{name(a.approvedBy)}</dd>
              <dt>Published by</dt>
              <dd>{name(a.publishedBy)}</dd>
              {a.retraction && (
                <>
                  <dt>Retraction</dt>
                  <dd>
                    {name(a.retraction.requestedBy)}: {a.retraction.reason}
                  </dd>
                </>
              )}
            </dl>
          </Card>

          {!quarantined && (
            <Card title="Areas" sub={areaNames(a.message.areas, 'en').join(', ')}>
              <KsaMap
                width={420}
                showCities={false}
                areas={WARNING_AREAS.map((w) => ({ ...w, currentLevel: a.message.areas.includes(w.code) ? a.message.level : null }))}
              />
            </Card>
          )}

          <Card title="History">
            <ul className="timeline">
              {a.history.map((h, i) => (
                <li key={i}>
                  <div className="row">
                    <StateBadge state={h.state} />
                    <span className="small faint">{fmtTime(h.at)}</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 3 }}>
                    {h.by.startsWith('system') ? h.by : name(h.by)}
                    {h.note ? ` · ${h.note}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {dialog === 'publish' && (
        <Confirm title="Publish to the public feed?" confirmLabel="Publish" onClose={() => setDialog(null)} onConfirm={() => act('publish', undefined, 'Published. The companion app will show it within seconds.')}>
          <div className={`notice ${a.message.level === 'red' ? 'blocking' : a.message.level === 'yellow' ? 'warning' : 'ok'}`}>
            <div>
              <strong>
                {LEVELS[a.message.level].label.en} · {HAZARDS[a.message.hazard].en}
              </strong>
              <div>Areas: {areaNames(a.message.areas, 'en').join(', ')}</div>
              <div>Languages: Arabic, English</div>
              <div>Steps: {a.message.instructions.map((c) => INSTRUCTIONS[c].en.split(/[.,]/)[0]).join(' · ')}</div>
            </div>
          </div>
          <div className="small muted">This is an exercise. Prepared by {name(a.preparedBy)}, approved by {name(a.approvedBy)}.</div>
        </Confirm>
      )}
      {(dialog === 'reject' || dialog === 'retract') && (
        <Confirm
          title={dialog === 'reject' ? 'Reject this alert?' : 'Request retraction?'}
          confirmLabel={dialog === 'reject' ? 'Reject' : 'Request retraction'}
          danger
          onClose={() => setDialog(null)}
          onConfirm={() =>
            reason.trim()
              ? act(dialog === 'reject' ? 'reject' : 'retraction/request', { reason }, dialog === 'reject' ? 'Rejected.' : 'Retraction requested. A second person must confirm.')
              : toast.show('Please give a reason.', true)
          }
        >
          <label className="small muted">
            Reason (recorded in the audit log)
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Issued in error" />
          </label>
        </Confirm>
      )}
      {dialog === 'confirmRetract' && (
        <Confirm title="Confirm retraction?" confirmLabel="Retract alert" danger onClose={() => setDialog(null)} onConfirm={() => act('retraction/confirm', undefined, 'Alert retracted and marked cancelled.')}>
          <div>
            Requested by {name(a.retraction?.requestedBy)}: “{a.retraction?.reason}”. The app will show this alert as cancelled.
          </div>
        </Confirm>
      )}
      {toast.node}
    </div>
  );
}

export default function AlertPage() {
  const params = useParams<{ id: string }>();
  return <Shell title="Alert workspace">{(s) => <Workspace id={params.id} session={s} />}</Shell>;
}
