/**
 * Dopytanie o frazę, która prowadzi do kilku regałów.
 *
 * To celowo NIE jest `SectionPicker`. Tam pytanie brzmi „która ze stu
 * czterdziestu dziewięciu sekcji", więc potrzebna jest wyszukiwarka i grupy.
 * Tu pytanie brzmi „która z tych trzech" i wyszukiwarka byłaby przeszkodą —
 * odpowiedź ma być jednym dotknięciem.
 *
 * Przy każdej możliwości stoją przykłady z katalogu, bo sama nazwa sekcji
 * bywa myląca: „Chemia" i „Higiena i kosmetyki" nic nie mówią, a „płyn do
 * prania, płyn do płukania" kontra „żel pod prysznic, mydło w płynie"
 * rozstrzygają natychmiast.
 *
 * Na dole zostaje wyjście awaryjne do pełnej listy sekcji — bo czasem człowiek
 * miał na myśli coś, czego katalog przy tym słowie nie zna.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sectionName, type SectionKey } from '../data/sections';
import { radius, useTheme } from '../lib/theme';
import { FONT } from './ui';

type Props = {
  /** Słowo, o które pytamy — pokazujemy je, żeby było wiadomo, czego dotyczy pytanie. */
  fraza: string;
  sekcje: SectionKey[];
  przyklady: Record<string, string[]>;
  wybrana: SectionKey;
  onPick: (s: SectionKey) => void;
  /** Przejście do pełnej listy sekcji. */
  onPelnaLista: () => void;
};

export function WyborWieloznaczny({ fraza, sekcje, przyklady, wybrana, onPick, onPelnaLista }: Props) {
  const t = useTheme();
  return (
    <View style={[st.karta, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
      <Text style={[st.naglowek, { color: t.colors.mutedForeground }]}>
        „{fraza}" — gdzie tego szukać?
      </Text>

      {sekcje.map((s) => {
        const aktywna = s === wybrana;
        const przyklad = (przyklady[s] ?? []).join(', ');
        return (
          <Pressable
            key={s}
            onPress={() => onPick(s)}
            accessibilityRole="button"
            style={[
              st.opcja,
              {
                borderColor: aktywna ? t.colors.primary : t.colors.border,
                backgroundColor: aktywna ? t.colors.muted : 'transparent',
              },
            ]}
          >
            <Text style={[st.nazwa, { color: t.colors.foreground }]}>{sectionName(s)}</Text>
            {przyklad ? (
              <Text style={[st.przyklad, { color: t.colors.mutedForeground }]} numberOfLines={1}>
                {przyklad}
              </Text>
            ) : null}
          </Pressable>
        );
      })}

      <Pressable onPress={onPelnaLista} hitSlop={6}>
        <Text style={[st.inna, { color: t.colors.mutedForeground }]}>Inna sekcja…</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  karta: { borderWidth: 1, borderRadius: radius.md, padding: 10, gap: 6 },
  naglowek: { fontFamily: FONT.sans, fontSize: 12.5, marginBottom: 2 },
  opcja: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: 7, paddingHorizontal: 10, gap: 1 },
  nazwa: { fontFamily: FONT.sans, fontSize: 14, fontWeight: '600' },
  przyklad: { fontFamily: FONT.sans, fontSize: 12 },
  inna: { fontFamily: FONT.sans, fontSize: 12.5, paddingTop: 2, textDecorationLine: 'underline' },
});
