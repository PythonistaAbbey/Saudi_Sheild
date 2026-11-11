'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { LEVELS, renderAll, scenarioById } from '@saudi-shield/core';
import {
  ArrowRight, BookOpenCheck, Backpack, CloudOff, EyeOff, Languages, ListChecks, Phone, PlayCircle, SearchCheck, ShieldOff, Users, BellOff, BotOff,
} from 'lucide-react';
import { usePrefs, type Bi } from '@/lib/prefs';
import { AlertPhone } from './AlertPhone';

const SIGNAL_TODO: Record<'yellow' | 'red' | 'white', Bi> = {
  yellow: { en: 'Get ready. Move towards a safe indoor place, keep your phone charged and follow official updates.', ar: 'استعد. اتجه إلى مكان آمن داخل مبنى، وأبقِ هاتفك مشحونًا، وتابع التحديثات الرسمية.' },
  red: { en: 'Act now. Shelter in an interior room away from windows and stay there.', ar: 'تصرّف الآن. احتمِ في غرفة داخلية بعيدًا عن النوافذ وابقَ فيها.' },
  white: { en: 'Danger has ended. Resume with caution and stay away from unknown debris.', ar: 'انتهى الخطر. استأنف أنشطتك بحذر وابتعد عن أي حطام غير معروف.' },
};

const TOOLS: { href: string; icon: React.ElementType; title: Bi; body: Bi }[] = [
  { href: '/prepare/', icon: BookOpenCheck, title: { en: 'Hazard guides', ar: 'أدلة المخاطر' }, body: { en: 'What to do before, during and after six hazards, from sandstorms to flash floods.', ar: 'ماذا تفعل قبل ستة مخاطر وأثناءها وبعدها، من العواصف الرملية إلى السيول.' } },
  { href: '/plan/', icon: Users, title: { en: 'Family emergency plan', ar: 'خطة الأسرة للطوارئ' }, body: { en: 'Safe rooms, meeting points and contacts on one printable card, kept on your device.', ar: 'الغرف الآمنة ونقاط الالتقاء وجهات الاتصال في بطاقة واحدة قابلة للطباعة، محفوظة على جهازك.' } },
  { href: '/plan/#bag', icon: Backpack, title: { en: 'Go-bag checklist', ar: 'قائمة حقيبة الطوارئ' }, body: { en: 'Tick off what to pack. Progress is saved for next time.', ar: 'ضع علامة على ما جهّزته. يُحفظ التقدّم للمرة القادمة.' } },
  { href: '/check/', icon: SearchCheck, title: { en: 'Is this alert real?', ar: 'هل هذا التنبيه حقيقي؟' }, body: { en: 'A two-minute check for forwarded “alerts” before you believe or share them.', ar: 'فحص خلال دقيقتين لأي «تنبيه» يصلك قبل أن تصدّقه أو تنشره.' } },
  { href: '/drill/', icon: PlayCircle, title: { en: 'Try a fictional drill', ar: 'جرّب تمرينًا افتراضيًا' }, body: { en: 'Watch a signed exercise alert travel from issuer to phone, with three people approving.', ar: 'شاهد تنبيه تمرين موقّعًا ينتقل من الجهة المصدِرة إلى الهاتف بموافقة ثلاثة أشخاص.' } },
  { href: '/numbers/', icon: Phone, title: { en: 'Emergency numbers', ar: 'أرقام الطوارئ' }, body: { en: '911, 998, 997 and 999, with one tap to call.', ar: '911 و998 و997 و999، بلمسة واحدة للاتصال.' } },
];

const NEVER: { icon: React.ElementType; text: Bi }[] = [
  { icon: BellOff, text: { en: 'Send or originate real alerts', ar: 'إرسال تنبيهات حقيقية أو إصدارها' } },
  { icon: ShieldOff, text: { en: 'Replace cell broadcast or sirens', ar: 'الحلول محل البث الخلوي أو الصفارات' } },
  { icon: EyeOff, text: { en: 'Track you or ask for your location', ar: 'تتبّعك أو طلب موقعك' } },
  { icon: BotOff, text: { en: 'Let AI give emergency instructions', ar: 'السماح للذكاء الاصطناعي بإعطاء تعليمات طوارئ' } },
];

export function HomeView() {
  const { t, lang } = usePrefs();
  const heroAlerts = useMemo(() => {
    const sc = scenarioById('aerial-drill-riyadh')!;
    const now = new Date('2026-11-12T09:41:00Z');
    const msg = sc.steps.find((s) => s.id === 'red')!.build(now, 'HOME');
    const texts = renderAll(msg);
    return [{ level: msg.level, hazard: msg.hazard, areas: msg.areas.slice(0, 2), texts, issuedAt: msg.sent, verified: true }];
  }, []);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <div>
            <p className="eyebrow">{t({ en: 'Free · Independent · Arabic and English', ar: 'مجاني · مستقل · بالعربية والإنجليزية' })}</p>
            <h1 className="h1">{t({ en: 'Be ready before the alert. Stay calm after it.', ar: 'كن مستعدًا قبل التنبيه، وهادئًا بعده.' })}</h1>
            <p className="lead">
              {t({
                en: 'Simple, trustworthy preparedness tools for everyone in Saudi Arabia: residents, visitors and pilgrims. Learn the signals, make a family plan, spot fake alerts and practise with a fictional drill.',
                ar: 'أدوات استعداد بسيطة وموثوقة لكل من في المملكة العربية السعودية: المقيمين والزوار والحجاج. تعرّف على الإشارات، وأعدّ خطة لأسرتك، واكتشف التنبيهات المزيفة، وتدرّب بتمرين افتراضي.',
              })}
            </p>
            <div className="row hero-cta">
              <Link href="/plan/" className="btn btn-light">
                {t({ en: 'Make your family plan', ar: 'أعدّ خطة أسرتك' })} <ArrowRight size={18} className="flip" aria-hidden />
              </Link>
              <Link href="/drill/" className="btn btn-ghost" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>
                <PlayCircle size={18} aria-hidden /> {t({ en: 'Try a fictional drill', ar: 'جرّب تمرينًا افتراضيًا' })}
              </Link>
            </div>
            <div className="hero-trust">
              <span><CloudOff size={16} aria-hidden /> {t({ en: 'Works offline', ar: 'يعمل دون اتصال' })}</span>
              <span><EyeOff size={16} aria-hidden /> {t({ en: 'No account, no tracking', ar: 'بلا حساب ولا تتبّع' })}</span>
              <span><Languages size={16} aria-hidden /> {t({ en: 'العربية · English', ar: 'العربية · English' })}</span>
            </div>
          </div>
          <div className="hero-art">
            <AlertPhone alerts={heroAlerts} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">{t({ en: 'Know the signals', ar: 'اعرف الإشارات' })}</p>
          <h2 className="h2">{t({ en: 'Three colours, three actions', ar: 'ثلاثة ألوان، ثلاثة تصرّفات' })}</h2>
          <p className="lead" style={{ marginTop: 12 }}>
            {t({
              en: 'Civil Defense uses Yellow, Red and White to describe the state of a danger. Official alerts reach phones by cell broadcast, with sirens in some areas.',
              ar: 'يستخدم الدفاع المدني الأصفر والأحمر والأبيض لوصف حالة الخطر. تصل التنبيهات الرسمية إلى الهواتف عبر البث الخلوي، مع صفارات الإنذار في بعض المناطق.',
            })}
          </p>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {(['yellow', 'red', 'white'] as const).map((lv) => (
              <div key={lv} className={`signal ${lv}`}>
                <p className="signal-k"><span className={`dot ${lv}`} aria-hidden /> {LEVELS[lv].label[lang]}</p>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>{LEVELS[lv].meaning[lang]}</p>
                <p className="muted">{t(SIGNAL_TODO[lv])}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">{t({ en: 'Tools', ar: 'الأدوات' })}</p>
          <h2 className="h2">{t({ en: 'Everything you need, in one calm place', ar: 'كل ما تحتاجه في مكان واحد هادئ' })}</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href} className="card tool-card">
                <span className="icon-tile"><tool.icon size={24} aria-hidden /></span>
                <h3>{t(tool.title)}</h3>
                <p>{t(tool.body)}</p>
                <span className="go">{t({ en: 'Open', ar: 'افتح' })} <ArrowRight size={16} className="flip" aria-hidden /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="card" style={{ padding: 36 }}>
            <p className="eyebrow">{t({ en: 'Ten minutes today', ar: 'عشر دقائق اليوم' })}</p>
            <h2 className="h2">{t({ en: 'Three things that make the biggest difference', ar: 'ثلاثة أمور تُحدث الفرق الأكبر' })}</h2>
            <div className="grid g3" style={{ marginTop: 28, gap: 28 }}>
            {[
              { n: '1', title: { en: 'Pick your safe room', ar: 'اختر غرفتك الآمنة' }, body: { en: 'An interior room with few or no windows, at home and at work.', ar: 'غرفة داخلية بنوافذ قليلة أو بلا نوافذ، في المنزل والعمل.' } },
              { n: '2', title: { en: 'Agree how you will check in', ar: 'اتفقوا على طريقة الاطمئنان' }, body: { en: 'One short message instead of many calls keeps networks free.', ar: 'رسالة قصيرة واحدة بدل مكالمات كثيرة تُبقي الشبكات متاحة.' } },
              { n: '3', title: { en: 'Pack a small go-bag', ar: 'جهّز حقيبة طوارئ صغيرة' }, body: { en: 'Water, torch, power bank, medicines and copies of documents.', ar: 'ماء ومصباح وشاحن متنقل وأدوية ونسخ من المستندات.' } },
            ].map((s) => (
              <div key={s.n} style={{ display: 'flex', gap: 14 }}>
                <span className="step-n" style={{ background: 'var(--green-700)', color: '#fff', flexShrink: 0 }}>{s.n}</span>
                <div>
                  <p style={{ fontWeight: 600 }}>{t(s.title)}</p>
                  <p className="muted">{t(s.body)}</p>
                </div>
              </div>
            ))}
            </div>
            <div className="row" style={{ marginTop: 28 }}>
            <Link href="/plan/" className="btn btn-primary"><ListChecks size={18} aria-hidden /> {t({ en: 'Start my plan', ar: 'ابدأ خطتي' })}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div style={{ background: 'var(--green-900)', color: '#fff', borderRadius: 'var(--radius)', padding: '40px 36px' }}>
            <p className="eyebrow" style={{ color: '#8fc9ae' }}>{t({ en: 'Built with firm limits', ar: 'مبني بحدود صارمة' })}</p>
            <h2 className="h2">{t({ en: 'What this site will never do', ar: 'ما لن يفعله هذا الموقع أبدًا' })}</h2>
            <div className="grid g4" style={{ marginTop: 24 }}>
              {NEVER.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: '#d6eadf' }}>
                  <n.icon size={22} aria-hidden style={{ flexShrink: 0, color: '#8fc9ae', marginTop: 2 }} />
                  <span>{t(n.text)}</span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 24, color: '#a9c6b8', fontSize: '0.9em' }}>
              {t({
                en: 'Official cell broadcast alerts and sirens always come first. This site helps you prepare and understand them.',
                ar: 'تنبيهات البث الخلوي الرسمية وصفارات الإنذار تأتي أولًا دائمًا. يساعدك هذا الموقع على الاستعداد وفهمها.',
              })}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
