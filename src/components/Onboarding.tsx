/**
 * Wprowadzenie przy pierwszym wejściu.
 *
 * Alejka wymaga od człowieka dwóch rzeczy, których żadna inna lista zakupów
 * nie wymaga: zmapowania sklepu i pisania DOKŁADNYCH nazw. Jedno i drugie jest
 * nieoczywiste, a ceną za niezrozumienie jest trasa, która nie ma sensu.
 *
 * Dlatego zamiast osobnych plansz przyciemniamy prawdziwy ekran i pokazujemy
 * na nim to, o czym mowa. Człowiek widzi swoją aplikację, nie ilustrację.
 *
 * Pominięcie jest równie ważne jak przejście: ludzie, którzy wiedzą, co robią,
 * nie mogą być zakładnikami wprowadzenia.
 */

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, FONT } from './ui';
import { radius, useTheme } from '../lib/theme';

type Krok = { tytul: string; tresc: string };

const KROKI: Krok[] = [
  {
    tytul: 'Lista układa się sama',
    tresc:
      'Wpisujesz produkty w dowolnej kolejności, a Alejka ustawia je tak, jak mija się je idąc przez sklep. Nie musisz nic sortować.',
  },
  {
    tytul: 'Pisz dokładnie',
    tresc:
      'To jest jedyna rzecz, o którą prosimy. „Ser żółty" trafi w inne miejsce niż „serek wiejski", a samo „ser" musimy zgadnąć. Im dokładniej napiszesz, tym lepsza trasa.',
  },
  {
    tytul: 'Wybierz sklep',
    tresc:
      'Trasa liczy się z planu konkretnego sklepu. Bez sklepu lista zostaje w kolejności wpisywania — działa, ale nie prowadzi.',
  },
  {
    tytul: 'Plan rysujesz raz',
    tresc:
      'W zakładce Sklepy układasz plan z klocków — można to zrobić z pamięci, nie trzeba stać w sklepie. Potem służy przy każdych zakupach.',
  },
];

export function Onboarding({ onKoniec }: { onKoniec: () => void }) {
  const t = useTheme();
  const [krok, setKrok] = useState(0);
  const ostatni = krok === KROKI.length - 1;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onKoniec}>
      {/* Przyciemnienie, a nie zasłonięcie — pod spodem ma być widać własny ekran. */}
      <Pressable style={st.zaslona} onPress={onKoniec}>
        <Pressable style={st.stop} onPress={(e) => e.stopPropagation()}>
          <View style={[st.karta, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
            <View style={st.kropki}>
              {KROKI.map((_, i) => (
                <View
                  key={i}
                  style={[
                    st.kropka,
                    { backgroundColor: i === krok ? t.colors.primary : t.colors.border },
                  ]}
                />
              ))}
            </View>

            <Text style={[st.tytul, { color: t.colors.foreground }]}>{KROKI[krok].tytul}</Text>
            <Text style={[st.tresc, { color: t.colors.mutedForeground }]}>{KROKI[krok].tresc}</Text>

            <View style={st.przyciski}>
              {krok > 0 && (
                <View style={{ flex: 1 }}>
                  <Button title="Wstecz" variant="ghost" onPress={() => setKrok(krok - 1)} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button
                  title={ostatni ? 'Zaczynamy' : 'Dalej'}
                  onPress={() => (ostatni ? onKoniec() : setKrok(krok + 1))}
                />
              </View>
            </View>

            {!ostatni && <Button title="Pomiń" variant="ghost" onPress={onKoniec} />}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  zaslona: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  stop: { padding: 14 },
  karta: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 10 },
  kropki: { flexDirection: 'row', gap: 5, marginBottom: 2 },
  kropka: { width: 18, height: 3, borderRadius: radius.full },
  tytul: { fontFamily: FONT.sans, fontSize: 19, fontWeight: '700' },
  tresc: { fontFamily: FONT.sans, fontSize: 14, lineHeight: 20 },
  przyciski: { flexDirection: 'row', gap: 8, marginTop: 2 },
});
