import { HAZARDS, INSTRUCTIONS, LEVELS } from '../i18n';
import { areaByCode } from '../geo';
import type { AlertRecord, AssistSuggestion, Finding, IssuerMessage, Lang } from '../types';

/**
 * AI-assist interface. Implementations receive a READ-ONLY message and return
 * text suggestions. They have no way to change level, hazard, areas,
 * instructions, timing or state, and every suggestion is labelled `aiDraft`.
 *
 * The prototype ships a deterministic rule-based provider so demos are
 * reproducible and work offline. An LLM-backed provider can implement the same
 * interface later; its output would pass through the same checker and human approval.
 */
export interface AssistProvider {
  readonly name: string;
  plainLanguage(msg: Readonly<IssuerMessage>, lang: Lang): AssistSuggestion;
  shortForm(msg: Readonly<IssuerMessage>, lang: Lang): AssistSuggestion;
  screenReader(msg: Readonly<IssuerMessage>, lang: Lang): AssistSuggestion;
  translateNote(msg: Readonly<IssuerMessage>, to: Lang): { suggestion?: AssistSuggestion; finding?: Finding };
  summarise(alerts: readonly AlertRecord[], lang: Lang): AssistSuggestion;
}

/** Simple sentence-level phrasebook of pre-approved note phrases. */
export const NOTE_PHRASEBOOK: { en: string; ar: string }[] = [
  { en: 'This is a scheduled exercise.', ar: 'هذا تمرين مجدول.' },
  { en: 'No action is needed outside the exercise zone.', ar: 'لا يلزم اتخاذ أي إجراء خارج منطقة التمرين.' },
  { en: 'Schools in the area will follow their own drill plans.', ar: 'ستتبع المدارس في المنطقة خطط التمرين الخاصة بها.' },
  { en: 'Further updates will follow.', ar: 'ستصدر تحديثات لاحقة.' },
  { en: 'Check on elderly neighbours if it is safe to do so.', ar: 'اطمئن على جيرانك من كبار السن إذا كان ذلك آمنًا.' },
  { en: 'Visibility on roads is very low.', ar: 'الرؤية على الطرق منخفضة جدًا.' },
];

function suggestion(kind: AssistSuggestion['kind'], lang: Lang, text: string, provider: string): AssistSuggestion {
  return { kind, lang, text, aiDraft: true, provider };
}

const PLAIN_STEPS: Partial<Record<string, { en: string; ar: string }>> = {
  SHELTER_INTERIOR_ROOM: { en: 'Go inside now. Pick a room in the middle of the building.', ar: 'ادخل الآن. اختر غرفة في وسط المبنى.' },
  AVOID_WINDOWS: { en: 'Stay away from windows and glass.', ar: 'ابتعد عن النوافذ والزجاج.' },
  STAY_INDOORS_UNTIL_CLEAR: { en: 'Stay inside until you hear it is over.', ar: 'ابقَ في الداخل حتى تسمع أن الخطر انتهى.' },
  IF_OUTDOORS_SEEK_BUILDING: { en: 'Outside? Go into the closest building.', ar: 'في الخارج؟ ادخل أقرب مبنى.' },
  DRIVERS_PULL_OVER: { en: 'Driving? Stop the car in a safe place, not under a bridge.', ar: 'تقود؟ أوقف السيارة في مكان آمن، ليس تحت جسر.' },
  DO_NOT_FILM_OR_GATHER: { en: 'Do not take photos or videos. Do not go to look.', ar: 'لا تصوّر. لا تذهب لتنظر.' },
  DO_NOT_TOUCH_DEBRIS: { en: 'Do not touch anything strange you find. Tell the authorities.', ar: 'لا تلمس أي شيء غريب تجده. أبلغ الجهات المختصة.' },
  FOLLOW_OFFICIAL_CHANNELS: { en: 'Only trust official news.', ar: 'ثق بالأخبار الرسمية فقط.' },
  CLOSE_DOORS_WINDOWS: { en: 'Close doors and windows.', ar: 'أغلق الأبواب والنوافذ.' },
  LIMIT_OUTDOOR_ACTIVITY: { en: 'Stay inside if you can.', ar: 'ابقَ في الداخل إن استطعت.' },
  AVOID_VALLEYS_FLOODWATER: { en: 'Keep away from valleys and running water.', ar: 'ابتعد عن الأودية والمياه الجارية.' },
  DRINK_WATER_AVOID_SUN: { en: 'Drink water. Stay in the shade.', ar: 'اشرب الماء. ابقَ في الظل.' },
  RESUME_WITH_CAUTION: { en: 'You can go back to normal. Be careful.', ar: 'يمكنك العودة لحياتك المعتادة. كن حذرًا.' },
  CALL_EMERGENCY_NUMBER: { en: 'Need help? Call 911 or 998.', ar: 'تحتاج مساعدة؟ اتصل على 911 أو 998.' },
};

export class RuleBasedAssist implements AssistProvider {
  readonly name = 'rule-based-assist-v1';

  plainLanguage(msg: Readonly<IssuerMessage>, lang: Lang): AssistSuggestion {
    const hazard = HAZARDS[msg.hazard][lang];
    const intro =
      msg.level === 'red'
        ? lang === 'ar'
          ? `خطر الآن: ${hazard}.`
          : `Danger now: ${hazard.toLowerCase()}.`
        : msg.level === 'yellow'
          ? lang === 'ar'
            ? `انتبه: قد يحدث خطر (${hazard}).`
            : `Be ready: there may be danger (${hazard.toLowerCase()}).`
          : lang === 'ar'
            ? 'انتهى الخطر.'
            : 'The danger is over.';
    const steps = msg.instructions.map((c) => PLAIN_STEPS[c]?.[lang] ?? INSTRUCTIONS[c][lang]);
    return suggestion('plain_language', lang, [intro, ...steps].join(' '), this.name);
  }

  shortForm(msg: Readonly<IssuerMessage>, lang: Lang): AssistSuggestion {
    const lvl = LEVELS[msg.level].label[lang];
    const first = msg.instructions[0] ? (PLAIN_STEPS[msg.instructions[0]]?.[lang] ?? '') : '';
    const area = areaByCode(msg.areas[0])?.name[lang] ?? '';
    const text = `${lvl} · ${HAZARDS[msg.hazard][lang]} · ${area}. ${first}`.trim();
    return suggestion('short_form', lang, text.length > 160 ? text.slice(0, 157) + '…' : text, this.name);
  }

  screenReader(msg: Readonly<IssuerMessage>, lang: Lang): AssistSuggestion {
    const lvl = LEVELS[msg.level];
    const parts =
      lang === 'ar'
        ? [`مستوى التنبيه ${lvl.label.ar}. ${lvl.meaning.ar}.`, `نوع الخطر: ${HAZARDS[msg.hazard].ar}.`, 'الخطوات:']
        : [`Alert level ${lvl.label.en}. ${lvl.meaning.en}.`, `Hazard: ${HAZARDS[msg.hazard].en}.`, 'Steps:'];
    msg.instructions.forEach((c, i) => parts.push(`${i + 1}. ${INSTRUCTIONS[c][lang]}`));
    return suggestion('screen_reader', lang, parts.join(' '), this.name);
  }

  translateNote(msg: Readonly<IssuerMessage>, to: Lang): { suggestion?: AssistSuggestion; finding?: Finding } {
    const from: Lang = to === 'ar' ? 'en' : 'ar';
    const src = msg.note?.[from];
    if (!src) return {};
    const sentences = src
      .split(/(?<=[.!؟?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const out: string[] = [];
    for (const s of sentences) {
      const hit = NOTE_PHRASEBOOK.find((p) => p[from] === s);
      if (!hit) {
        return {
          finding: {
            code: 'NEEDS_HUMAN_TRANSLATOR',
            severity: 'blocking',
            message: {
              en: `No approved translation for: "${s}". A qualified translator must review this note.`,
              ar: `لا توجد ترجمة معتمدة لـ: "${s}". يجب أن يراجع مترجم مؤهل هذه الملاحظة.`,
            },
          },
        };
      }
      out.push(hit[to]);
    }
    return { suggestion: suggestion('note_translation', to, out.join(' '), this.name) };
  }

  summarise(alerts: readonly AlertRecord[], lang: Lang): AssistSuggestion {
    const active = alerts.filter((a) => a.state === 'PUBLISHED');
    const pending = alerts.filter((a) => ['VERIFIED', 'IN_REVIEW', 'APPROVED'].includes(a.state));
    const quarantined = alerts.filter((a) => a.state === 'QUARANTINED');
    const lines =
      lang === 'ar'
        ? [
            `ملخص (مسودة آلية للمراجعة): ${active.length} تنبيه منشور، ${pending.length} قيد المعالجة، ${quarantined.length} معزول.`,
            ...active.map((a) => `• ${LEVELS[a.message.level].label.ar} · ${HAZARDS[a.message.hazard].ar} · ${a.message.areas.map((c) => areaByCode(c)?.name.ar ?? c).join('، ')}`),
          ]
        : [
            `Summary (AI draft for review): ${active.length} published, ${pending.length} in progress, ${quarantined.length} quarantined.`,
            ...active.map((a) => `• ${LEVELS[a.message.level].label.en} · ${HAZARDS[a.message.hazard].en} · ${a.message.areas.map((c) => areaByCode(c)?.name.en ?? c).join(', ')}`),
          ];
    return suggestion('summary', lang, lines.join('\n'), this.name);
  }
}
