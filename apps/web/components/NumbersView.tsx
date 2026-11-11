'use client';

import { EMERGENCY_CONTACTS } from '@saudi-shield/core';
import { Info, MessageSquareText, Phone } from 'lucide-react';
import { usePrefs } from '@/lib/prefs';

export function NumbersView() {
  const { t, lang } = usePrefs();
  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">{t({ en: 'Emergency numbers', ar: 'أرقام الطوارئ' })}</p>
        <h1 className="h1">{t({ en: 'One tap to call', ar: 'اتصل بلمسة واحدة' })}</h1>
        <p className="lead">{t({ en: 'Save these in your phone today. Calls to emergency numbers are free.', ar: 'احفظ هذه الأرقام في هاتفك اليوم. الاتصال بأرقام الطوارئ مجاني.' })}</p>
      </header>
      <div className="grid g2" style={{ marginTop: 32 }}>
        {EMERGENCY_CONTACTS.map((c) => (
          <a key={c.number} href={`tel:${c.number}`} className="card num-card tool-card" style={{ flexDirection: 'row' }}>
            <span className="num" dir="ltr">{c.number}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: '1.1em' }}>{c.name[lang]}</span>
              <span className="muted" style={{ fontSize: '0.9em' }}>{c.scope[lang]}</span>
            </span>
            <span className="icon-tile" style={{ margin: 0 }}><Phone size={22} aria-hidden /></span>
          </a>
        ))}
      </div>
      <div className="grid g2" style={{ marginTop: 20 }}>
        <div className="callout">
          <MessageSquareText size={20} aria-hidden />
          <p>{t({ en: 'When you call, say where you are first, then what happened and how many people need help. Stay on the line.', ar: 'عند الاتصال، اذكر موقعك أولًا، ثم ما حدث وعدد من يحتاجون المساعدة. ابقَ على الخط.' })}</p>
        </div>
        <div className="callout warn">
          <Info size={20} aria-hidden />
          <p>{t({ en: 'Coverage of each number can change. Check the latest official guidance for your region.', ar: 'قد تتغير تغطية كل رقم. تحقّق من أحدث الإرشادات الرسمية لمنطقتك.' })}</p>
        </div>
      </div>
    </div>
  );
}
