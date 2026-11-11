import {
  EMERGENCY_CONTACTS,
  GUIDANCE,
  HAZARDS,
  LEVELS,
  REGIONS,
  areaByCode,
  visibleStatus,
  type GuidanceEntry,
  type Lang,
  type PublicAlert,
} from '@saudi-shield/core';
import * as Haptics from 'expo-haptics';
import { Activity, ArrowLeft, ArrowRight, BookOpen, CircleCheck, Flame, House, Lock, Phone, Sun, Volume2, Waves, Wind } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { Btn, Card, ExerciseRibbon, LevelPill, MiniMap, PrototypeNote, Row, SectionTitle, T, VerifiedBadge, styles } from './components';
import { affectsUser, currentForUser } from './feed';
import { useApp } from './state';
import { tr, type StringKey } from './strings';
import { levelColors } from './theme';

export function fmt(iso: string, lang: Lang, withDate = false) {
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
      timeZone: 'Asia/Riyadh',
      hour: '2-digit',
      minute: '2-digit',
      ...(withDate ? { day: 'numeric', month: 'short' } : {}),
    });
  } catch {
    return new Date(iso).toISOString().slice(11, 16);
  }
}

const STATE_KEY: Record<PublicAlert['publicState'], StringKey> = {
  active: 'stateActive',
  cleared: 'stateCleared',
  superseded: 'stateSuperseded',
  cancelled: 'stateCancelled',
  expired: 'stateExpired',
};

function cityName(code: string, lang: Lang) {
  for (const r of REGIONS) for (const c of r.cities) if (c.code === code) return c.name[lang];
  return code;
}

function FeedLine() {
  const { feed, prefs, p } = useApp();
  if (!feed) return null;
  const key: StringKey = feed.source === 'live' ? 'live' : feed.source === 'cache' ? 'offline' : 'demoLocal';
  const color = feed.source === 'cache' ? p.yellowInk : p.ink2;
  return (
    <View style={{ gap: 2 }}>
      <Row gap={6}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: feed.source === 'cache' ? p.yellow : p.green500 }} />
        <T size={12.5} color={color}>
          {tr(key, prefs.lang)}{feed.lite ? ` · ${tr('dataSaver', prefs.lang)}` : ''} · {fmt(feed.fetchedAt, prefs.lang)}
        </T>
      </Row>
      {feed.rejected > 0 && (
        <T size={12.5} color={p.red}>
          {feed.rejected} {tr('rejected', prefs.lang)}
        </T>
      )}
    </View>
  );
}

/* --------------------------------- Home --------------------------------- */

export function HomeScreen({ go }: { go: (tab: string) => void }) {
  const { prefs, p, feed, zones, setOpenAlert, doCheckIn } = useApp();
  const L = prefs.lang;
  const { active, latest } = currentForUser(feed?.alerts ?? [], zones);
  const top = active.sort((a, b) => (a.level === 'red' ? -1 : b.level === 'red' ? 1 : 0))[0];
  const [sent, setSent] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PrototypeNote />
      <View style={{ gap: 4 }}>
        <T size={13} color={p.ink3} weight="medium">
          {tr('yourArea', L)}
        </T>
        <T size={26} weight="bold" role="header">
          {cityName(prefs.city, L)}
        </T>
      </View>

      {top ? (
        <Card style={{ padding: 0, overflow: 'hidden', borderColor: levelColors(top.level, p).bar, borderWidth: 2 }}>
          <View style={{ backgroundColor: levelColors(top.level, p).bg, padding: 16, gap: 10 }}>
            <Row>
              <LevelPill level={top.level} big />
              <View style={{ flex: 1 }} />
              <T size={12} color={p.exercise} weight="bold">
                {tr('exercise', L)}
              </T>
            </Row>
            <T size={22} weight="bold" color={levelColors(top.level, p).fg}>
              {top.texts[L].headline}
            </T>
            <T size={16} weight="medium">
              {top.texts[L].steps[0]}
            </T>
          </View>
          <View style={{ padding: 16, gap: 10 }}>
            <Btn label={tr('openAlert', L)} onPress={() => setOpenAlert(top)} />
          </View>
        </Card>
      ) : (
        <Card style={{ gap: 8 }}>
          <Row>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.green50, alignItems: 'center', justifyContent: 'center' }}>
              <CircleCheck size={26} color={p.green700} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={19} weight="bold">
                {tr('noActive', L)}
              </T>
              <T size={14} color={p.ink2}>
                {tr('noActiveBody', L)}
              </T>
            </View>
          </Row>
          {latest && (
            <Pressable onPress={() => setOpenAlert(latest)} accessibilityRole="button">
              <T size={13} color={p.ink2}>
                {tr('lastUpdate', L)}: {LEVELS[latest.level].label[L]} · {HAZARDS[latest.hazard][L]} · {fmt(latest.updatedAt, L)}
              </T>
            </Pressable>
          )}
        </Card>
      )}

      <FeedLine />

      <Row gap={10}>
        <View style={{ flex: 1 }}>
          <Btn
            label={tr('imSafe', L)}
            icon={sent ? <CircleCheck size={18} color="#fff" /> : undefined}
            onPress={() => {
              doCheckIn('safe');
              setSent(true);
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Btn label={tr('family', L)} kind="secondary" onPress={() => go('family')} />
        </View>
      </Row>
      {sent && (
        <T size={13} color={p.green700} center>
          {tr('checkInSent', L)}
        </T>
      )}

      <Row gap={10}>
        <Card style={{ flex: 1, gap: 6 }} onPress={() => go('guidance')} label={tr('quickGuidance', L)}>
          <BookOpen size={24} color={p.green700} />
          <T weight="semibold">{tr('quickGuidance', L)}</T>
          <T size={12} color={p.green700}>
            {tr('availableOffline', L)}
          </T>
        </Card>
        <Card style={{ flex: 1, gap: 6 }} onPress={() => go('more')} label={tr('quickContacts', L)}>
          <Phone size={24} color={p.green700} />
          <T weight="semibold">{tr('quickContacts', L)}</T>
          <T size={12} color={p.ink2}>
            911 · 998 · 997
          </T>
        </Card>
      </Row>

      <Card style={{ gap: 10 }}>
        <T weight="semibold">{tr('levelsTitle', L)}</T>
        {(['yellow', 'red', 'white'] as const).map((lv) => (
          <Row key={lv} gap={10}>
            <LevelPill level={lv} />
            <T size={14} color={p.ink2} style={{ flex: 1 }}>
              {LEVELS[lv].meaning[L]}
            </T>
          </Row>
        ))}
      </Card>

      <T size={12.5} color={p.ink3} center>
        {tr('authoritative', L)}
      </T>
    </ScrollView>
  );
}

/* ----------------------------- Alert detail ----------------------------- */

export function AlertDetail({ alert, onClose }: { alert: PublicAlert; onClose: () => void }) {
  const { prefs, setPrefs, p, zones, doCheckIn } = useApp();
  const L = prefs.lang;
  const c = levelColors(alert.level, p);
  const [plain, setPlain] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [checked, setChecked] = useState(false);
  const text = alert.texts[L];
  const plainText = alert.plain?.[L];
  const mine = affectsUser(alert, zones);

  const speak = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    const body = plain && plainText ? plainText : [text.headline, text.body, ...text.steps.map((s, i) => `${i + 1}. ${s}`)].join('. ');
    setSpeaking(true);
    Speech.speak(`${L === 'ar' ? 'تمرين.' : 'Exercise.'} ${body}`, { language: L === 'ar' ? 'ar-SA' : 'en-GB', onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false) });
  };
  useEffect(() => {
    if (prefs.autoRead && alert.publicState === 'active') speak();
    return () => {
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id]);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ExerciseRibbon />
      <View style={{ backgroundColor: c.bar, paddingHorizontal: 16, paddingVertical: 14 }} accessibilityRole="header">
        <Row>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={tr('back', L)} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
            <Row gap={4}>
              {L === 'ar' ? <ArrowRight size={20} color={alert.level === 'yellow' ? p.ink : '#fff'} /> : <ArrowLeft size={20} color={alert.level === 'yellow' ? p.ink : '#fff'} />}
              <T size={16} weight="semibold" color={alert.level === 'yellow' ? p.ink : '#fff'}>
                {tr('back', L)}
              </T>
            </Row>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setPrefs({ lang: L === 'ar' ? 'en' : 'ar' })} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
            <T size={15} weight="semibold" color={alert.level === 'yellow' ? p.ink : '#fff'}>
              {L === 'ar' ? 'English' : 'العربية'}
            </T>
          </Pressable>
        </Row>
        <T size={18} weight="bold" color={alert.level === 'yellow' ? p.ink : '#fff'}>
          {LEVELS[alert.level].label[L]} · {LEVELS[alert.level].meaning[L]}
        </T>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {alert.publicState !== 'active' && (
          <View style={{ backgroundColor: p.card, borderRadius: 12, borderWidth: 1, borderColor: p.line, padding: 12 }}>
            <T weight="semibold" color={p.ink2}>
              {tr(STATE_KEY[alert.publicState], L)} · {fmt(alert.updatedAt, L)}
            </T>
          </View>
        )}
        <T size={30} weight="bold" role="header" color={alert.level === 'white' ? p.green700 : p.ink}>
          {text.headline}
        </T>
        {mine && (
          <T size={14} weight="semibold" color={c.fg}>
            ● {tr('inYourArea', L)} ({cityName(prefs.city, L)})
          </T>
        )}

        <Card style={{ gap: 12, borderColor: c.bar, borderWidth: 2 }}>
          <Row>
            <T size={18} weight="bold" style={{ flex: 1 }}>
              {tr('whatToDo', L)}
            </T>
            {plainText && (
              <Pressable onPress={() => setPlain(!plain)} accessibilityRole="button" style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: p.green700 }}>
                <T size={13} weight="semibold" color={p.green700}>
                  {plain ? tr('standard', L) : tr('plain', L)}
                </T>
              </Pressable>
            )}
          </Row>
          {plain && plainText ? (
            <>
              <T size={19} weight="medium">
                {plainText}
              </T>
              <T size={12.5} color={p.ink3}>
                {tr('plainNote', L)}
              </T>
            </>
          ) : (
            text.steps.map((s, i) => (
              <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: i === 0 ? c.bar : p.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.bar }}>
                  <T size={15} weight="bold" color={i === 0 ? (alert.level === 'yellow' ? p.ink : '#fff') : p.ink} center>
                    {i + 1}
                  </T>
                </View>
                <T size={i === 0 ? 19 : 17} weight={i === 0 ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                  {s}
                </T>
              </Row>
            ))
          )}
        </Card>

        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <Btn
              label={tr('imSafe', L)}
              icon={checked ? <CircleCheck size={18} color="#fff" /> : undefined}
              onPress={() => {
                doCheckIn('safe');
                setChecked(true);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Btn label={speaking ? tr('stop', L) : tr('readAloud', L)} icon={<Volume2 size={18} color={p.green700} />} kind="secondary" onPress={speak} />
          </View>
        </Row>
        {checked && (
          <T size={13} color={p.green700} center>
            {tr('checkInSent', L)}
          </T>
        )}

        <SectionTitle>{tr('where', L)}</SectionTitle>
        <Card style={{ gap: 10 }}>
          <T size={15}>{alert.areas.map((a) => areaByCode(a)?.name[L] ?? a).join(L === 'ar' ? '، ' : ', ')}</T>
          <MiniMap areas={alert.areas} level={alert.level} />
        </Card>

        <SectionTitle>{tr('source', L)}</SectionTitle>
        <Card style={{ gap: 8 }}>
          <VerifiedBadge issuer={alert.issuer.name[L]} />
          <T size={13} color={p.ink2}>
            {tr('issued', L)} {fmt(alert.issuedAt, L, true)} · {tr('validUntil', L)} {fmt(alert.expires, L)}
          </T>
          <T size={12} color={p.ink3}>
            {alert.identifier} · {HAZARDS[alert.hazard][L]}
          </T>
        </Card>

        <View style={{ backgroundColor: p.green50, borderRadius: 12, padding: 12 }}>
          <T size={13.5} color={p.green900} weight="medium" center>
            {tr('followOfficial', L)} {tr('authoritative', L)}
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

/* -------------------------------- History -------------------------------- */

export function HistoryScreen() {
  const { prefs, p, feed, zones, setOpenAlert } = useApp();
  const L = prefs.lang;
  const [filter, setFilter] = useState<'active' | 'all'>('all');
  const list = (feed?.alerts ?? []).filter((a) => filter === 'all' || a.publicState === 'active');
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <T size={24} weight="bold" role="header">
        {tr('history', L)}
      </T>
      <Row gap={8}>
        {(['all', 'active'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: filter === f ? p.green700 : p.card, borderWidth: 1, borderColor: filter === f ? p.green700 : p.line }}
          >
            <T size={14} weight="semibold" color={filter === f ? '#fff' : p.ink}>
              {tr(f === 'all' ? 'all' : 'active', L)}
            </T>
          </Pressable>
        ))}
      </Row>
      <FeedLine />
      {list.length === 0 && <T color={p.ink2}>{tr('historyEmpty', L)}</T>}
      {list.map((a) => (
        <Card key={a.id} onPress={() => setOpenAlert(a)} label={a.texts[L].headline} style={{ gap: 8, opacity: a.publicState === 'active' || a.level === 'white' ? 1 : 0.78 }}>
          <Row>
            <LevelPill level={a.level} />
            <T size={12.5} weight="semibold" color={a.publicState === 'active' ? p.red : p.ink3}>
              {tr(STATE_KEY[a.publicState], L)}
            </T>
            <View style={{ flex: 1 }} />
            <T size={12.5} color={p.ink3}>
              {fmt(a.issuedAt, L, true)}
            </T>
          </Row>
          <T size={16} weight="semibold">
            {a.texts[L].headline}
          </T>
          <T size={13} color={p.ink2}>
            {a.areas.map((x) => areaByCode(x)?.name[L] ?? x).join(L === 'ar' ? '، ' : ', ')}
          </T>
          <Row gap={10}>
            <VerifiedBadge issuer={a.issuer.name[L]} />
            {affectsUser(a, zones) && (
              <T size={12} weight="bold" color={p.green700}>
                · {tr('inYourArea', L)}
              </T>
            )}
          </Row>
        </Card>
      ))}
    </ScrollView>
  );
}

/* -------------------------------- Guidance ------------------------------- */

const HAZARD_ICON: Record<string, typeof House> = { aerial_threat: House, sandstorm: Wind, flash_flood: Waves, extreme_heat: Sun, fire: Flame, earthquake: Activity };

export function GuidanceScreen() {
  const { prefs, p } = useApp();
  const L = prefs.lang;
  const [open, setOpen] = useState<GuidanceEntry | null>(null);
  if (open)
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => setOpen(null)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Row gap={4}>
            {L === 'ar' ? <ArrowRight size={18} color={p.green700} /> : <ArrowLeft size={18} color={p.green700} />}
            <T weight="semibold" color={p.green700}>
              {tr('back', L)}
            </T>
          </Row>
        </Pressable>
        <Row gap={12}>
          {(() => {
            const I = HAZARD_ICON[open.hazard];
            return <I size={30} color={p.green700} />;
          })()}
          <T size={28} weight="bold" role="header">
            {HAZARDS[open.hazard][L]}
          </T>
        </Row>
        <Card style={{ backgroundColor: p.green50, borderColor: p.green100 }}>
          <T size={17} weight="semibold" color={p.green900}>
            {open.summary[L]}
          </T>
        </Card>
        {(['before', 'during', 'after'] as const).map((k) => (
          <View key={k} style={{ gap: 8 }}>
            <SectionTitle>{tr(k, L)}</SectionTitle>
            <Card style={{ gap: 10 }}>
              {open[k].map((s, i) => (
                <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                  <T weight="bold" color={p.green700}>
                    •
                  </T>
                  <T size={16} style={{ flex: 1 }}>
                    {s[L]}
                  </T>
                </Row>
              ))}
            </Card>
          </View>
        ))}
        <T size={12} color={p.ink3}>
          {open.source[L]}
        </T>
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <T size={24} weight="bold" role="header">
        {tr('guidance', L)}
      </T>
      <Row gap={6}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.green500 }} />
        <T size={13} color={p.green700}>
          {tr('availableOffline', L)}
        </T>
      </Row>
      {GUIDANCE.map((g) => (
        <Card key={g.hazard} onPress={() => setOpen(g)} label={HAZARDS[g.hazard][L]}>
          <Row gap={14}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: p.green50, alignItems: 'center', justifyContent: 'center' }}>
              {(() => {
                const I = HAZARD_ICON[g.hazard];
                return <I size={24} color={p.green700} />;
              })()}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={17} weight="semibold">
                {HAZARDS[g.hazard][L]}
              </T>
              <T size={13.5} color={p.ink2} lines={2}>
                {g.summary[L]}
              </T>
            </View>
          </Row>
        </Card>
      ))}
    </ScrollView>
  );
}

/* --------------------------------- Family -------------------------------- */

export function FamilyScreen() {
  const { prefs, p, family, doCheckIn, togglePause } = useApp();
  const L = prefs.lang;
  const now = new Date();
  const me = family.members.find((m) => m.id === 'me')!;
  const label = (s: ReturnType<typeof visibleStatus>) =>
    s === 'safe' ? { t: tr('safe', L), c: p.green700, bg: p.green50 } : s === 'need_help' ? { t: tr('help', L), c: p.red, bg: p.redBg } : s === 'paused' ? { t: tr('paused', L), c: p.ink3, bg: p.bg } : { t: tr('noUpdate', L), c: p.ink2, bg: p.bg };
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <T size={24} weight="bold" role="header">
        {tr('family', L)}
      </T>
      <T color={p.ink2}>{tr('familyIntro', L)}</T>
      <Row gap={10}>
        <View style={{ flex: 1 }}>
          <Btn label={tr('imSafe', L)} onPress={() => doCheckIn('safe')} />
        </View>
        <View style={{ flex: 1 }}>
          <Btn label={tr('needHelp', L)} kind="danger" onPress={() => doCheckIn('need_help')} />
        </View>
      </Row>
      <Card style={{ padding: 0 }}>
        {family.members.map((m, i) => {
          const s = label(visibleStatus(m, now));
          return (
            <Row key={m.id} gap={12} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: p.line }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: p.green900, alignItems: 'center', justifyContent: 'center' }}>
                <T color="#fff" weight="bold" center>
                  {(m.id === 'me' ? tr('you', L) : m.displayName).slice(0, 1)}
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="semibold">{m.id === 'me' ? tr('you', L) : m.displayName}</T>
                <T size={12.5} color={p.ink3}>
                  {m.lastCheckIn && !m.paused ? fmt(m.lastCheckIn.at, L) : m.relation ?? ''}
                </T>
              </View>
              <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <T size={12.5} weight="bold" color={s.c}>
                  {s.t}
                </T>
              </View>
            </Row>
          );
        })}
      </Card>
      <Card style={{ gap: 10 }}>
        <Row gap={8} style={{ alignItems: 'flex-start' }}>
          <Lock size={16} color={p.green700} />
          <T size={14} color={p.ink2} style={{ flex: 1 }}>
            {tr('familyShares', L)}
          </T>
        </Row>
        <T size={14}>
          {tr('invite', L)}: <T weight="bold">{family.inviteCode}</T>
        </T>
        <Btn label={me.paused ? tr('resume', L) : tr('pause', L)} kind="secondary" onPress={togglePause} style={{ minHeight: 44 }} />
      </Card>
      <T size={12} color={p.ink3} center>
        {tr('prototype', L)}
      </T>
    </ScrollView>
  );
}

/* ---------------------------------- More --------------------------------- */

export function MoreScreen() {
  const { prefs, setPrefs, p } = useApp();
  const L = prefs.lang;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <T size={24} weight="bold" role="header">
        {tr('contacts', L)}
      </T>
      <Card style={{ padding: 0 }}>
        {EMERGENCY_CONTACTS.map((c, i) => (
          <Pressable key={c.number} onPress={() => Linking.openURL(`tel:${c.number}`)} accessibilityRole="button" accessibilityLabel={`${tr('call', L)} ${c.number} ${c.name[L]}`}>
            <Row gap={14} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: p.line }}>
              <View style={{ minWidth: 64, height: 44, borderRadius: 12, backgroundColor: p.green700, alignItems: 'center', justifyContent: 'center' }}>
                <T size={20} weight="bold" color="#fff" center>
                  {c.number}
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="semibold">{c.name[L]}</T>
                <T size={12.5} color={p.ink2}>
                  {c.scope[L]}
                </T>
              </View>
              <T size={13} weight="semibold" color={p.green700}>
                {tr('call', L)}
              </T>
            </Row>
          </Pressable>
        ))}
      </Card>

      <T size={24} weight="bold" role="header" style={{ marginTop: 8 }}>
        {tr('settings', L)}
      </T>
      <Card style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <T weight="semibold">{tr('language', L)}</T>
          <Row gap={8}>
            {(['ar', 'en'] as const).map((l) => (
              <Pressable key={l} onPress={() => setPrefs({ lang: l })} accessibilityRole="button" accessibilityState={{ selected: L === l }} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: L === l ? p.green700 : p.line, backgroundColor: L === l ? p.green50 : p.card }}>
                <T weight="semibold" center>
                  {l === 'ar' ? 'العربية' : 'English'}
                </T>
              </Pressable>
            ))}
          </Row>
        </View>
        <View style={{ gap: 8 }}>
          <T weight="semibold">{tr('location', L)}</T>
          <CityPicker />
          <T size={12.5} color={p.ink3}>
            {tr('locationNote', L)}
          </T>
        </View>
        <View style={{ gap: 8 }}>
          <T weight="semibold">{tr('textSize', L)}</T>
          <Row gap={8}>
            {[1, 1.15, 1.3, 1.5].map((s) => (
              <Pressable key={s} onPress={() => setPrefs({ textScale: s })} accessibilityRole="button" accessibilityLabel={`${Math.round(s * 100)}%`} style={{ flex: 1, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: prefs.textScale === s ? p.green700 : p.line, backgroundColor: prefs.textScale === s ? p.green50 : p.card }}>
                <T size={12 * s} weight="bold" center>
                  A
                </T>
              </Pressable>
            ))}
          </Row>
        </View>
        <Row>
          <T weight="semibold" style={{ flex: 1 }}>
            {tr('contrast', L)}
          </T>
          <Switch value={prefs.highContrast} onValueChange={(v) => setPrefs({ highContrast: v })} accessibilityLabel={tr('contrast', L)} />
        </Row>
        <Row>
          <T weight="semibold" style={{ flex: 1 }}>
            {tr('autoRead', L)}
          </T>
          <Switch value={prefs.autoRead} onValueChange={(v) => setPrefs({ autoRead: v })} accessibilityLabel={tr('autoRead', L)} />
        </Row>
        <View style={{ gap: 4 }}>
          <Row>
            <T weight="semibold" style={{ flex: 1 }}>
              {tr('demoMode', L)}
            </T>
            <Switch value disabled accessibilityLabel={tr('demoMode', L)} />
          </Row>
          <T size={12.5} color={p.ink3}>
            {tr('demoModeNote', L)}
          </T>
        </View>
      </Card>

      <T size={24} weight="bold" role="header" style={{ marginTop: 8 }}>
        {tr('about', L)}
      </T>
      <Card style={{ gap: 10 }}>
        <T size={14.5} color={p.ink2}>
          {tr('aboutBody', L)}
        </T>
        <T size={13} weight="semibold" color={p.green900}>
          {tr('authoritative', L)}
        </T>
      </Card>
    </ScrollView>
  );
}

export function CityPicker({ compact }: { compact?: boolean }) {
  const { prefs, setPrefs, p } = useApp();
  const L = prefs.lang;
  return (
    <View style={{ gap: 8 }}>
      {REGIONS.map((r) => (
        <View key={r.code} style={{ gap: 6 }}>
          {!compact && (
            <T size={12} color={p.ink3}>
              {r.name[L]}
            </T>
          )}
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {r.cities.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => setPrefs({ city: c.code })}
                accessibilityRole="button"
                accessibilityState={{ selected: prefs.city === c.code }}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: prefs.city === c.code ? p.green700 : p.line, backgroundColor: prefs.city === c.code ? p.green700 : p.card }}
              >
                <T size={14} weight="semibold" color={prefs.city === c.code ? '#fff' : p.ink}>
                  {c.name[L]}
                </T>
              </Pressable>
            ))}
          </Row>
        </View>
      ))}
    </View>
  );
}
