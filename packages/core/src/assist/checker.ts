import { normaliseDigits } from '../i18n';
import { areaByCode } from '../geo';
import { findSpeculativeLanguage } from '../safety';
import type { Finding, IssuerMessage } from '../types';

const SHELTER_CODES = ['SHELTER_INTERIOR_ROOM', 'STAY_INDOORS_UNTIL_CLEAR', 'IF_OUTDOORS_SEEK_BUILDING'];
const EVACUATE_RE = /\bevacuat|\bleave (the|your) (area|home|building)|إخلاء|اخلاء|غادر(وا)? (المنطقة|المنزل|المبنى)/i;

function f(code: string, severity: Finding['severity'], en: string, ar: string): Finding {
  return { code, severity, message: { en, ar } };
}

/**
 * Clarity and consistency checks over an alert. Pure and deterministic.
 * Blocking findings prevent publication.
 */
export function checkContent(msg: IssuerMessage, now: Date, opts: { hasPreviousAlert?: boolean } = {}): Finding[] {
  const out: Finding[] = [];
  const notes = [msg.note?.en ?? '', msg.note?.ar ?? ''];

  if (msg.status !== 'Exercise') {
    out.push(f('NOT_EXERCISE', 'blocking', 'Prototype only accepts Exercise messages.', 'النموذج الأولي يقبل رسائل التمرين فقط.'));
  }
  if (msg.areas.length === 0) {
    out.push(f('NO_AREA', 'blocking', 'No warning area is specified.', 'لم تُحدَّد منطقة إنذار.'));
  }
  const unknown = msg.areas.filter((c) => !areaByCode(c));
  if (unknown.length) {
    out.push(
      f('UNKNOWN_AREA', 'blocking', `Unknown area codes: ${unknown.join(', ')}.`, `رموز مناطق غير معروفة: ${unknown.join('، ')}.`),
    );
  }
  if (msg.level === 'red' && msg.instructions.length === 0 && msg.msgType !== 'Cancel') {
    out.push(f('NO_INSTRUCTIONS', 'blocking', 'A red alert must include protective instructions.', 'يجب أن يتضمن الإنذار الأحمر تعليمات حماية.'));
  }
  if (msg.level === 'white' && msg.instructions.some((c) => SHELTER_CODES.includes(c))) {
    out.push(
      f(
        'LEVEL_INSTRUCTION_CONFLICT',
        'blocking',
        'An all-clear (White) message still tells people to shelter.',
        'رسالة انتهاء الخطر (أبيض) ما زالت تطلب الاحتماء.',
      ),
    );
  }
  if (msg.instructions.some((c) => SHELTER_CODES.includes(c)) && notes.some((n) => EVACUATE_RE.test(n))) {
    out.push(
      f(
        'SHELTER_EVACUATE_CONFLICT',
        'blocking',
        'The note mentions evacuation but the instructions say shelter in place. Ask the issuer to clarify.',
        'الملاحظة تذكر الإخلاء بينما التعليمات تطلب الاحتماء في المكان. اطلب توضيحًا من الجهة المصدرة.',
      ),
    );
  }
  for (const n of notes) {
    const hits = findSpeculativeLanguage(n);
    if (hits.length) {
      out.push(
        f(
          'SPECULATIVE_LANGUAGE',
          'blocking',
          `The note contains speculative or operational wording ("${hits[0]}"). Public text must not include estimates, paths or targets.`,
          `تتضمن الملاحظة صياغة تخمينية أو عملياتية ("${hits[0]}"). يجب ألا يتضمن النص العام تقديرات أو مسارات أو أهدافًا.`,
        ),
      );
      break;
    }
  }
  if (msg.note && (msg.note.en || msg.note.ar)) {
    if (!msg.note.en || !msg.note.ar) {
      out.push(
        f(
          'NOTE_MISSING_TRANSLATION',
          'blocking',
          'The free-text note is only available in one language. An approved translation is needed.',
          'الملاحظة النصية متوفرة بلغة واحدة فقط. يلزم توفير ترجمة معتمدة.',
        ),
      );
    } else {
      const nums = (s: string) => (normaliseDigits(s).match(/\d+/g) ?? []).sort().join(',');
      if (nums(msg.note.en) !== nums(msg.note.ar)) {
        out.push(
          f(
            'NUMBER_MISMATCH',
            'blocking',
            'Numbers or times differ between the Arabic and English notes.',
            'الأرقام أو الأوقات مختلفة بين الملاحظة العربية والإنجليزية.',
          ),
        );
      }
    }
  }
  const expires = new Date(msg.expires).getTime();
  if (expires <= now.getTime()) {
    out.push(f('EXPIRED', 'blocking', 'The message has already expired.', 'انتهت صلاحية الرسالة.'));
  } else if (expires - new Date(msg.sent).getTime() > 24 * 3600_000) {
    out.push(f('LONG_VALIDITY', 'warning', 'Validity is longer than 24 hours. Confirm with the issuer.', 'مدة الصلاحية أطول من 24 ساعة. تحقّق مع الجهة المصدرة.'));
  }
  if ((msg.msgType === 'Update' || msg.msgType === 'Cancel') && !msg.references?.length) {
    out.push(
      f('MISSING_REFERENCE', 'blocking', 'Updates and cancellations must reference the original alert.', 'يجب أن تشير التحديثات والإلغاءات إلى التنبيه الأصلي.'),
    );
  }
  if (msg.level === 'white' && msg.msgType === 'Alert' && !opts.hasPreviousAlert) {
    out.push(f('ORPHAN_ALL_CLEAR', 'warning', 'All-clear with no earlier alert to clear.', 'رسالة انتهاء خطر دون تنبيه سابق.'));
  }
  if (!msg.instructions.includes('FOLLOW_OFFICIAL_CHANNELS') && msg.level !== 'white') {
    out.push(
      f('NO_OFFICIAL_CHANNELS', 'info', 'Consider adding "Follow official channels".', 'يُقترح إضافة "تابع القنوات الرسمية".'),
    );
  }
  return out;
}

export function hasBlocking(findings: Finding[]): boolean {
  return findings.some((x) => x.severity === 'blocking');
}
