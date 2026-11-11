import type { AlertLevel, Lang } from '@saudi-shield/core';
import type { TextStyle, ViewStyle } from 'react-native';

export const palette = {
  green950: '#062A1F',
  green900: '#0A3D2C',
  green700: '#0E5E43',
  green500: '#2F8A63',
  green100: '#D6EADF',
  green50: '#EAF3EE',
  ink: '#1B1F22',
  ink2: '#4A5157',
  ink3: '#60676D',
  line: '#E4E2DC',
  line2: '#D4D1C9',
  bg: '#F3F2EE',
  card: '#FFFFFF',
  yellow: '#E3A008',
  yellowInk: '#5E4100',
  yellowBg: '#FFF7DB',
  red: '#B42318',
  redBg: '#FDECEA',
  exercise: '#5B4BB7',
  exerciseBg: '#EFECFB',
};

export type Palette = typeof palette;

export const highContrast: Palette = {
  ...palette,
  ink: '#000000',
  ink2: '#1B1F22',
  ink3: '#343A3F',
  line: '#1B1F22',
  line2: '#1B1F22',
  bg: '#FFFFFF',
  green700: '#06402D',
  yellowInk: '#3A2800',
  red: '#8A1209',
  exercise: '#3B2C99',
};

export const fonts = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
};

export function levelColors(level: AlertLevel, p: Palette) {
  if (level === 'red') return { fg: p.red, bg: p.redBg, bar: p.red };
  if (level === 'yellow') return { fg: p.yellowInk, bg: p.yellowBg, bar: p.yellow };
  return { fg: p.green700, bg: p.card, bar: p.green700 };
}

/** Direction helpers: we mirror layout manually so Arabic works on web and native without a restart. */
export function dirStyles(lang: Lang) {
  const rtl = lang === 'ar';
  return {
    rtl,
    row: { flexDirection: rtl ? 'row-reverse' : 'row' } as ViewStyle,
    text: { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' } as TextStyle,
    align: { alignItems: rtl ? 'flex-end' : 'flex-start' } as ViewStyle,
  };
}
