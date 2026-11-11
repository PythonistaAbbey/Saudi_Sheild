import type { AlertLevel, HazardCode, InstructionCode, Lang } from './types';

type Bi = { ar: string; en: string };

export const LEVELS: Record<AlertLevel, { label: Bi; meaning: Bi }> = {
  yellow: {
    label: { ar: 'أصفر', en: 'Yellow' },
    meaning: { ar: 'تم رصد خطر وقد يحدث', en: 'A risk has been detected and may occur' },
  },
  red: {
    label: { ar: 'أحمر', en: 'Red' },
    meaning: { ar: 'وقع الخطر', en: 'Danger has occurred' },
  },
  white: {
    label: { ar: 'أبيض', en: 'White' },
    meaning: { ar: 'انتهى الخطر', en: 'Danger has ended' },
  },
};

export const HAZARDS: Record<HazardCode, Bi> = {
  aerial_threat: { ar: 'تهديد جوي', en: 'Aerial threat' },
  sandstorm: { ar: 'عاصفة رملية', en: 'Sandstorm' },
  flash_flood: { ar: 'سيول مفاجئة', en: 'Flash flood' },
  extreme_heat: { ar: 'حرارة شديدة', en: 'Extreme heat' },
  fire: { ar: 'حريق', en: 'Fire' },
  earthquake: { ar: 'زلزال', en: 'Earthquake' },
  hazmat: { ar: 'مواد خطرة', en: 'Hazardous materials' },
};

/** Pre-approved instruction wording. In a real deployment this table is signed off by the authority. */
export const INSTRUCTIONS: Record<InstructionCode, Bi> = {
  SHELTER_INTERIOR_ROOM: {
    ar: 'توجّه فورًا إلى أقرب مكان آمن داخل مبنى، في غرفة داخلية.',
    en: 'Go now to the nearest safe place indoors, in an interior room.',
  },
  AVOID_WINDOWS: {
    ar: 'ابتعد عن النوافذ والزجاج والشرفات والأسطح.',
    en: 'Keep away from windows, glass, balconies and rooftops.',
  },
  STAY_INDOORS_UNTIL_CLEAR: {
    ar: 'ابقَ في الداخل حتى يُعلَن انتهاء الخطر.',
    en: 'Stay indoors until the danger is declared over.',
  },
  IF_OUTDOORS_SEEK_BUILDING: {
    ar: 'إذا كنت في الخارج، ادخل أقرب مبنى أو احتمِ خلف حاجز صلب.',
    en: 'If you are outside, enter the nearest building or shelter behind a solid barrier.',
  },
  DRIVERS_PULL_OVER: {
    ar: 'إذا كنت تقود، توقّف بأمان بعيدًا عن الجسور والمباني العالية.',
    en: 'If you are driving, pull over safely away from bridges and tall buildings.',
  },
  DO_NOT_FILM_OR_GATHER: {
    ar: 'لا تتجمّع ولا تصوّر في المواقع الخطرة، ولا تنشر الصور.',
    en: 'Do not gather at or film dangerous sites, and do not share images.',
  },
  DO_NOT_TOUCH_DEBRIS: {
    ar: 'لا تقترب من أي أجسام أو حطام غير معروف ولا تلمسه، وأبلغ الجهات المختصة.',
    en: 'Do not approach or touch unknown objects or debris. Report them to the authorities.',
  },
  FOLLOW_OFFICIAL_CHANNELS: {
    ar: 'تابع التحديثات من القنوات الرسمية فقط.',
    en: 'Follow updates from official channels only.',
  },
  CLOSE_DOORS_WINDOWS: {
    ar: 'أغلق الأبواب والنوافذ وفتحات التهوية.',
    en: 'Close doors, windows and air vents.',
  },
  LIMIT_OUTDOOR_ACTIVITY: {
    ar: 'قلّل الخروج والأنشطة في الأماكن المفتوحة.',
    en: 'Limit time and activity outdoors.',
  },
  AVOID_VALLEYS_FLOODWATER: {
    ar: 'ابتعد عن الأودية ومجاري السيول، ولا تعبر المياه الجارية.',
    en: 'Keep away from valleys and flood channels. Do not cross moving water.',
  },
  DRINK_WATER_AVOID_SUN: {
    ar: 'اشرب الماء باستمرار وتجنّب التعرّض المباشر للشمس.',
    en: 'Drink water regularly and avoid direct sun.',
  },
  RESUME_WITH_CAUTION: {
    ar: 'يمكنك استئناف أنشطتك المعتادة بحذر.',
    en: 'You may resume normal activity with caution.',
  },
  CALL_EMERGENCY_NUMBER: {
    ar: 'في حالات الطوارئ اتصل على 911 أو 998.',
    en: 'In an emergency, call 911 or 998.',
  },
};

export const UI: Record<string, Bi> = {
  exercise: { ar: 'تمرين · افتراضي', en: 'EXERCISE · FICTIONAL' },
  prototype: {
    ar: 'نموذج أولي مستقل · بيانات تمرين افتراضية · ليست خدمة رسمية',
    en: 'Independent prototype · Fictional exercise data · Not an official service',
  },
  authoritative: {
    ar: 'تنبيهات البث الخلوي الرسمية وصفارات الإنذار هي المرجع المعتمد.',
    en: 'Official cell broadcast alerts and sirens remain authoritative.',
  },
  whatToDo: { ar: 'ماذا تفعل الآن', en: 'What to do now' },
  verified: { ar: 'موثّق', en: 'Verified' },
};

export function t(bi: Bi, lang: Lang): string {
  return bi[lang];
}

export function dir(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** Normalise Arabic-Indic digits to ASCII for comparison. */
export function normaliseDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}
