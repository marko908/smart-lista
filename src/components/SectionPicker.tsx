/**
 * Wybór sekcji z wyszukiwarką.
 *
 * Katalog ma ponad pięćdziesiąt pozycji i przewijanie ich wzrokiem w poszukiwaniu
 * „Zupy i buliony" jest męczące. Filtr dopasowuje bez ogonków i bez względu na
 * wielkość liter, więc „zupy", „ZUPY" i „zupé" trafiają w to samo.
 *
 * Bez wpisanego tekstu pokazujemy sekcje pogrupowane — wtedy łatwiej przeglądać.
 * Po wpisaniu przechodzimy na płaską listę, bo grupy tylko rozpraszają.
 *
 * Pole samo łapie kursor przy otwarciu i odzyskuje go po każdym wyborze. Przy
 * regale z pięcioma kategoriami sięganie po mysz między kolejnymi wpisami było
 * najbardziej męczącą częścią mapowania. Wyjście z pola to Escape albo
 * kliknięcie gdzie indziej — czyli decyzja człowieka, nie skutek uboczny.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Input, Label, Pill } from './ui';
import { SECTIONS, SECTION_GROUPS, type SectionKey } from '../data/sections';
import { normalize } from '../lib/normalize';
import { radius, useTheme } from '../lib/theme';
import { FONT } from './ui';

type Props = {
  title?: string;
  selected?: SectionKey | null;
  onPick: (key: SectionKey) => void;
  /** Escape w polu wyszukiwania — zamknięcie wyboru. */
  onClose?: () => void;
  /**
   * Kategorie już obecne na planie. Pokazujemy je na czerwono, resztę na zielono —
   * to podpowiedź „czy o tym już pomyślałem", a nie zakaz. Ta sama kategoria
   * bywa w sklepie w dwóch miejscach i wtedy stawia się ją dwa razy.
   */
  uzyte?: ReadonlySet<SectionKey>;
  /** Dodatkowy element pod listą, np. „usuń drugą stronę". */
  footer?: React.ReactNode;
};

export function SectionPicker({ title = 'Wybierz sekcję', selected, onPick, onClose, uzyte, footer }: Props) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const pole = useRef<TextInput>(null);

  /**
   * Ustawienie kursora BEZ przewijania.
   *
   * Zwykłe `focus()` każe przeglądarce przewinąć pole „do widoku", a że panel
   * przerysowuje się w tej samej chwili (dochodzi nowy kafelek kategorii),
   * przewijało to całą listę na samą górę. Przy regale z kilkoma kategoriami
   * trzeba było scrollować z powrotem po każdym wyborze.
   */
  function kursorDoPola() {
    const node = pole.current as unknown as HTMLElement | null;
    if (Platform.OS === 'web' && node && typeof node.focus === 'function') {
      node.focus({ preventScroll: true });
      return;
    }
    pole.current?.focus();
  }

  // Kursor ląduje w polu od razu po otwarciu — bez sięgania po mysz.
  useEffect(() => {
    const h = setTimeout(kursorDoPola, 30);
    return () => clearTimeout(h);
  }, []);

  function wybierz(key: SectionKey) {
    onPick(key);
    // Czyścimy zapytanie i wracamy kursorem do pola, żeby dało się od razu
    // wpisać kolejną kategorię. Regał ma ich często kilka.
    setQuery('');
    kursorDoPola();
  }

  /**
   * Escape zamyka wybór. Nasłuch wisi wprost na węźle, bo React Native Web
   * obsługuje `onKeyDown` na polu tekstowym po swojemu i przekazana z zewnątrz
   * funkcja nigdy nie dochodzi.
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || !onClose) return;
    const node = pole.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    node.addEventListener('keydown', esc);
    return () => node.removeEventListener('keydown', esc);
  }, [onClose]);

  const q = normalize(query);
  const matches = useMemo(() => {
    if (!q) return null;
    return SECTIONS.filter((s) => {
      const name = normalize(s.name);
      const hint = s.hint ? normalize(s.hint) : '';
      return name.includes(q) || hint.includes(q) || normalize(s.key).includes(q);
    });
  }, [q]);

  return (
    <View style={[st.box, { borderColor: t.colors.border, backgroundColor: t.colors.muted }]}>
      <Label>{title}</Label>
      <Input
        ref={pole}
        value={query}
        onChangeText={setQuery}
        placeholder="Szukaj sekcji…"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {matches ? (
        matches.length ? (
          <>
            <Text style={[st.count, { color: t.colors.mutedForeground }]}>
              {matches.length === 1 ? '1 sekcja' : `${matches.length} sekcji`}
            </Text>
            <View style={st.wrap}>
              {matches.map((sec) => (
                <Pill
                  key={sec.key}
                  label={sec.name}
                  active={sec.key === selected}
                  stan={uzyte ? (uzyte.has(sec.key) ? 'zajeta' : 'wolna') : undefined}
                  onPress={() => wybierz(sec.key)}
                />
              ))}
            </View>
          </>
        ) : (
          <Text style={[st.count, { color: t.colors.mutedForeground }]}>
            Nic takiego nie ma w katalogu. Katalog jest zamknięty — jeśli czegoś
            naprawdę brakuje, trzeba to dopisać w kodzie.
          </Text>
        )
      ) : (
        SECTION_GROUPS.map((g) => {
          const items = SECTIONS.filter((s) => s.group === g);
          if (!items.length) return null;
          return (
            <View key={g} style={{ gap: 6 }}>
              <Text style={[st.group, { color: t.colors.mutedForeground }]}>{g}</Text>
              <View style={st.wrap}>
                {items.map((sec) => (
                  <Pill
                    key={sec.key}
                    label={sec.name}
                    active={sec.key === selected}
                    stan={uzyte ? (uzyte.has(sec.key) ? 'zajeta' : 'wolna') : undefined}
                    onPress={() => wybierz(sec.key)}
                  />
                ))}
              </View>
            </View>
          );
        })
      )}

      {footer}
    </View>
  );
}

const st = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.md, padding: 11, gap: 9 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  group: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  count: { fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 17 },
});
