'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Contrast, Languages, Menu, Phone, Type, X } from 'lucide-react';
import { usePrefs, type Bi } from '@/lib/prefs';

export function Mark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  const bg = light ? '#ffffff' : '#0e5e43';
  const fg = light ? '#0e5e43' : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="11" fill={bg} />
      <circle cx="20" cy="26" r="3.2" fill={fg} />
      <path d="M13.5 21.5a9 9 0 0 1 13 0" stroke={fg} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M9.5 17.2a14.5 14.5 0 0 1 21 0" stroke={fg} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d="M5.8 13a20 20 0 0 1 28.4 0" stroke={fg} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

const NAV: { href: string; label: Bi }[] = [
  { href: '/prepare/', label: { en: 'Prepare', ar: 'استعد' } },
  { href: '/plan/', label: { en: 'Family plan', ar: 'خطة الأسرة' } },
  { href: '/check/', label: { en: 'Is it real?', ar: 'هل هو حقيقي؟' } },
  { href: '/drill/', label: { en: 'Try a drill', ar: 'جرّب تمرينًا' } },
  { href: '/numbers/', label: { en: 'Numbers', ar: 'الأرقام' } },
  { href: '/about/', label: { en: 'About', ar: 'عن المشروع' } },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, toggleLarge, toggleContrast, large, contrast } = usePrefs();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.protocol === 'https:') {
      navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/sw.js`).catch(() => undefined);
    }
  }, []);

  return (
    <>
      <a href="#main" className="skip">{t({ en: 'Skip to content', ar: 'انتقل إلى المحتوى' })}</a>
      <div className="notice" role="note">
        <div className="wrap notice-in">
          <span className="notice-tag">{t({ en: 'Independent · Not official', ar: 'مستقل · غير رسمي' })}</span>
          <span>
            {t({
              en: 'In an emergency, follow official cell broadcast alerts and sirens, and call',
              ar: 'في حالات الطوارئ اتّبع تنبيهات البث الخلوي الرسمية وصفارات الإنذار، واتصل على',
            })}{' '}
            <a href="tel:911" className="notice-num">911</a> · <a href="tel:998" className="notice-num">998</a>
          </span>
        </div>
      </div>
      <header className="top">
        <div className="wrap top-in">
          <Link href="/" className="brand" aria-label={t({ en: 'Saudi Shield home', ar: 'الصفحة الرئيسية لدرع السعودية' })}>
            <Mark size={34} />
            <span className="brand-text">
              <span className="brand-name">{t({ en: 'Saudi Shield', ar: 'درع السعودية' })}</span>
              <span className="brand-sub">{t({ en: 'Preparedness companion', ar: 'رفيق الاستعداد' })}</span>
            </span>
          </Link>
          <nav className={`nav ${open ? 'open' : ''}`} aria-label={t({ en: 'Main', ar: 'الرئيسية' })}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={path?.startsWith(n.href) ? 'active' : ''} aria-current={path?.startsWith(n.href) ? 'page' : undefined}>
                {t(n.label)}
              </Link>
            ))}
          </nav>
          <div className="tools">
            <button className="tool" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}>
              <Languages size={18} aria-hidden />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            <button className="tool icon" onClick={toggleLarge} aria-pressed={large} title={t({ en: 'Larger text', ar: 'نص أكبر' })}>
              <Type size={18} aria-hidden />
              <span className="sr">{t({ en: 'Larger text', ar: 'نص أكبر' })}</span>
            </button>
            <button className="tool icon" onClick={toggleContrast} aria-pressed={contrast} title={t({ en: 'High contrast', ar: 'تباين عالٍ' })}>
              <Contrast size={18} aria-hidden />
              <span className="sr">{t({ en: 'High contrast', ar: 'تباين عالٍ' })}</span>
            </button>
            <button className="tool icon menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={t({ en: 'Menu', ar: 'القائمة' })}>
              {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="foot">
        <div className="wrap foot-in">
          <div className="foot-brand">
            <Mark size={30} light />
            <div>
              <p className="foot-name">{t({ en: 'Saudi Shield', ar: 'درع السعودية' })}</p>
              <p className="foot-small">
                {t({
                  en: 'An independent, non-commercial prototype. Not affiliated with or endorsed by any government entity. It does not send live alerts. All drills use fictional exercise data.',
                  ar: 'نموذج أولي مستقل وغير تجاري. لا يتبع أي جهة حكومية ولا يحظى بتأييدها. لا يرسل تنبيهات حقيقية. جميع التمارين تستخدم بيانات افتراضية.',
                })}
              </p>
            </div>
          </div>
          <div className="foot-cols">
            <div>
              <p className="foot-h">{t({ en: 'Official channels', ar: 'القنوات الرسمية' })}</p>
              <p className="foot-small">
                {t({
                  en: 'Cell broadcast alerts and sirens are authoritative. Follow Civil Defense on its official accounts and the Madani app.',
                  ar: 'تنبيهات البث الخلوي وصفارات الإنذار هي المرجع المعتمد. تابع الدفاع المدني عبر حساباته الرسمية وتطبيق مدني.',
                })}
              </p>
            </div>
            <div>
              <p className="foot-h">{t({ en: 'Emergency', ar: 'الطوارئ' })}</p>
              <p className="foot-nums">
                {['911', '998', '997', '999'].map((n) => (
                  <a key={n} href={`tel:${n}`}><Phone size={14} aria-hidden /> {n}</a>
                ))}
              </p>
            </div>
            <div>
              <p className="foot-h">{t({ en: 'Privacy', ar: 'الخصوصية' })}</p>
              <p className="foot-small">
                {t({
                  en: 'No accounts, no tracking, no location. Your plan stays on this device.',
                  ar: 'بلا حسابات ولا تتبّع ولا موقع. تبقى خطتك على هذا الجهاز.',
                })}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
