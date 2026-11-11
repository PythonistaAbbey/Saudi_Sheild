'use client';

import { useMemo, useState } from 'react';
import { DEMO_PUBLISHER_KEY, renderAll, scenarioById, sign, verifySignature, type SignedEnvelope } from '@saudi-shield/core';
import { AlertOctagon, CheckCircle2, HelpCircle, KeyRound, RotateCcw, ShieldCheck, ShieldX, Wand2 } from 'lucide-react';
import { usePrefs, type Bi } from '@/lib/prefs';

interface Opt { label: Bi; score: number; official?: boolean; flag?: Bi }
interface Q { id: string; q: Bi; opts: Opt[] }

const QUESTIONS: Q[] = [
  {
    id: 'channel',
    q: { en: 'How did the message reach you?', ar: 'كيف وصلتك الرسالة؟' },
    opts: [
      { label: { en: 'As an emergency alert on my phone with a loud tone, without opening any app', ar: 'كتنبيه طوارئ على هاتفي بنغمة عالية دون فتح أي تطبيق' }, score: 0, official: true },
      { label: { en: 'From an official Civil Defense account or the Madani app', ar: 'من حساب رسمي للدفاع المدني أو من تطبيق مدني' }, score: 0, official: true },
      { label: { en: 'Forwarded in WhatsApp, Telegram or social media', ar: 'رسالة محوّلة عبر واتساب أو تيليجرام أو وسائل التواصل' }, score: 2, flag: { en: 'Forwarded messages are the most common way fake alerts spread.', ar: 'الرسائل المحوّلة هي الطريقة الأكثر شيوعًا لانتشار التنبيهات المزيفة.' } },
      { label: { en: 'A text message or email with a link', ar: 'رسالة نصية أو بريد إلكتروني يحتوي على رابط' }, score: 3, flag: { en: 'Messages with links are a common scam route.', ar: 'الرسائل التي تحتوي روابط طريق شائع للاحتيال.' } },
    ],
  },
  {
    id: 'ask',
    q: { en: 'Does it ask you to tap a link, download something, pay, or give personal details?', ar: 'هل تطلب منك فتح رابط أو تنزيل شيء أو الدفع أو تقديم بيانات شخصية؟' },
    opts: [
      { label: { en: 'Yes', ar: 'نعم' }, score: 4, flag: { en: 'A safety warning should not ask for money, passwords or personal details.', ar: 'لا ينبغي أن يطلب تحذير السلامة مالًا أو كلمات مرور أو بيانات شخصية.' } },
      { label: { en: 'No', ar: 'لا' }, score: 0 },
      { label: { en: 'Not sure', ar: 'لست متأكدًا' }, score: 1 },
    ],
  },
  {
    id: 'forward',
    q: { en: 'Does it urge you to forward it to everyone?', ar: 'هل تحثّك على إعادة إرسالها للجميع؟' },
    opts: [
      { label: { en: 'Yes', ar: 'نعم' }, score: 2, flag: { en: '“Share with everyone” is a classic sign of a rumour.', ar: '«انشرها للجميع» علامة معروفة على الشائعات.' } },
      { label: { en: 'No', ar: 'لا' }, score: 0 },
    ],
  },
  {
    id: 'speculate',
    q: { en: 'Does it predict exact places, times or targets, or use words like “expected”, “possibly” or “sources say”?', ar: 'هل تتنبأ بأماكن أو أوقات أو أهداف محددة، أو تستخدم عبارات مثل «متوقع» أو «ربما» أو «مصادر تقول»؟' },
    opts: [
      { label: { en: 'Yes', ar: 'نعم' }, score: 2, flag: { en: 'Genuine warnings focus on what to do now. Speculation is a common sign of rumour.', ar: 'التحذيرات الحقيقية تركّز على ما يجب فعله الآن. التكهّنات علامة شائعة على الشائعات.' } },
      { label: { en: 'No', ar: 'لا' }, score: 0 },
    ],
  },
  {
    id: 'confirm',
    q: { en: 'Can you find the same message on an official channel?', ar: 'هل تجد الرسالة نفسها في قناة رسمية؟' },
    opts: [
      { label: { en: 'Yes, it is on an official channel', ar: 'نعم، موجودة في قناة رسمية' }, score: -2, official: true },
      { label: { en: 'No, I looked and could not find it', ar: 'لا، بحثت ولم أجدها' }, score: 2, flag: { en: 'It does not appear on any official channel.', ar: 'لا تظهر في أي قناة رسمية.' } },
      { label: { en: 'I have not checked yet', ar: 'لم أتحقق بعد' }, score: 1 },
    ],
  },
];

function sampleEnvelope(): SignedEnvelope<unknown> {
  const sc = scenarioById('aerial-drill-riyadh')!;
  const msg = sc.steps.find((s) => s.id === 'yellow')!.build(new Date('2026-11-12T09:30:00Z'), 'CHECK');
  const texts = renderAll(msg);
  const payload = {
    identifier: msg.identifier,
    status: msg.status,
    level: msg.level,
    hazard: msg.hazard,
    areas: msg.areas,
    headline: { en: texts.en.headline, ar: texts.ar.headline },
    issuedAt: msg.sent,
  };
  return sign(payload, DEMO_PUBLISHER_KEY);
}

export function CheckView() {
  const { t } = usePrefs();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const sample = useMemo(() => JSON.stringify(sampleEnvelope(), null, 2), []);
  const [raw, setRaw] = useState(sample);
  const [result, setResult] = useState<'ok' | 'bad' | 'invalid' | null>(null);

  const complete = QUESTIONS.every((q) => answers[q.id] !== undefined);
  const chosen = QUESTIONS.map((q) => (answers[q.id] !== undefined ? q.opts[answers[q.id]] : undefined)).filter(Boolean) as Opt[];
  const score = chosen.reduce((s, o) => s + o.score, 0);
  const official = chosen.some((o) => o.official);
  const flags = chosen.filter((o) => o.flag).map((o) => o.flag!);
  const verdict: 'ok' | 'warn' | 'bad' = score >= 4 ? 'bad' : score <= 0 && official ? 'ok' : 'warn';

  const verify = () => {
    try {
      const env = JSON.parse(raw) as SignedEnvelope<unknown>;
      if (!env || typeof env !== 'object' || !('signature' in env) || !('payload' in env)) return setResult('invalid');
      setResult(verifySignature(env, DEMO_PUBLISHER_KEY.publicKeyHex) ? 'ok' : 'bad');
    } catch {
      setResult('invalid');
    }
  };
  const tamper = () => {
    try {
      const env = JSON.parse(raw);
      env.payload.level = 'red';
      env.payload.headline.en = 'FICTIONAL: Evacuate the city immediately';
      env.payload.headline.ar = 'افتراضي: أخلوا المدينة فورًا';
      setRaw(JSON.stringify(env, null, 2));
      setResult(null);
    } catch {
      setResult('invalid');
    }
  };

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">{t({ en: 'Is it real?', ar: 'هل هو حقيقي؟' })}</p>
        <h1 className="h1">{t({ en: 'Check before you believe or share', ar: 'تحقّق قبل أن تصدّق أو تنشر' })}</h1>
        <p className="lead">
          {t({
            en: 'Fake “alerts” cause panic and can be scams. Answer five questions about a message you received. Nothing you choose leaves this page.',
            ar: 'التنبيهات المزيفة تسبب الذعر وقد تكون احتيالًا. أجب عن خمسة أسئلة حول رسالة وصلتك. لا يغادر أي شيء تختاره هذه الصفحة.',
          })}
        </p>
        <div className="callout danger" style={{ marginTop: 20 }}>
          <AlertOctagon size={20} aria-hidden />
          <p>
            {t({
              en: 'If you hear a siren or receive an emergency alert on your phone, act on it first and check later.',
              ar: 'إذا سمعت صفارة إنذار أو تلقيت تنبيه طوارئ على هاتفك، فتصرّف أولًا وتحقّق لاحقًا.',
            })}
          </p>
        </div>
      </header>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            {QUESTIONS.map((q, qi) => (
              <fieldset key={q.id} className="card q" style={{ margin: 0 }}>
                <legend className="sr">{t(q.q)}</legend>
                <p className="q-title" aria-hidden>{qi + 1}. {t(q.q)}</p>
                <div className="opts">
                  {q.opts.map((o, oi) => (
                    <button key={oi} className="opt" aria-pressed={answers[q.id] === oi} onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}>
                      {t(o.label)}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div style={{ position: 'sticky', top: 92, display: 'grid', gap: 16 }} aria-live="polite">
            {!complete ? (
              <div className="card">
                <HelpCircle size={28} aria-hidden style={{ color: 'var(--green-700)', marginBottom: 10 }} />
                <h3>{t({ en: 'Your result appears here', ar: 'تظهر نتيجتك هنا' })}</h3>
                <p>
                  {Object.keys(answers).length} / {QUESTIONS.length} {t({ en: 'answered', ar: 'تمت الإجابة' })}
                </p>
              </div>
            ) : (
              <div className={`verdict ${verdict}`}>
                {verdict === 'ok' ? <CheckCircle2 size={30} aria-hidden /> : verdict === 'bad' ? <ShieldX size={30} aria-hidden /> : <HelpCircle size={30} aria-hidden />}
                <h3>
                  {verdict === 'ok'
                    ? t({ en: 'This came through an official route', ar: 'وصلت عبر قناة رسمية' })
                    : verdict === 'bad'
                      ? t({ en: 'This is likely fake or a scam', ar: 'هذه على الأرجح مزيفة أو احتيال' })
                      : t({ en: 'Unverified. Do not share it yet', ar: 'غير موثّقة. لا تنشرها الآن' })}
                </h3>
                <p>
                  {verdict === 'ok'
                    ? t({ en: 'Follow its instructions and keep checking official channels for updates and the all-clear.', ar: 'اتّبع تعليماتها وواصل متابعة القنوات الرسمية للتحديثات ولإعلان انتهاء الخطر.' })
                    : verdict === 'bad'
                      ? t({ en: 'Do not tap links or share it. Delete it, and warn the person who sent it.', ar: 'لا تفتح الروابط ولا تنشرها. احذفها ونبّه من أرسلها إليك.' })
                      : t({ en: 'Look for the same message on official channels. If you are in doubt and feel unsafe, go indoors and wait for official information.', ar: 'ابحث عن الرسالة نفسها في القنوات الرسمية. إذا كنت في شك وتشعر بعدم الأمان، فادخل إلى مبنى وانتظر المعلومات الرسمية.' })}
                </p>
                {flags.length > 0 && (
                  <ul>
                    {flags.map((f, i) => (
                      <li key={i}>{t(f)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {complete && (
              <button className="btn btn-ghost" onClick={() => setAnswers({})}>
                <RotateCcw size={18} aria-hidden /> {t({ en: 'Check another message', ar: 'تحقّق من رسالة أخرى' })}
              </button>
            )}
            <p className="muted" style={{ fontSize: '0.82em' }}>
              {t({
                en: 'This is a guide, not a guarantee. Only official channels can confirm an alert.',
                ar: 'هذا دليل إرشادي وليس ضمانًا. القنوات الرسمية وحدها تستطيع تأكيد التنبيه.',
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow">{t({ en: 'Under the hood', ar: 'كيف يعمل' })}</p>
        <h2 className="h2">{t({ en: 'How a signed message proves itself', ar: 'كيف تُثبت الرسالة الموقّعة صحتها' })}</h2>
        <p className="lead" style={{ marginTop: 12 }}>
          {t({
            en: 'In the Saudi Shield prototype every message carries a digital signature. Change a single letter and the check fails. Try it with this fictional exercise message signed by a demo key.',
            ar: 'في النموذج الأولي لدرع السعودية تحمل كل رسالة توقيعًا رقميًا. غيّر حرفًا واحدًا فيفشل التحقق. جرّب ذلك مع رسالة التمرين الافتراضية هذه الموقّعة بمفتاح تجريبي.',
          })}
        </p>
        <div className="grid g2" style={{ marginTop: 24, alignItems: 'start' }}>
          <div>
            <label htmlFor="env" className="sr">{t({ en: 'Signed message', ar: 'الرسالة الموقّعة' })}</label>
            <textarea id="env" className="code" dir="ltr" spellCheck={false} value={raw} onChange={(e) => { setRaw(e.target.value); setResult(null); }} />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <button className="btn btn-primary" onClick={verify}><KeyRound size={18} aria-hidden /> {t({ en: 'Verify signature', ar: 'تحقّق من التوقيع' })}</button>
            <button className="btn btn-ghost" onClick={tamper}><Wand2 size={18} aria-hidden /> {t({ en: 'Tamper with the message', ar: 'عدّل الرسالة' })}</button>
            <button className="btn btn-ghost" onClick={() => { setRaw(sample); setResult(null); }}><RotateCcw size={18} aria-hidden /> {t({ en: 'Restore the original', ar: 'استعد الأصل' })}</button>
            <div aria-live="polite">
              {result === 'ok' && (
                <div className="callout"><ShieldCheck size={20} aria-hidden /><p><b>{t({ en: 'Signature valid.', ar: 'التوقيع صحيح.' })}</b> {t({ en: 'Signed by the demo publisher key and unchanged since.', ar: 'موقّعة بمفتاح الناشر التجريبي ولم تتغير منذ ذلك.' })}</p></div>
              )}
              {result === 'bad' && (
                <div className="callout danger"><ShieldX size={20} aria-hidden /><p><b>{t({ en: 'Signature invalid.', ar: 'التوقيع غير صحيح.' })}</b> {t({ en: 'The message was changed after signing. The app would refuse to show it.', ar: 'تم تعديل الرسالة بعد توقيعها. سيرفض التطبيق عرضها.' })}</p></div>
              )}
              {result === 'invalid' && (
                <div className="callout warn"><HelpCircle size={20} aria-hidden /><p>{t({ en: 'That is not a signed message in the expected format.', ar: 'هذه ليست رسالة موقّعة بالصيغة المتوقعة.' })}</p></div>
              )}
            </div>
            <p className="muted mono" dir="ltr" style={{ wordBreak: 'break-all' }}>key: {DEMO_PUBLISHER_KEY.keyId} · {DEMO_PUBLISHER_KEY.publicKeyHex.slice(0, 24)}…</p>
          </div>
        </div>
      </section>
    </div>
  );
}
