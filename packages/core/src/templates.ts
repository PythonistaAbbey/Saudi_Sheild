import { HAZARDS, INSTRUCTIONS, LEVELS } from './i18n';
import { areaByCode } from './geo';
import type { IssuerMessage, Lang, RenderedText } from './types';

/**
 * Renders the authoritative text for an alert from its structured fields using
 * pre-approved templates. This is deterministic: the same message always yields
 * the same words. AI never writes this text.
 */
export function renderText(msg: IssuerMessage, lang: Lang): RenderedText {
  const hazard = HAZARDS[msg.hazard][lang];
  const level = LEVELS[msg.level];
  const areaNames = msg.areas.map((c) => areaByCode(c)?.name[lang] ?? c);
  const list = lang === 'ar' ? areaNames.join('، ') : areaNames.join(', ');

  let headline: string;
  if (msg.msgType === 'Cancel') {
    headline = lang === 'ar' ? `إلغاء: التنبيه السابق (${hazard}) أُلغي` : `Cancelled: the earlier ${hazard.toLowerCase()} alert is withdrawn`;
  } else if (msg.level === 'yellow') {
    headline = lang === 'ar' ? `إنذار أصفر: خطر ${hazard} محتمل` : `Yellow alert: possible ${hazard.toLowerCase()} risk`;
  } else if (msg.level === 'red') {
    headline = lang === 'ar' ? `إنذار أحمر: ${hazard}. احتمِ الآن` : `Red alert: ${hazard}. Take protective action now`;
  } else {
    headline = lang === 'ar' ? `انتهى الخطر: ${hazard}` : `All clear: the ${hazard.toLowerCase()} danger has ended`;
  }

  const meaning = level.meaning[lang];
  const body =
    msg.msgType === 'Cancel'
      ? lang === 'ar'
        ? `ألغت الجهة المصدرة التنبيه السابق للمناطق: ${list}.`
        : `The issuer has withdrawn the earlier alert for: ${list}.`
      : lang === 'ar'
        ? `${level.label.ar}: ${meaning}. المناطق: ${list}.`
        : `${level.label.en}: ${meaning}. Areas: ${list}.`;

  const steps = msg.instructions.map((code) => INSTRUCTIONS[code][lang]);
  return { headline, body, steps };
}

export function renderAll(msg: IssuerMessage): Record<Lang, RenderedText> {
  return { ar: renderText(msg, 'ar'), en: renderText(msg, 'en') };
}
