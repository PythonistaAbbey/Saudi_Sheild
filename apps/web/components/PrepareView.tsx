'use client';

import { useEffect, useState } from 'react';
import { GUIDANCE, HAZARDS, type HazardCode } from '@saudi-shield/core';
import { Activity, Clock, Flame, Info, Printer, ShieldAlert, Siren, Sunrise, Thermometer, Waves, Wind } from 'lucide-react';
import { usePrefs } from '@/lib/prefs';

export const HAZARD_ICONS: Partial<Record<HazardCode, React.ElementType>> = {
  aerial_threat: Siren,
  sandstorm: Wind,
  flash_flood: Waves,
  extreme_heat: Thermometer,
  fire: Flame,
  earthquake: Activity,
};

export function PrepareView() {
  const { t, lang } = usePrefs();
  const [hazard, setHazard] = useState<HazardCode>('aerial_threat');

  useEffect(() => {
    const h = window.location.hash.slice(1) as HazardCode;
    if (GUIDANCE.some((g) => g.hazard === h)) setHazard(h);
  }, []);

  const select = (h: HazardCode) => {
    setHazard(h);
    history.replaceState(null, '', `#${h}`);
  };

  const g = GUIDANCE.find((x) => x.hazard === hazard)!;
  const Icon = HAZARD_ICONS[hazard] ?? ShieldAlert;
  const phases = [
    { key: 'before', icon: Clock, title: { en: 'Before', ar: 'قبل' }, items: g.before },
    { key: 'during', icon: ShieldAlert, title: { en: 'During', ar: 'أثناء' }, items: g.during },
    { key: 'after', icon: Sunrise, title: { en: 'After', ar: 'بعد' }, items: g.after },
  ];

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">{t({ en: 'Prepare', ar: 'استعد' })}</p>
        <h1 className="h1">{t({ en: 'Know what to do, before you need to', ar: 'اعرف ماذا تفعل قبل أن تحتاج إليه' })}</h1>
        <p className="lead">
          {t({
            en: 'Short, plain guidance for the hazards most likely in the Kingdom. It is saved for offline use after your first visit.',
            ar: 'إرشادات قصيرة وواضحة لأكثر المخاطر احتمالًا في المملكة. تُحفظ للاستخدام دون اتصال بعد زيارتك الأولى.',
          })}
        </p>
      </header>

      <div className="tabs no-print" role="tablist" aria-label={t({ en: 'Hazards', ar: 'المخاطر' })}>
        {GUIDANCE.map((x) => {
          const I = HAZARD_ICONS[x.hazard] ?? ShieldAlert;
          return (
            <button key={x.hazard} role="tab" className="tab" aria-selected={x.hazard === hazard} aria-controls="guide" onClick={() => select(x.hazard)}>
              <I size={18} aria-hidden /> {HAZARDS[x.hazard][lang]}
            </button>
          );
        })}
      </div>

      <section id="guide" role="tabpanel" aria-label={HAZARDS[hazard][lang]}>
        <div className="summary-band">
          <span className="icon-tile" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', margin: 0, flexShrink: 0 }}>
            <Icon size={26} aria-hidden />
          </span>
          <div>
            <p className="muted" style={{ color: '#8fc9ae', fontSize: '0.85em', fontWeight: 600 }}>{HAZARDS[hazard][lang]}</p>
            <p>{t(g.summary)}</p>
          </div>
        </div>

        <div className="grid g3" style={{ marginTop: 20 }}>
          {phases.map((p) => (
            <div key={p.key} className="card phase">
              <h3><p.icon size={20} aria-hidden style={{ color: 'var(--green-700)' }} /> {t(p.title)}</h3>
              <ul>
                {p.items.map((it, i) => (
                  <li key={i}>{t(it)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
          <div className="callout" style={{ flex: 1, minWidth: 280 }}>
            <Info size={20} aria-hidden />
            <p>{t(g.source)}</p>
          </div>
          <button className="btn btn-ghost no-print" onClick={() => window.print()}>
            <Printer size={18} aria-hidden /> {t({ en: 'Print this guide', ar: 'اطبع هذا الدليل' })}
          </button>
        </div>
      </section>
    </div>
  );
}
