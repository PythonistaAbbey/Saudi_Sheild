'use client';

import { HAZARDS, LEVELS, areaNames, type AlertLevel, type HazardCode, type RenderedText } from '@saudi-shield/core';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { usePrefs } from '@/lib/prefs';

export interface PhoneAlert {
  level: AlertLevel;
  hazard: HazardCode;
  areas: string[];
  texts: { ar: RenderedText; en: RenderedText };
  issuedAt: string;
  verified: boolean;
  state?: 'active' | 'superseded' | 'cleared';
}

export function AlertPhone({ alerts, caption }: { alerts: PhoneAlert[]; caption?: string }) {
  const { t, lang } = usePrefs();
  const current = alerts[0];
  return (
    <div className="phone" role="img" aria-label={t({ en: 'Fictional exercise alert shown on a phone', ar: 'تنبيه تمرين افتراضي على هاتف' })}>
      <div className="phone-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="phone-status">
          <span>09:41</span>
          <span>5G</span>
        </div>
        <div className="phone-ribbon">{t({ en: 'EXERCISE · FICTIONAL · NOT A REAL ALERT', ar: 'تمرين · افتراضي · ليس تنبيهًا حقيقيًا' })}</div>
        <div className="phone-body">
          {!current && (
            <div className="empty-phone">
              <ShieldCheck size={36} style={{ margin: '0 auto 10px', color: 'var(--green-700)' }} aria-hidden />
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{t({ en: 'No exercise alerts', ar: 'لا توجد تنبيهات تمرين' })}</p>
              <p style={{ fontSize: 13 }}>{caption ?? t({ en: 'Start the drill to see what arrives.', ar: 'ابدأ التمرين لترى ما يصل.' })}</p>
            </div>
          )}
          {alerts.map((a, i) => {
            const tx = a.texts[lang];
            const faded = i > 0;
            return (
              <div key={i} className={`alert-card ${a.level}`} style={faded ? { opacity: 0.6 } : undefined}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                  <span className={`pill ${a.level === 'red' ? 'pill-red' : a.level === 'yellow' ? 'pill-yellow' : 'pill-green'}`} style={{ fontSize: 11 }}>
                    {LEVELS[a.level].label[lang]} · {HAZARDS[a.hazard][lang]}
                  </span>
                  {a.verified ? (
                    <span className="verified"><ShieldCheck size={12} aria-hidden /> {t({ en: 'Signature verified', ar: 'التوقيع موثّق' })}</span>
                  ) : (
                    <span className="verified" style={{ color: 'var(--red)', background: 'var(--red-bg)' }}><ShieldX size={12} aria-hidden /> {t({ en: 'Not verified', ar: 'غير موثّق' })}</span>
                  )}
                </div>
                <h4>{tx.headline}</h4>
                <p className="alert-meta">
                  {areaNames(a.areas, lang).join(lang === 'ar' ? '، ' : ', ')} ·{' '}
                  {new Date(a.issuedAt).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                  {faded ? ` · ${t({ en: 'earlier', ar: 'سابق' })}` : ''}
                </p>
                {!faded && tx.steps.length > 0 && (
                  <ol>
                    {tx.steps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
