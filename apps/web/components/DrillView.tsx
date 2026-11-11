'use client';

import { useEffect, useRef, useState } from 'react';
import { DEMO_USERS, Platform, SCENARIOS, verifyPublicAlert, type AuditEvent } from '@saudi-shield/core';
import { CheckCircle2, Info, Play, RotateCcw, ScrollText, ShieldX } from 'lucide-react';
import { usePrefs, type Bi } from '@/lib/prefs';
import { AlertPhone, type PhoneAlert } from './AlertPhone';

const OP = DEMO_USERS.find((u) => u.id === 'u-op-1')!;
const AP = DEMO_USERS.find((u) => u.id === 'u-ap-1')!;
const PB = DEMO_USERS.find((u) => u.id === 'u-pb-1')!;

const DRILLS = ['aerial-drill-riyadh', 'sandstorm-east', 'flood-south', 'integrity-failures'];

const STAGES: { title: Bi; who: Bi }[] = [
  { title: { en: 'Fictional issuer signs the message', ar: 'الجهة المصدِرة الافتراضية توقّع الرسالة' }, who: { en: 'Demo issuer key · marked Exercise', ar: 'مفتاح المُصدِر التجريبي · مُعلَّمة كتمرين' } },
  { title: { en: 'Signature and key are checked', ar: 'التحقق من التوقيع والمفتاح' }, who: { en: 'Automatic · failures are quarantined', ar: 'تلقائي · تُعزل الرسائل الفاشلة' } },
  { title: { en: 'Operator prepares the public text', ar: 'المشغّل يُعدّ النص العام' }, who: { en: 'Noura · from approved templates only', ar: 'نورة · من القوالب المعتمدة فقط' } },
  { title: { en: 'A different person approves', ar: 'شخص آخر يوافق' }, who: { en: 'Huda · cannot be the preparer', ar: 'هدى · لا يمكن أن تكون المُعِدّة' } },
  { title: { en: 'Duty officer publishes', ar: 'الضابط المناوب ينشر' }, who: { en: 'Sara · a third person', ar: 'سارة · شخص ثالث' } },
  { title: { en: 'The phone verifies it again, then shows it', ar: 'الهاتف يتحقق مرة أخرى ثم يعرضه' }, who: { en: 'Pinned publisher key', ar: 'مفتاح الناشر المثبّت' } },
];

type StageState = 'todo' | 'done' | 'fail';

export function DrillView() {
  const { t, lang } = usePrefs();
  const [scenarioId, setScenarioId] = useState(DRILLS[0]);
  const platform = useRef<Platform | null>(null);
  const run = useRef('');
  const [stepIdx, setStepIdx] = useState(0);
  const [stages, setStages] = useState<StageState[]>(STAGES.map(() => 'todo'));
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState<PhoneAlert[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [lastLabel, setLastLabel] = useState<Bi | null>(null);
  const timers = useRef<number[]>([]);

  const sc = SCENARIOS.find((s) => s.id === scenarioId)!;

  const reset = (id = scenarioId) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    platform.current = new Platform();
    run.current = platform.current.newRunId();
    setScenarioId(id);
    setStepIdx(0);
    setStages(STAGES.map(() => 'todo'));
    setPhone([]);
    setAudit(platform.current.audit.list().slice(-6).reverse());
    setLastLabel(null);
    setBusy(false);
  };

  useEffect(() => {
    reset(DRILLS[0]);
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    const p = platform.current!;
    const step = sc.steps[stepIdx];
    if (!step || busy) return;
    setBusy(true);
    setLastLabel(step.label);
    const rec = p.runStep(sc.id, step.id, run.current, 'web-visitor');
    const quarantined = rec.state === 'QUARANTINED';
    let final: StageState[];
    if (quarantined) {
      final = ['done', 'fail', 'todo', 'todo', 'todo', 'todo'];
    } else {
      p.prepare(rec.id, OP);
      p.approve(rec.id, AP);
      p.publish(rec.id, PB);
      final = STAGES.map(() => 'done');
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 0 : 450;
    setStages(STAGES.map(() => 'todo'));
    final.forEach((s, i) => {
      timers.current.push(
        window.setTimeout(() => setStages((prev) => prev.map((v, j) => (j === i ? s : v))), delay * (i + 1)),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        const key = p.publisherPublicKey().publicKeyHex;
        const alerts = p
          .publicFeed()
          .alerts.filter((env) => verifyPublicAlert(env, key))
          .map((env) => env.payload)
          .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
          .map<PhoneAlert>((a) => ({
            level: a.level,
            hazard: a.hazard,
            areas: a.areas,
            texts: a.texts,
            issuedAt: a.issuedAt,
            verified: true,
            state: a.publicState === 'cleared' ? 'cleared' : a.publicState === 'superseded' ? 'superseded' : 'active',
          }));
        setPhone(alerts);
        setAudit(p.audit.list().slice(-6).reverse());
        setStepIdx((i) => i + 1);
        setBusy(false);
      }, delay * (final.length + 1)),
    );
  };

  const finished = stepIdx >= sc.steps.length;
  const anyFail = stages.includes('fail');

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">{t({ en: 'Fictional drill', ar: 'تمرين افتراضي' })}</p>
        <h1 className="h1">{t({ en: 'See how a trustworthy alert is made', ar: 'شاهد كيف يُصنع تنبيه موثوق' })}</h1>
        <p className="lead">
          {t({
            en: 'Run a fictional exercise in your browser. Each message is signed, checked, and approved by three different people before it reaches the phone. A forged message never gets through.',
            ar: 'شغّل تمرينًا افتراضيًا في متصفحك. كل رسالة تُوقَّع وتُفحص ويوافق عليها ثلاثة أشخاص مختلفين قبل أن تصل إلى الهاتف. والرسالة المزوّرة لا تمر أبدًا.',
          })}
        </p>
        <div className="callout" style={{ marginTop: 20, background: 'var(--exercise-bg)', borderColor: '#d9d3f5' }}>
          <Info size={20} aria-hidden style={{ color: 'var(--exercise)' }} />
          <p>
            {t({
              en: 'Everything here is fictional: the issuer, the people, the areas and the keys. Nothing is sent to anyone, and no real alert is involved.',
              ar: 'كل ما هنا افتراضي: الجهة المصدِرة والأشخاص والمناطق والمفاتيح. لا يُرسل شيء لأي أحد، ولا علاقة لأي تنبيه حقيقي.',
            })}
          </p>
        </div>
      </header>

      <div className="tabs" role="radiogroup" aria-label={t({ en: 'Choose a drill', ar: 'اختر تمرينًا' })}>
        {DRILLS.map((id) => {
          const s = SCENARIOS.find((x) => x.id === id)!;
          return (
            <button key={id} role="radio" className="tab" aria-checked={id === scenarioId} onClick={() => reset(id)}>
              {s.title[lang].split(' · ')[0]}
            </button>
          );
        })}
      </div>
      <p className="muted">{sc.summary[lang]}</p>

      <div className="drill">
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <p className="muted" style={{ fontSize: '0.82em' }}>
                  {stepIdx} / {sc.steps.length} {t({ en: 'messages sent', ar: 'رسائل مُرسلة' })}
                </p>
                <p style={{ fontWeight: 600 }}>
                  {finished ? (lastLabel ? t(lastLabel) : '') : `${t({ en: 'Next:', ar: 'التالي:' })} ${sc.steps[stepIdx].label[lang]}`}
                </p>
              </div>
              <div className="row">
                <button className="btn btn-primary" onClick={next} disabled={busy || finished}>
                  <Play size={18} aria-hidden />
                  {finished ? t({ en: 'Drill complete', ar: 'اكتمل التمرين' }) : stepIdx === 0 ? t({ en: 'Start the drill', ar: 'ابدأ التمرين' }) : t({ en: 'Send next message', ar: 'أرسل الرسالة التالية' })}
                </button>
                <button className="btn btn-ghost" onClick={() => reset()} aria-label={t({ en: 'Restart', ar: 'أعد التشغيل' })}>
                  <RotateCcw size={18} aria-hidden />
                </button>
              </div>
            </div>
            <ol className="steps" aria-live="polite">
              {STAGES.map((s, i) => (
                <li key={i} className={`step ${stages[i]}`}>
                  <span className="step-n">{stages[i] === 'done' ? <CheckCircle2 size={18} aria-hidden /> : stages[i] === 'fail' ? <ShieldX size={18} aria-hidden /> : i + 1}</span>
                  <div>
                    <p className="step-t">{t(s.title)}</p>
                    <p className="who">
                      {stages[i] === 'fail'
                        ? t({ en: 'Signature check failed. The message is quarantined and can never be published.', ar: 'فشل التحقق من التوقيع. عُزلت الرسالة ولا يمكن نشرها أبدًا.' })
                        : t(s.who)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {anyFail && (
              <div className="callout danger">
                <ShieldX size={20} aria-hidden />
                <p>{t({ en: 'Blocked. The phone did not change. This is how forged or altered messages are stopped.', ar: 'تم الحظر. لم يتغير شيء على الهاتف. هكذا تُوقف الرسائل المزوّرة أو المعدّلة.' })}</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ScrollText size={18} aria-hidden style={{ color: 'var(--green-700)' }} /> {t({ en: 'Tamper-evident log', ar: 'سجل يكشف التلاعب' })}</h3>
            <p style={{ fontSize: '0.88em' }}>{t({ en: 'Each entry includes the fingerprint of the one before it, so any edit breaks the chain.', ar: 'كل قيد يتضمّن بصمة القيد الذي قبله، فأي تعديل يكسر السلسلة.' })}</p>
            <div style={{ display: 'grid', gap: 6, marginTop: 12 }} dir="ltr">
              {audit.map((e) => (
                <div key={e.seq} className="mono" style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, padding: '6px 10px', borderRadius: 8, background: 'var(--paper)' }}>
                  <span className="muted">#{e.seq}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.action} · {e.actor}</span>
                  <span className="muted">{e.hash.slice(0, 10)}…</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: 'sticky', top: 92 }}>
          <AlertPhone alerts={phone} caption={anyFail ? t({ en: 'Nothing reached the phone.', ar: 'لم يصل شيء إلى الهاتف.' }) : undefined} />
        </div>
      </div>
    </div>
  );
}
