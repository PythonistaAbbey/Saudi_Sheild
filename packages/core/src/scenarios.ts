import { DEMO_ISSUER, DEMO_ISSUER_KEY, UNREGISTERED_KEY, sign } from './crypto';
import type { HazardCode, InstructionCode, IssuerMessage, LocalizedText, SignedEnvelope } from './types';

/**
 * Synthetic, clearly fictional exercise scenarios. Every message has CAP
 * status "Exercise", uses a published demo key, and targets fictional
 * exercise zones. None of them represents a real event.
 */

export type StepKind = 'issue' | 'issue_tampered' | 'issue_unknown_key';

export interface ScenarioStep {
  id: string;
  kind: StepKind;
  label: LocalizedText & { en: string; ar: string };
  /** Builds the issuer message relative to `now`. `prev` holds identifiers issued earlier in this run. */
  build: (now: Date, run: string) => IssuerMessage;
  /** Expected pipeline outcome, shown in the simulator. */
  expect: 'publishable' | 'quarantined' | 'blocked_by_checker';
}

export interface Scenario {
  id: string;
  title: LocalizedText & { en: string; ar: string };
  summary: LocalizedText & { en: string; ar: string };
  steps: ScenarioStep[];
}

const iso = (d: Date, plusMin = 0) => new Date(d.getTime() + plusMin * 60_000).toISOString();

function msg(
  run: string,
  n: string,
  now: Date,
  o: {
    level: IssuerMessage['level'];
    hazard: HazardCode;
    areas: string[];
    instructions: InstructionCode[];
    msgType?: IssuerMessage['msgType'];
    refs?: string[];
    note?: LocalizedText;
    validMin?: number;
  },
): IssuerMessage {
  return {
    identifier: `EX-${run}-${n}`,
    sender: DEMO_ISSUER.id,
    sent: iso(now),
    status: 'Exercise',
    msgType: o.msgType ?? 'Alert',
    references: o.refs?.map((r) => `EX-${run}-${r}`),
    level: o.level,
    hazard: o.hazard,
    areas: o.areas,
    instructions: o.instructions,
    expires: iso(now, o.validMin ?? 90),
    note: o.note,
  };
}

const SHELTER: InstructionCode[] = [
  'SHELTER_INTERIOR_ROOM',
  'AVOID_WINDOWS',
  'IF_OUTDOORS_SEEK_BUILDING',
  'DRIVERS_PULL_OVER',
  'DO_NOT_FILM_OR_GATHER',
  'FOLLOW_OFFICIAL_CHANNELS',
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'aerial-drill-riyadh',
    title: { en: 'Aerial threat drill · Riyadh exercise zone', ar: 'تمرين تهديد جوي · منطقة تمرين الرياض' },
    summary: {
      en: 'A fictional Yellow alert escalates to Red, then the issuer declares White (danger has ended).',
      ar: 'إنذار أصفر افتراضي يتصاعد إلى أحمر، ثم تعلن الجهة المصدرة اللون الأبيض (انتهى الخطر).',
    },
    steps: [
      {
        id: 'yellow',
        kind: 'issue',
        label: { en: 'Issuer sends Yellow alert', ar: 'الجهة المصدرة ترسل إنذارًا أصفر' },
        expect: 'publishable',
        build: (now, run) =>
          msg(run, '1', now, {
            level: 'yellow',
            hazard: 'aerial_threat',
            areas: ['EX-RIY-A', 'EX-RIY-B'],
            instructions: ['STAY_INDOORS_UNTIL_CLEAR', 'AVOID_WINDOWS', 'FOLLOW_OFFICIAL_CHANNELS'],
            note: { en: 'This is a scheduled exercise.', ar: 'هذا تمرين مجدول.' },
          }),
      },
      {
        id: 'red',
        kind: 'issue',
        label: { en: 'Issuer updates to Red', ar: 'الجهة المصدرة تحدّث إلى أحمر' },
        expect: 'publishable',
        build: (now, run) =>
          msg(run, '2', now, {
            level: 'red',
            hazard: 'aerial_threat',
            msgType: 'Update',
            refs: ['1'],
            areas: ['EX-RIY-A', 'EX-RIY-B'],
            instructions: [...SHELTER, 'STAY_INDOORS_UNTIL_CLEAR'],
            note: { en: 'This is a scheduled exercise.', ar: 'هذا تمرين مجدول.' },
          }),
      },
      {
        id: 'white',
        kind: 'issue',
        label: { en: 'Issuer declares White (all clear)', ar: 'الجهة المصدرة تعلن الأبيض (انتهى الخطر)' },
        expect: 'publishable',
        build: (now, run) =>
          msg(run, '3', now, {
            level: 'white',
            hazard: 'aerial_threat',
            msgType: 'Update',
            refs: ['2'],
            areas: ['EX-RIY-A', 'EX-RIY-B'],
            instructions: ['RESUME_WITH_CAUTION', 'DO_NOT_TOUCH_DEBRIS', 'CALL_EMERGENCY_NUMBER'],
            validMin: 60,
          }),
      },
    ],
  },
  {
    id: 'sandstorm-east',
    title: { en: 'Sandstorm advisory · Eastern exercise zones', ar: 'تنبيه عاصفة رملية · مناطق تمرين الشرقية' },
    summary: {
      en: 'A Yellow sandstorm advisory with an English-only note. The assistant proposes an Arabic translation from the approved phrasebook.',
      ar: 'تنبيه أصفر لعاصفة رملية مع ملاحظة بالإنجليزية فقط. يقترح المساعد ترجمة عربية من قاموس العبارات المعتمدة.',
    },
    steps: [
      {
        id: 'yellow',
        kind: 'issue',
        label: { en: 'Issuer sends Yellow advisory (English note only)', ar: 'تنبيه أصفر (ملاحظة إنجليزية فقط)' },
        expect: 'publishable',
        build: (now, run) =>
          msg(run, '1', now, {
            level: 'yellow',
            hazard: 'sandstorm',
            areas: ['EX-EAS-A', 'EX-EAS-B'],
            instructions: ['CLOSE_DOORS_WINDOWS', 'LIMIT_OUTDOOR_ACTIVITY', 'DRIVERS_PULL_OVER', 'FOLLOW_OFFICIAL_CHANNELS'],
            note: { en: 'This is a scheduled exercise. Visibility on roads is very low.' },
            validMin: 240,
          }),
      },
      {
        id: 'white',
        kind: 'issue',
        label: { en: 'Issuer declares White', ar: 'الجهة المصدرة تعلن الأبيض' },
        expect: 'publishable',
        build: (now, run) =>
          msg(run, '2', now, {
            level: 'white',
            hazard: 'sandstorm',
            msgType: 'Update',
            refs: ['1'],
            areas: ['EX-EAS-A', 'EX-EAS-B'],
            instructions: ['RESUME_WITH_CAUTION'],
            validMin: 60,
          }),
      },
    ],
  },
  {
    id: 'flood-south',
    title: { en: 'Flash flood · Asir and Jazan exercise zones', ar: 'سيول مفاجئة · مناطق تمرين عسير وجازان' },
    summary: {
      en: 'A Red flash-flood warning, then White.',
      ar: 'إنذار أحمر بسيول مفاجئة، ثم الأبيض.',
    },
    steps: [
      {
        id: 'red',
        kind: 'issue',
        label: { en: 'Issuer sends Red flood warning', ar: 'الجهة المصدرة ترسل إنذار سيول أحمر' },
        expect: 'publishable',
        build: (now, run) =>
          msg(run, '1', now, {
            level: 'red',
            hazard: 'flash_flood',
            areas: ['EX-ASR-A', 'EX-JAZ-A'],
            instructions: ['AVOID_VALLEYS_FLOODWATER', 'DRIVERS_PULL_OVER', 'STAY_INDOORS_UNTIL_CLEAR', 'CALL_EMERGENCY_NUMBER', 'FOLLOW_OFFICIAL_CHANNELS'],
            validMin: 180,
          }),
      },
      {
        id: 'white',
        kind: 'issue',
        label: { en: 'Issuer declares White', ar: 'الجهة المصدرة تعلن الأبيض' },
        expect: 'publishable',
        build: (now, run) =>
          msg(run, '2', now, {
            level: 'white',
            hazard: 'flash_flood',
            msgType: 'Update',
            refs: ['1'],
            areas: ['EX-ASR-A', 'EX-JAZ-A'],
            instructions: ['RESUME_WITH_CAUTION', 'AVOID_VALLEYS_FLOODWATER'],
            validMin: 60,
          }),
      },
    ],
  },
  {
    id: 'integrity-failures',
    title: { en: 'Integrity failures · tampered and unknown-key messages', ar: 'إخفاقات السلامة · رسائل معدّلة ومفاتيح غير معروفة' },
    summary: {
      en: 'One message is altered after signing; another is signed with an unregistered key. Both are quarantined and can never be published.',
      ar: 'رسالة تُعدَّل بعد توقيعها، وأخرى موقّعة بمفتاح غير مسجّل. كلتاهما تُعزلان ولا يمكن نشرهما.',
    },
    steps: [
      {
        id: 'tampered',
        kind: 'issue_tampered',
        label: { en: 'Message altered in transit (level changed)', ar: 'رسالة عُدّلت أثناء النقل (تغيّر المستوى)' },
        expect: 'quarantined',
        build: (now, run) =>
          msg(run, '1', now, { level: 'yellow', hazard: 'fire', areas: ['EX-MKK-A'], instructions: ['CLOSE_DOORS_WINDOWS', 'FOLLOW_OFFICIAL_CHANNELS'] }),
      },
      {
        id: 'unknown',
        kind: 'issue_unknown_key',
        label: { en: 'Message signed with an unregistered key', ar: 'رسالة موقّعة بمفتاح غير مسجّل' },
        expect: 'quarantined',
        build: (now, run) =>
          msg(run, '2', now, { level: 'red', hazard: 'hazmat', areas: ['EX-EAS-A'], instructions: ['SHELTER_INTERIOR_ROOM', 'CLOSE_DOORS_WINDOWS'] }),
      },
    ],
  },
  {
    id: 'unclear-content',
    title: { en: 'Unclear content · conflicting and speculative wording', ar: 'محتوى غير واضح · صياغة متعارضة وتخمينية' },
    summary: {
      en: 'Two genuine signed messages whose notes contain problems. The checker blocks approval until the issuer clarifies.',
      ar: 'رسالتان موقّعتان صحيحتان تتضمن ملاحظاتهما مشكلات. يمنع المدقق الاعتماد حتى توضّح الجهة المصدرة.',
    },
    steps: [
      {
        id: 'conflict',
        kind: 'issue',
        label: { en: 'Note says "evacuate" but instructions say shelter', ar: 'الملاحظة تقول "إخلاء" والتعليمات تقول احتمِ' },
        expect: 'blocked_by_checker',
        build: (now, run) =>
          msg(run, '1', now, {
            level: 'red',
            hazard: 'hazmat',
            areas: ['EX-QAS-A'],
            instructions: ['SHELTER_INTERIOR_ROOM', 'CLOSE_DOORS_WINDOWS', 'FOLLOW_OFFICIAL_CHANNELS'],
            note: { en: 'Residents should evacuate the area.', ar: 'على السكان إخلاء المنطقة.' },
          }),
      },
      {
        id: 'speculative',
        kind: 'issue',
        label: { en: 'Note contains speculative wording', ar: 'الملاحظة تتضمن صياغة تخمينية' },
        expect: 'blocked_by_checker',
        build: (now, run) =>
          msg(run, '2', now, {
            level: 'yellow',
            hazard: 'aerial_threat',
            areas: ['EX-HAI-A'],
            instructions: ['STAY_INDOORS_UNTIL_CLEAR', 'FOLLOW_OFFICIAL_CHANNELS'],
            note: { en: 'Debris may fall near the northern districts.', ar: 'سقوط متوقع لحطام قرب الأحياء الشمالية.' },
          }),
      },
    ],
  },
];

export function scenarioById(id: string) {
  return SCENARIOS.find((s) => s.id === id);
}

/** Produce the signed envelope for a step, applying the step's failure mode if any. */
export function envelopeForStep(step: ScenarioStep, now: Date, run: string): SignedEnvelope {
  const m = step.build(now, run);
  if (step.kind === 'issue_unknown_key') return sign(m, UNREGISTERED_KEY);
  const env = sign(m, DEMO_ISSUER_KEY);
  if (step.kind === 'issue_tampered') return { ...env, payload: { ...env.payload, level: 'red' } };
  return env;
}
