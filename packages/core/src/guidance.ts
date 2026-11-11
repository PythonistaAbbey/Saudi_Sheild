import type { HazardCode } from './types';

type Bi = { ar: string; en: string };
export interface GuidanceEntry {
  hazard: HazardCode;
  summary: Bi;
  before: Bi[];
  during: Bi[];
  after: Bi[];
  source: Bi;
}

const SRC: Bi = {
  en: 'Adapted from publicly reported Civil Defense guidance. Prototype content: confirm with official sources before relying on it.',
  ar: 'مقتبس من إرشادات الدفاع المدني المنشورة علنًا. محتوى نموذج أولي: تحقّق من المصادر الرسمية قبل الاعتماد عليه.',
};

/** Offline preparedness guidance bundled with the app (no network needed). */
export const GUIDANCE: GuidanceEntry[] = [
  {
    hazard: 'aerial_threat',
    summary: { en: 'Shelter indoors in an interior room, away from windows, until the danger is declared over.', ar: 'احتمِ داخل مبنى في غرفة داخلية بعيدًا عن النوافذ حتى يُعلن انتهاء الخطر.' },
    before: [
      { en: 'Choose the safest interior room at home and at work: few or no windows, solid walls.', ar: 'حدّد أكثر الغرف الداخلية أمانًا في المنزل والعمل: نوافذ قليلة أو بلا نوافذ وجدران صلبة.' },
      { en: 'Keep water, a torch, a charged power bank and essential medicines in that room.', ar: 'احتفظ في تلك الغرفة بالماء ومصباح وشاحن متنقل مشحون والأدوية الضرورية.' },
      { en: 'Agree with family where you will each shelter and how you will check in.', ar: 'اتفق مع أسرتك على مكان احتماء كل فرد وطريقة الاطمئنان.' },
      { en: 'Learn the siren tones and the Yellow, Red and White meanings.', ar: 'تعرّف على نغمات الصفارات ومعاني الأصفر والأحمر والأبيض.' },
    ],
    during: [
      { en: 'Go immediately to the nearest safe indoor place, an interior room.', ar: 'توجّه فورًا إلى أقرب مكان آمن داخل مبنى، في غرفة داخلية.' },
      { en: 'Keep away from windows, glass, balconies and rooftops.', ar: 'ابتعد عن النوافذ والزجاج والشرفات والأسطح.' },
      { en: 'If outside, enter the nearest building or shelter behind a solid barrier.', ar: 'إذا كنت في الخارج، ادخل أقرب مبنى أو احتمِ خلف حاجز صلب.' },
      { en: 'If driving, pull over safely away from bridges and tall buildings.', ar: 'إذا كنت تقود، توقّف بأمان بعيدًا عن الجسور والمباني العالية.' },
      { en: 'Do not film or share images of incidents. Follow official channels only.', ar: 'لا تصوّر الحوادث ولا تنشر صورها. تابع القنوات الرسمية فقط.' },
    ],
    after: [
      { en: 'Stay sheltered until the official White (danger has ended) message.', ar: 'ابقَ محتميًا حتى صدور رسالة الأبيض الرسمية (انتهى الخطر).' },
      { en: 'Do not approach or touch unknown objects or debris. Report them on 911 or 998.', ar: 'لا تقترب من الأجسام أو الحطام غير المعروف ولا تلمسه. أبلغ على 911 أو 998.' },
      { en: 'Check on family and neighbours, especially older people.', ar: 'اطمئن على أسرتك وجيرانك، خاصة كبار السن.' },
    ],
    source: SRC,
  },
  {
    hazard: 'sandstorm',
    summary: { en: 'Stay indoors, seal doors and windows, and avoid driving in low visibility.', ar: 'ابقَ في الداخل وأحكم إغلاق الأبواب والنوافذ وتجنّب القيادة عند انخفاض الرؤية.' },
    before: [
      { en: 'Keep face masks and any asthma medication ready.', ar: 'جهّز الكمامات وأدوية الربو إن وجدت.' },
      { en: 'Secure loose items outdoors.', ar: 'ثبّت الأشياء غير المثبتة في الخارج.' },
    ],
    during: [
      { en: 'Close doors, windows and air vents.', ar: 'أغلق الأبواب والنوافذ وفتحات التهوية.' },
      { en: 'If driving, slow down, turn on lights, or pull over safely off the road.', ar: 'إذا كنت تقود، خفّف السرعة وشغّل الأضواء أو توقّف بأمان خارج الطريق.' },
      { en: 'Wear a mask if you must go outside.', ar: 'ارتدِ كمامة إذا اضطررت للخروج.' },
    ],
    after: [{ en: 'Clean dust from air filters before running air conditioning at full power.', ar: 'نظّف الغبار من فلاتر المكيف قبل تشغيله بكامل طاقته.' }],
    source: SRC,
  },
  {
    hazard: 'flash_flood',
    summary: { en: 'Keep away from valleys and flood channels. Never cross moving water.', ar: 'ابتعد عن الأودية ومجاري السيول. لا تعبر المياه الجارية أبدًا.' },
    before: [
      { en: 'Know whether your home, school or route crosses a valley (wadi).', ar: 'اعرف إن كان منزلك أو مدرستك أو طريقك يمر بوادٍ.' },
      { en: 'Do not camp in valleys when rain is forecast.', ar: 'لا تخيّم في الأودية عند توقّع الأمطار.' },
    ],
    during: [
      { en: 'Move away from valleys and low ground.', ar: 'ابتعد عن الأودية والأراضي المنخفضة.' },
      { en: 'Do not drive or walk through moving water. Thirty centimetres can move a car.', ar: 'لا تقد ولا تمشِ في المياه الجارية. ثلاثون سنتيمترًا يمكن أن تجرف سيارة.' },
      { en: 'Keep children away from water and drains.', ar: 'أبعد الأطفال عن المياه وفتحات التصريف.' },
    ],
    after: [{ en: 'Avoid damaged roads and fallen power lines.', ar: 'تجنّب الطرق المتضررة وأسلاك الكهرباء الساقطة.' }],
    source: SRC,
  },
  {
    hazard: 'extreme_heat',
    summary: { en: 'Drink water, stay in the shade and check on vulnerable people.', ar: 'اشرب الماء وابقَ في الظل واطمئن على الأشخاص الأكثر عرضة.' },
    before: [{ en: 'Plan outdoor work for early morning or evening.', ar: 'خطّط للعمل في الخارج في الصباح الباكر أو المساء.' }],
    during: [
      { en: 'Drink water regularly, even if you are not thirsty.', ar: 'اشرب الماء باستمرار حتى لو لم تشعر بالعطش.' },
      { en: 'Never leave children or anyone in a parked car.', ar: 'لا تترك الأطفال أو أي شخص في سيارة متوقفة.' },
      { en: 'Signs of heatstroke: confusion, hot dry skin, fainting. Call 997.', ar: 'علامات ضربة الشمس: ارتباك، جلد حار وجاف، إغماء. اتصل على 997.' },
    ],
    after: [{ en: 'Rest and rehydrate.', ar: 'استرح وعوّض السوائل.' }],
    source: SRC,
  },
  {
    hazard: 'fire',
    summary: { en: 'Get out, stay out and call 998.', ar: 'اخرج وابقَ في الخارج واتصل على 998.' },
    before: [
      { en: 'Fit smoke detectors and keep a fire extinguisher at home.', ar: 'ركّب أجهزة كشف الدخان واحتفظ بطفاية حريق في المنزل.' },
      { en: 'Know two ways out of every room.', ar: 'اعرف مخرجين من كل غرفة.' },
    ],
    during: [
      { en: 'Leave the building immediately. Do not use lifts.', ar: 'غادر المبنى فورًا. لا تستخدم المصاعد.' },
      { en: 'Stay low under smoke.', ar: 'ابقَ منخفضًا تحت الدخان.' },
      { en: 'Call 998 once you are safe.', ar: 'اتصل على 998 بعد أن تصبح في أمان.' },
    ],
    after: [{ en: 'Do not go back inside until told it is safe.', ar: 'لا تعد إلى الداخل حتى يُسمح بذلك.' }],
    source: SRC,
  },
  {
    hazard: 'earthquake',
    summary: { en: 'Drop, cover and hold on.', ar: 'انخفض واحتمِ وتمسّك.' },
    before: [{ en: 'Secure heavy furniture to walls.', ar: 'ثبّت الأثاث الثقيل بالجدران.' }],
    during: [
      { en: 'Drop to the ground, take cover under a sturdy table and hold on.', ar: 'انخفض إلى الأرض واحتمِ تحت طاولة متينة وتمسّك بها.' },
      { en: 'Stay away from windows and outside walls.', ar: 'ابتعد عن النوافذ والجدران الخارجية.' },
    ],
    after: [{ en: 'Expect aftershocks. Leave damaged buildings carefully.', ar: 'توقّع هزات ارتدادية. غادر المباني المتضررة بحذر.' }],
    source: SRC,
  },
];

export interface EmergencyContact {
  number: string;
  name: Bi;
  scope: Bi;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { number: '911', name: { en: 'Unified emergency number', ar: 'الرقم الموحد للطوارئ' }, scope: { en: 'Riyadh, Makkah, Madinah and Eastern regions', ar: 'مناطق الرياض ومكة المكرمة والمدينة المنورة والشرقية' } },
  { number: '998', name: { en: 'Civil Defense', ar: 'الدفاع المدني' }, scope: { en: 'All other regions', ar: 'بقية المناطق' } },
  { number: '997', name: { en: 'Ambulance (Red Crescent)', ar: 'الإسعاف (الهلال الأحمر)' }, scope: { en: 'Nationwide', ar: 'جميع المناطق' } },
  { number: '999', name: { en: 'Police', ar: 'الشرطة' }, scope: { en: 'Nationwide', ar: 'جميع المناطق' } },
];
