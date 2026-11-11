import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BellRing, BookOpen, Ellipsis, House, RadioTower, Users } from 'lucide-react-native';
import { Btn, PrototypeNote, Row, T } from './components';
import { AlertDetail, CityPicker, FamilyScreen, GuidanceScreen, HistoryScreen, HomeScreen, MoreScreen } from './screens';
import { AppProvider, useApp } from './state';
import { tr, type StringKey } from './strings';
import { dirStyles } from './theme';

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x={1} y={1} width={38} height={38} rx={11} fill="#0E5E43" />
      <Circle cx={20} cy={26} r={3.2} fill="#fff" />
      <Path d="M13.5 21.5a9 9 0 0 1 13 0" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Path d="M9.5 17.2a14.5 14.5 0 0 1 21 0" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.75} />
      <Path d="M5.8 13a20 20 0 0 1 28.4 0" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}

const TABS: { key: string; label: StringKey; icon: typeof House }[] = [
  { key: 'home', label: 'home', icon: House },
  { key: 'alerts', label: 'alerts', icon: BellRing },
  { key: 'guidance', label: 'guidance', icon: BookOpen },
  { key: 'family', label: 'family', icon: Users },
  { key: 'more', label: 'more', icon: Ellipsis },
];

function TabBar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const { prefs, p, feed } = useApp();
  const activeCount = (feed?.alerts ?? []).filter((a) => a.publicState === 'active').length;
  return (
    <View style={[dirStyles(prefs.lang).row, { backgroundColor: p.card, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 6, paddingBottom: 6 }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = tab === t.key;
        return (
          <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tr(t.label, prefs.lang)} style={{ flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 50 }}>
            <View style={{ paddingVertical: 2 }}>
              <t.icon size={22} color={on ? p.green700 : p.ink3} strokeWidth={on ? 2.4 : 1.8} />
              {t.key === 'alerts' && activeCount > 0 && <View style={{ position: 'absolute', top: 2, right: -6, width: 9, height: 9, borderRadius: 5, backgroundColor: p.red }} />}
            </View>
            <T size={11.5} weight={on ? 'bold' : 'medium'} color={on ? p.green700 : p.ink3} center>
              {tr(t.label, prefs.lang)}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Header() {
  const { prefs, setPrefs, p } = useApp();
  return (
    <Row style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: p.card, borderBottomWidth: 1, borderBottomColor: p.line }} gap={10}>
      <Mark size={34} />
      <View style={{ flex: 1 }}>
        <T size={17} weight="bold">
          {tr('appName', prefs.lang)}
        </T>
        <T size={11} color={p.exercise} weight="semibold">
          {tr('exercise', prefs.lang)}
        </T>
      </View>
      <Pressable onPress={() => setPrefs({ lang: prefs.lang === 'ar' ? 'en' : 'ar' })} accessibilityRole="button" accessibilityLabel="Switch language" style={{ borderWidth: 1, borderColor: p.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
        <T size={13} weight="semibold" color={p.green700}>
          {prefs.lang === 'ar' ? 'EN' : 'ع'}
        </T>
      </Pressable>
    </Row>
  );
}

function Onboarding() {
  const { prefs, setPrefs, p } = useApp();
  const [step, setStep] = useState(0);
  const L = prefs.lang;
  const next = () => (step < 3 ? setStep(step + 1) : setPrefs({ onboarded: true }));
  return (
    <View style={{ flex: 1, padding: 24, gap: 18, justifyContent: 'space-between' }}>
      <View style={{ gap: 18, flex: 1 }}>
        <Row gap={6} style={{ justifyContent: 'center' }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? p.green700 : p.line2 }} />
          ))}
        </Row>
        {step === 0 && (
          <View style={{ gap: 16, alignItems: 'center', marginTop: 24 }}>
            <Mark size={84} />
            <T size={28} weight="bold" center>
              {tr('appName', L)}
            </T>
            <T size={20} weight="semibold" center>
              {tr('onb1Title', L)}
            </T>
            <T size={16} color={p.ink2} center>
              {tr('onb1Body', L)}
            </T>
            <PrototypeNote />
          </View>
        )}
        {step === 1 && (
          <View style={{ gap: 14, marginTop: 24 }}>
            <T size={26} weight="bold" center>
              اختر لغتك · Choose your language
            </T>
            {(['ar', 'en'] as const).map((l) => (
              <Pressable key={l} onPress={() => setPrefs({ lang: l })} accessibilityRole="radio" accessibilityState={{ checked: L === l }} style={{ padding: 20, borderRadius: 16, borderWidth: 2, borderColor: L === l ? p.green700 : p.line, backgroundColor: L === l ? p.green50 : p.card }}>
                <T size={22} weight="bold" center>
                  {l === 'ar' ? 'العربية' : 'English'}
                </T>
              </Pressable>
            ))}
            <T size={13} color={p.ink3} center>
              {L === 'ar' ? 'لغات أخرى لاحقًا: الأردية، الهندية، البنغالية، الفلبينية، الإندونيسية' : 'More languages planned: Urdu, Hindi, Bengali, Filipino, Indonesian'}
            </T>
          </View>
        )}
        {step === 2 && (
          <View style={{ gap: 12, flex: 1 }}>
            <T size={26} weight="bold">
              {tr('onb3Title', L)}
            </T>
            <T size={14} color={p.ink2}>
              {tr('locationNote', L)}
            </T>
            <CityPicker compact />
          </View>
        )}
        {step === 3 && (
          <View style={{ gap: 16, marginTop: 24 }}>
            <View style={{ alignSelf: 'center', width: 84, height: 84, borderRadius: 42, backgroundColor: p.green50, alignItems: 'center', justifyContent: 'center' }}>
              <RadioTower size={40} color={p.green700} />
            </View>
            <T size={24} weight="bold" center>
              {tr('onb4Title', L)}
            </T>
            <T size={16} color={p.ink2} center>
              {tr('onb4Body', L)}
            </T>
          </View>
        )}
      </View>
      <Btn label={step < 3 ? tr('continue', L) : tr('start', L)} onPress={next} />
    </View>
  );
}

function Main() {
  const { prefs, p, openAlert, setOpenAlert } = useApp();
  const [tab, setTab] = useState('home');
  const L = prefs.lang;
  if (!prefs.onboarded)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
        <Onboarding />
      </SafeAreaView>
    );
  if (openAlert)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top', 'bottom']}>
        <AlertDetail alert={openAlert} onClose={() => setOpenAlert(null)} />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top', 'bottom']}>
      <Header />
      <View style={{ flex: 1 }} key={L}>
        {tab === 'home' && <HomeScreen go={setTab} />}
        {tab === 'alerts' && <HistoryScreen />}
        {tab === 'guidance' && <GuidanceScreen />}
        {tab === 'family' && <FamilyScreen />}
        {tab === 'more' && <MoreScreen />}
      </View>
      <TabBar tab={tab} setTab={setTab} />
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({ IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Main />
      </AppProvider>
    </SafeAreaProvider>
  );
}
