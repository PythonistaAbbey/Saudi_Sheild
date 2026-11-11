'use client';

import Link from 'next/link';
import { Code2, FileText, Scale, ShieldCheck } from 'lucide-react';
import { usePrefs, type Bi } from '@/lib/prefs';

const PRINCIPLES: { icon: React.ElementType; title: Bi; body: Bi }[] = [
  { icon: ShieldCheck, title: { en: 'Official channels come first', ar: 'القنوات الرسمية أولًا' }, body: { en: 'Cell broadcast alerts and sirens from the National Early Warning Platform are authoritative. This project is designed to sit beside them, never in their place.', ar: 'تنبيهات البث الخلوي وصفارات الإنذار من المنصة الوطنية للإنذار المبكر هي المرجع المعتمد. صُمّم هذا المشروع ليكون بجانبها، لا بديلًا عنها.' } },
  { icon: Scale, title: { en: 'Fictional until approved', ar: 'افتراضي حتى الاعتماد' }, body: { en: 'Every drill uses fictional data and demo keys. Live alerts could only ever come from an authorised issuer, after formal approval.', ar: 'كل تمرين يستخدم بيانات افتراضية ومفاتيح تجريبية. لا يمكن أن تأتي التنبيهات الحقيقية إلا من جهة مصدِرة مخوّلة وبعد اعتماد رسمي.' } },
  { icon: Code2, title: { en: 'Open and tested', ar: 'مفتوح ومُختبَر' }, body: { en: 'The code, tests and safety boundaries are published so anyone can check how it works.', ar: 'الشيفرة والاختبارات وحدود السلامة منشورة ليتمكن أي شخص من التحقق من طريقة عمله.' } },
  { icon: FileText, title: { en: 'Private by design', ar: 'الخصوصية في التصميم' }, body: { en: 'No accounts, no analytics, no location. Plans and checklists stay in your browser.', ar: 'بلا حسابات ولا تحليلات ولا موقع. تبقى الخطط والقوائم في متصفحك.' } },
];

export function AboutView() {
  const { t } = usePrefs();
  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">{t({ en: 'About', ar: 'عن المشروع' })}</p>
        <h1 className="h1">{t({ en: 'An independent project for public safety', ar: 'مشروع مستقل من أجل السلامة العامة' })}</h1>
        <p className="lead">
          {t({
            en: 'Saudi Shield is an independent, non-commercial prototype. It is not affiliated with, endorsed by or operated on behalf of any government entity, and it does not use official emblems. The name is a working title.',
            ar: 'درع السعودية نموذج أولي مستقل وغير تجاري. لا يتبع أي جهة حكومية ولا يحظى بتأييدها ولا يُشغَّل نيابة عنها، ولا يستخدم أي شعارات رسمية. الاسم مؤقت.',
          })}
        </p>
      </header>
      <div className="grid g2" style={{ marginTop: 32 }}>
        {PRINCIPLES.map((p, i) => (
          <div key={i} className="card">
            <span className="icon-tile"><p.icon size={24} aria-hidden /></span>
            <h3>{t(p.title)}</h3>
            <p>{t(p.body)}</p>
          </div>
        ))}
      </div>
      <section className="section">
        <div className="card" style={{ padding: 32 }}>
          <h2 className="h2">{t({ en: 'For civil-protection professionals', ar: 'لمختصي الحماية المدنية' })}</h2>
          <p className="lead" style={{ marginTop: 12 }}>
            {t({
              en: 'The full prototype includes an authority dashboard with separation of duties, a scenario simulator, a signed public feed and a civilian app. Its research, architecture, safety boundaries and test results are documented in the repository.',
              ar: 'يتضمن النموذج الأولي الكامل لوحة تحكم للجهات المختصة مع فصل المهام، ومحاكي سيناريوهات، وموجزًا عامًا موقّعًا، وتطبيقًا للمدنيين. البحث والبنية وحدود السلامة ونتائج الاختبارات موثّقة في المستودع.',
            })}
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <a className="btn btn-primary" href="https://github.com/PythonistaAbbey/Saudi_Sheild" rel="noopener">
              <Code2 size={18} aria-hidden /> {t({ en: 'View the source and docs', ar: 'اطّلع على الشيفرة والوثائق' })}
            </a>
            <Link className="btn btn-ghost" href="/drill/">{t({ en: 'Try the fictional drill', ar: 'جرّب التمرين الافتراضي' })}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
