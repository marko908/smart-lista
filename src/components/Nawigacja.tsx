/**
 * Pasek nawigacji na dole ekranu.
 *
 * Na telefonie góra ekranu jest poza zasięgiem kciuka, a to aplikacja
 * używana jedną ręką z koszykiem w drugiej. Dlatego przejścia między
 * głównymi miejscami siedzą na dole.
 *
 * DWIE POZYCJE. Sklepy wypadły stąd, bo sklep wybiera się w konkretnej liście,
 * a nie zarządza się nimi osobno — katalog sklepów należy do administratora,
 * nie do człowieka robiącego zakupy.
 *
 * Pasek chowa się na szerokich ekranach: na monitorze dolna belka jest
 * wzorcem z telefonu przeniesionym bez powodu.
 */

import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT } from './ui';
import { useTheme } from '../lib/theme';

type Pozycja = { klucz: string; etykieta: string; ikona: string; sciezka: string };

const POZYCJE: Pozycja[] = [
  { klucz: 'listy', etykieta: 'Listy', ikona: '☰', sciezka: '/' },
  { klucz: 'profil', etykieta: 'Profil', ikona: '☺', sciezka: '/konto' },
];

/** Do której pozycji należy bieżący adres. Podstrony liczą się do swojej sekcji. */
function aktywna(sciezka: string): string {
  if (sciezka.startsWith('/konto')) return 'profil';
  return 'listy';
}

export function Nawigacja() {
  const t = useTheme();
  const router = useRouter();
  const sciezka = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Na szerokim ekranie dolna belka jest zapożyczeniem bez uzasadnienia.
  if (Platform.OS === 'web' && width >= 900) return null;

  const teraz = aktywna(sciezka);

  return (
    <View
      style={[
        st.pasek,
        {
          backgroundColor: t.colors.card,
          borderTopColor: t.colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {POZYCJE.map((p) => {
        const wybrana = p.klucz === teraz;
        const kolor = wybrana ? t.colors.primary : t.colors.mutedForeground;
        return (
          <Pressable
            key={p.klucz}
            /* Stukniecie w zakladke, na ktorej juz jestesmy, nie robi nic.
               Bez tego kazde takie stukniecie dokladalo ekran na stos i puszczalo
               animacje przejscia do samego siebie. */
            onPress={() => {
              if (wybrana) return;
              router.replace(p.sciezka as never);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: wybrana }}
            style={st.pozycja}
          >
            <Text style={[st.ikona, { color: kolor }]}>{p.ikona}</Text>
            <Text style={[st.etykieta, { color: kolor, fontWeight: wybrana ? '700' : '500' }]}>
              {p.etykieta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  pasek: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  pozycja: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 },
  ikona: { fontFamily: FONT.sans, fontSize: 18, lineHeight: 22 },
  etykieta: { fontFamily: FONT.sans, fontSize: 11 },
});
