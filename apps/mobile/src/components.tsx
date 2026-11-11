import { COUNTRY_RINGS, LEVELS, fitBbox, WARNING_AREAS, cityByCode, makeProjection, type AlertLevel } from '@saudi-shield/core';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ShieldCheck } from 'lucide-react-native';
import { useApp } from './state';
import { tr } from './strings';
import { dirStyles, fonts, levelColors } from './theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export function T({
  children,
  size = 16,
  weight = 'regular',
  color,
  style,
  center,
  lines,
  role,
}: {
  children: ReactNode;
  size?: number;
  weight?: Weight;
  color?: string;
  style?: TextStyle | TextStyle[];
  center?: boolean;
  lines?: number;
  role?: 'header' | 'text';
}) {
  const { prefs, p } = useApp();
  const d = dirStyles(prefs.lang);
  const s = size * prefs.textScale;
  return (
    <Text
      accessibilityRole={role}
      numberOfLines={lines}
      style={[
        { fontFamily: fonts[weight], fontSize: s, lineHeight: Math.round(s * (prefs.lang === 'ar' ? 1.5 : 1.38)), color: color ?? p.ink },
        center ? { textAlign: 'center' } : d.text,
        ...(Array.isArray(style) ? style : style ? [style] : []),
      ]}
    >
      {children}
    </Text>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: ViewStyle; gap?: number }) {
  const { prefs } = useApp();
  return <View style={[dirStyles(prefs.lang).row, { alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ children, style, onPress, label }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; label?: string }) {
  const { p } = useApp();
  const base: ViewStyle = { backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.line, padding: 16 };
  if (onPress)
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'quiet';
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const { p } = useApp();
  const bg = kind === 'primary' ? p.green700 : kind === 'danger' ? p.red : kind === 'quiet' ? 'transparent' : p.card;
  const fg = kind === 'primary' || kind === 'danger' ? '#fff' : p.green700;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { minHeight: 52, borderRadius: 14, backgroundColor: bg, borderWidth: kind === 'secondary' ? 1.5 : 0, borderColor: p.green700, paddingHorizontal: 18, justifyContent: 'center' },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Row gap={8} style={{ justifyContent: 'center' }}>
        {icon}
        <T weight="semibold" color={fg} size={16} center>
          {label}
        </T>
      </Row>
    </Pressable>
  );
}

export function ExerciseRibbon() {
  const { p } = useApp();
  return (
    <View accessibilityRole="text" accessibilityLabel="Exercise. Fictional." style={{ backgroundColor: p.exercise, paddingVertical: 5, alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 }}>EXERCISE · FICTIONAL · تمرين · افتراضي</Text>
    </View>
  );
}

export function PrototypeNote() {
  const { prefs, p } = useApp();
  return (
    <View style={{ backgroundColor: p.exerciseBg, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#DDD6F6' }}>
      <T size={12.5} color={p.exercise} weight="medium" center>
        {tr('prototype', prefs.lang)}
      </T>
    </View>
  );
}

export function LevelPill({ level, big }: { level: AlertLevel; big?: boolean }) {
  const { prefs, p } = useApp();
  const c = levelColors(level, p);
  const icon = level === 'red' ? '■' : level === 'yellow' ? '▲' : '●';
  return (
    <View style={{ backgroundColor: c.bg, borderColor: c.bar, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: big ? 14 : 10, paddingVertical: big ? 6 : 3, alignSelf: 'flex-start' }}>
      <T size={big ? 15 : 12.5} weight="bold" color={c.fg}>
        {icon} {LEVELS[level].label[prefs.lang]}
      </T>
    </View>
  );
}

export function VerifiedBadge({ issuer }: { issuer: string }) {
  const { prefs, p } = useApp();
  return (
    <Row gap={6}>
      <ShieldCheck size={17} color={p.green700} />
      <T size={13} weight="semibold" color={p.green700}>
        {tr('verified', prefs.lang)}
      </T>
      <T size={13} color={p.ink2}>
        · {issuer}
      </T>
    </Row>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { p } = useApp();
  return (
    <T size={13} weight="semibold" color={p.ink3} style={{ letterSpacing: 0.4, marginTop: 6 }} role="header">
      {children}
    </T>
  );
}

/** Mini map: country outline, the alert's areas and the user's location. Static, no animation. */
export function MiniMap({ areas, level, width = 320 }: { areas: string[]; level: AlertLevel; width?: number }) {
  const { prefs, p } = useApp();
  // Frame the map around the alert's areas (and the user's city), so small zones stay legible.
  const meCity = cityByCode(prefs.city);
  const pts: [number, number][] = [];
  for (const a of WARNING_AREAS) if (areas.includes(a.code)) pts.push(...a.polygon);
  if (meCity) pts.push(meCity.city.lonLat);
  const bbox = fitBbox(pts);
  const proj = makeProjection(width, bbox, 0);
  const c = levelColors(level, p);
  const me = meCity;
  const [mx, my] = me ? proj.project(me.city.lonLat) : [0, 0];
  return (
    <Svg width="100%" height={undefined} viewBox={`0 0 ${proj.width} ${proj.height}`} style={{ aspectRatio: proj.width / proj.height }}>
      <Rect x={0} y={0} width={proj.width} height={proj.height} fill="#EEF3F1" />
      {Object.entries(COUNTRY_RINGS)
        .filter(([k]) => k !== 'SAU')
        .map(([k, r]) => (
          <Path key={k} d={proj.ringsPath(r)} fill="#F6F5F1" stroke="#D4D1C9" strokeWidth={0.6} />
        ))}
      <Path d={proj.ringsPath(COUNTRY_RINGS.SAU)} fill="#FFFFFF" stroke={p.green900} strokeWidth={1.1} />
      {WARNING_AREAS.filter((a) => areas.includes(a.code)).map((a) => (
        <Path key={a.code} d={proj.ringPath(a.polygon)} fill={level === 'white' ? '#FFFFFF' : c.bar} fillOpacity={level === 'white' ? 1 : 0.55} stroke={c.bar} strokeWidth={1.4} />
      ))}
      {me && (
        <>
          <Circle cx={mx} cy={my} r={6} fill="#fff" stroke={p.ink} strokeWidth={2} />
          <Circle cx={mx} cy={my} r={2.4} fill={p.ink} />
        </>
      )}
    </Svg>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
});
