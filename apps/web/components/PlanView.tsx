'use client';

import { useState } from 'react';
import { Backpack, Check, Copy, Lock, Plus, Printer, RotateCcw, Share2, Trash2, Users } from 'lucide-react';
import { useLocal, usePrefs, type Bi } from '@/lib/prefs';

interface Member { name: string; phone: string; needs: string }
interface Plan {
  household: string;
  safeHome: string;
  safeWork: string;
  meetNear: string;
  meetFar: string;
  contactName: string;
  contactPhone: string;
  checkIn: string;
  members: Member[];
  notes: string;
}

const EMPTY: Plan = {
  household: '', safeHome: '', safeWork: '', meetNear: '', meetFar: '', contactName: '', contactPhone: '',
  checkIn: '', members: [{ name: '', phone: '', needs: '' }], notes: '',
};

export const BAG: { id: string; group: Bi; item: Bi }[] = [
  { id: 'water', group: { en: 'Essentials', ar: 'الأساسيات' }, item: { en: 'Water: about 3 litres per person per day, for 3 days', ar: 'ماء: نحو 3 لترات للشخص يوميًا لمدة 3 أيام' } },
  { id: 'food', group: { en: 'Essentials', ar: 'الأساسيات' }, item: { en: 'Food that keeps: dates, tins, biscuits, and a tin opener', ar: 'طعام لا يفسد: تمر ومعلّبات وبسكويت، وفتّاحة علب' } },
  { id: 'meds', group: { en: 'Essentials', ar: 'الأساسيات' }, item: { en: 'Prescription medicines for at least a week', ar: 'الأدوية الموصوفة لمدة أسبوع على الأقل' } },
  { id: 'firstaid', group: { en: 'Essentials', ar: 'الأساسيات' }, item: { en: 'First-aid kit', ar: 'حقيبة إسعافات أولية' } },
  { id: 'torch', group: { en: 'Power and light', ar: 'الطاقة والإضاءة' }, item: { en: 'Torch and spare batteries', ar: 'مصباح يدوي وبطاريات احتياطية' } },
  { id: 'power', group: { en: 'Power and light', ar: 'الطاقة والإضاءة' }, item: { en: 'Charged power bank and phone cable', ar: 'شاحن متنقل مشحون وكابل للهاتف' } },
  { id: 'radio', group: { en: 'Power and light', ar: 'الطاقة والإضاءة' }, item: { en: 'Battery or wind-up radio', ar: 'راديو يعمل بالبطارية أو باليد' } },
  { id: 'docs', group: { en: 'Documents', ar: 'المستندات' }, item: { en: 'Copies of ID, Iqama or passport, in a waterproof bag', ar: 'نسخ من الهوية أو الإقامة أو جواز السفر في كيس مقاوم للماء' } },
  { id: 'contacts', group: { en: 'Documents', ar: 'المستندات' }, item: { en: 'Printed family plan and contact numbers', ar: 'خطة الأسرة وأرقام الاتصال مطبوعة' } },
  { id: 'cash', group: { en: 'Documents', ar: 'المستندات' }, item: { en: 'Some cash in small notes', ar: 'مبلغ نقدي بفئات صغيرة' } },
  { id: 'masks', group: { en: 'Protection', ar: 'الحماية' }, item: { en: 'Face masks for dust', ar: 'كمامات للغبار' } },
  { id: 'whistle', group: { en: 'Protection', ar: 'الحماية' }, item: { en: 'Whistle to signal for help', ar: 'صافرة لطلب المساعدة' } },
  { id: 'clothes', group: { en: 'Protection', ar: 'الحماية' }, item: { en: 'Sturdy shoes and a change of clothes', ar: 'حذاء متين وملابس بديلة' } },
  { id: 'special', group: { en: 'Family needs', ar: 'احتياجات الأسرة' }, item: { en: 'Baby supplies, glasses, hearing-aid batteries or mobility aids', ar: 'مستلزمات الأطفال والنظارات وبطاريات السماعات أو أدوات الحركة' } },
];

export function PlanView() {
  const { t } = usePrefs();
  const [plan, setPlan, loaded] = useLocal<Plan>('ss-web-plan', EMPTY);
  const [bag, setBag] = useLocal<Record<string, boolean>>('ss-web-bag', {});
  const [copied, setCopied] = useState(false);

  const up = (k: keyof Plan) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPlan((p) => ({ ...p, [k]: e.target.value }));
  const upMember = (i: number, k: keyof Member, v: string) =>
    setPlan((p) => ({ ...p, members: p.members.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));

  const done = BAG.filter((b) => bag[b.id]).length;
  const pct = Math.round((done / BAG.length) * 100);
  const groups = Array.from(new Set(BAG.map((b) => b.group.en)));

  const asText = () => {
    const L = (en: string, ar: string) => t({ en, ar });
    const lines = [
      `${L('Family emergency plan', 'خطة الأسرة للطوارئ')}${plan.household ? ` · ${plan.household}` : ''}`,
      `${L('Safe room at home', 'الغرفة الآمنة في المنزل')}: ${plan.safeHome || '-'}`,
      `${L('Safe room at work or school', 'الغرفة الآمنة في العمل أو المدرسة')}: ${plan.safeWork || '-'}`,
      `${L('Meeting point near home', 'نقطة الالتقاء قرب المنزل')}: ${plan.meetNear || '-'}`,
      `${L('Meeting point outside the area', 'نقطة الالتقاء خارج الحي')}: ${plan.meetFar || '-'}`,
      `${L('Contact outside the area', 'جهة اتصال خارج المنطقة')}: ${plan.contactName || '-'} ${plan.contactPhone}`,
      `${L('How we check in', 'طريقة الاطمئنان')}: ${plan.checkIn || '-'}`,
      ...plan.members.filter((m) => m.name).map((m) => `• ${m.name} ${m.phone}${m.needs ? ` (${m.needs})` : ''}`),
      plan.notes ? `${L('Notes', 'ملاحظات')}: ${plan.notes}` : '',
      L('Emergency: 911 · Civil Defense 998 · Ambulance 997 · Police 999', 'الطوارئ: 911 · الدفاع المدني 998 · الإسعاف 997 · الشرطة 999'),
    ];
    return lines.filter(Boolean).join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ text: asText() }).catch(() => undefined);
    else copy();
  };

  const F = ({ k, label, hint, ph }: { k: keyof Plan; label: Bi; hint?: Bi; ph?: Bi }) => (
    // Called as a function (not <F/>) so inputs keep focus between renders.
    <div className="field">
      <label htmlFor={`f-${k}`}>{t(label)}</label>
      <input id={`f-${k}`} className="input" value={plan[k] as string} onChange={up(k)} placeholder={ph ? t(ph) : undefined} />
      {hint && <span className="hint">{t(hint)}</span>}
    </div>
  );

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">{t({ en: 'Family plan', ar: 'خطة الأسرة' })}</p>
        <h1 className="h1">{t({ en: 'One plan, agreed in advance', ar: 'خطة واحدة متفق عليها مسبقًا' })}</h1>
        <p className="lead">
          {t({
            en: 'Families that agree where to shelter and how to check in spend less time on the phone and more time safe. Fill in what you can, then print it or share it with your family.',
            ar: 'الأسر التي تتفق مسبقًا على مكان الاحتماء وطريقة الاطمئنان تقضي وقتًا أقل على الهاتف ووقتًا أكثر في أمان. املأ ما تستطيع ثم اطبعها أو شاركها مع أسرتك.',
          })}
        </p>
        <div className="callout" style={{ marginTop: 20 }}>
          <Lock size={20} aria-hidden />
          <p>{t({ en: 'Your plan is saved only in this browser on this device. Nothing is sent anywhere.', ar: 'تُحفظ خطتك في هذا المتصفح على هذا الجهاز فقط. لا يُرسل أي شيء إلى أي مكان.' })}</p>
        </div>
      </header>

      <section className="section" style={{ paddingTop: 32 }} aria-labelledby="plan-h">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 id="plan-h" className="h2" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Users aria-hidden style={{ color: 'var(--green-700)' }} /> {t({ en: 'Your plan', ar: 'خطتك' })}</h2>
          <div className="row no-print">
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={16} aria-hidden /> {t({ en: 'Print card', ar: 'اطبع البطاقة' })}</button>
            <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? t({ en: 'Copied', ar: 'تم النسخ' }) : t({ en: 'Copy as text', ar: 'انسخ كنص' })}</button>
            <button className="btn btn-primary btn-sm" onClick={share}><Share2 size={16} aria-hidden /> {t({ en: 'Share with family', ar: 'شاركها مع الأسرة' })}</button>
          </div>
        </div>
        {loaded && (
          <div className="grid g2">
            <div className="card" style={{ display: 'grid', gap: 16 }}>
              {F({ k: 'household', label: { en: 'Household name', ar: 'اسم الأسرة' }, ph: { en: 'e.g. The Al-Harbi family', ar: 'مثال: أسرة الحربي' }, })}
              {F({ k: 'safeHome', label: { en: 'Safe room at home', ar: 'الغرفة الآمنة في المنزل' }, hint: { en: 'Interior room, few or no windows', ar: 'غرفة داخلية بنوافذ قليلة أو بلا نوافذ' }, ph: { en: 'e.g. Inner hallway, ground floor', ar: 'مثال: الممر الداخلي، الطابق الأرضي' }, })}
              {F({ k: 'safeWork', label: { en: 'Safe room at work or school', ar: 'الغرفة الآمنة في العمل أو المدرسة' }, })}
              {F({ k: 'meetNear', label: { en: 'Meeting point near home', ar: 'نقطة الالتقاء قرب المنزل' }, ph: { en: 'e.g. Neighbourhood mosque car park', ar: 'مثال: موقف مسجد الحي' }, })}
              {F({ k: 'meetFar', label: { en: 'Meeting point outside the area', ar: 'نقطة الالتقاء خارج الحي' }, hint: { en: 'In case you cannot get home', ar: 'في حال تعذّر الوصول إلى المنزل' }, })}
            </div>
            <div className="card" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              {F({ k: 'contactName', label: { en: 'Contact outside the area', ar: 'جهة اتصال خارج المنطقة' }, hint: { en: 'Someone everyone can update if local lines are busy', ar: 'شخص يمكن للجميع إبلاغه إذا كانت الخطوط المحلية مشغولة' }, })}
              {F({ k: 'contactPhone', label: { en: 'Their phone number', ar: 'رقم هاتفه' }, })}
              <div className="field">
                <label htmlFor="f-checkIn">{t({ en: 'How we check in', ar: 'طريقة الاطمئنان' })}</label>
                <textarea id="f-checkIn" className="textarea" value={plan.checkIn} onChange={up('checkIn')} placeholder={t({ en: 'e.g. Send “Safe” in the family group, then wait. Call only if someone has not replied in 30 minutes.', ar: 'مثال: أرسل «بخير» في مجموعة الأسرة ثم انتظر. اتصل فقط إذا لم يرد أحد خلال 30 دقيقة.' })} />
              </div>
              <div className="field">
                <label htmlFor="f-notes">{t({ en: 'Other notes', ar: 'ملاحظات أخرى' })}</label>
                <textarea id="f-notes" className="textarea" value={plan.notes} onChange={up('notes')} placeholder={t({ en: 'Medical needs, who collects the children, pets…', ar: 'احتياجات طبية، من يحضر الأطفال، الحيوانات الأليفة…' })} />
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 20 }}>
          <h3>{t({ en: 'Family members', ar: 'أفراد الأسرة' })}</h3>
          <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
            {plan.members.map((m, i) => (
              <div key={i} className="member">
                <div className="field">
                  <label htmlFor={`m-n-${i}`}>{t({ en: 'Name', ar: 'الاسم' })}</label>
                  <input id={`m-n-${i}`} className="input" value={m.name} onChange={(e) => upMember(i, 'name', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`m-p-${i}`}>{t({ en: 'Phone and any needs', ar: 'الهاتف وأي احتياجات' })}</label>
                  <input id={`m-p-${i}`} className="input" value={m.phone} onChange={(e) => upMember(i, 'phone', e.target.value)} />
                </div>
                <button
                  className="btn btn-ghost btn-sm no-print"
                  aria-label={t({ en: 'Remove member', ar: 'احذف الفرد' })}
                  onClick={() => setPlan((p) => ({ ...p, members: p.members.filter((_, j) => j !== i) }))}
                  disabled={plan.members.length === 1}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <div className="row no-print" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPlan((p) => ({ ...p, members: [...p.members, { name: '', phone: '', needs: '' }] }))}>
              <Plus size={16} aria-hidden /> {t({ en: 'Add a person', ar: 'أضف شخصًا' })}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (confirm(t({ en: 'Clear your plan from this device?', ar: 'هل تريد مسح خطتك من هذا الجهاز؟' }))) setPlan(EMPTY);
              }}
            >
              <RotateCcw size={16} aria-hidden /> {t({ en: 'Clear plan', ar: 'امسح الخطة' })}
            </button>
          </div>
        </div>
      </section>

      <section id="bag" className="section" aria-labelledby="bag-h">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p className="eyebrow">{t({ en: 'Go-bag', ar: 'حقيبة الطوارئ' })}</p>
            <h2 id="bag-h" className="h2" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Backpack aria-hidden style={{ color: 'var(--green-700)' }} /> {t({ en: 'Pack once, check twice a year', ar: 'جهّزها مرة وراجعها مرتين في السنة' })}</h2>
          </div>
          <p style={{ fontWeight: 600 }} aria-live="polite">
            {done} / {BAG.length} {t({ en: 'packed', ar: 'جاهز' })}
          </p>
        </div>
        <div className="progress" style={{ marginTop: 16 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t({ en: 'Go-bag progress', ar: 'تقدّم تجهيز الحقيبة' })}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="grid g2" style={{ marginTop: 24 }}>
          {groups.map((g) => (
            <div key={g} className="card">
              <h3>{t(BAG.find((b) => b.group.en === g)!.group)}</h3>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {BAG.filter((b) => b.group.en === g).map((b) => (
                  <label key={b.id} className={`check ${bag[b.id] ? 'done' : ''}`}>
                    <input type="checkbox" checked={!!bag[b.id]} onChange={(e) => setBag((s) => ({ ...s, [b.id]: e.target.checked }))} />
                    <span>{t(b.item)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
