/**
 * Poprawianie ilości i miary jednej pozycji.
 *
 * Rozpoznawanie „3kg", „500g", „300ml" trafia w większość przypadków, ale nie
 * we wszystkie — a człowiek nie ma jak tego naprawić, jeśli nie damy mu pola.
 * To jest to pole.
 *
 * Liczba i miara są ROZDZIELNE. Wyczyszczenie miary zostawia samą liczbę
 * („2 mleka"), wyczyszczenie liczby zostawia samą miarę, wyczyszczenie obu
 * chowa dopisek. Każdy z tych stanów jest sensowny i żaden nie jest błędem.
 */

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Body, Button, FONT, Input, Label } from './ui';
import { radius, useTheme } from '../lib/theme';

/** Miary podsuwane jednym dotknięciem. Wpisać można cokolwiek. */
const MIARY = ['szt', 'kg', 'g', 'l', 'ml', 'opak', 'but', 'pęczek'];

type Props = {
  nazwa: string;
  ilosc?: string;
  miara?: string;
  onZapisz: (ilosc: string | undefined, miara: string | undefined) => void;
  onZamknij: () => void;
};

export function EdytorIlosci({ nazwa, ilosc, miara, onZapisz, onZamknij }: Props) {
  const t = useTheme();
  const [l, setL] = useState(ilosc ?? '');
  const [m, setM] = useState(miara ?? '');

  function zapisz() {
    onZapisz(l.trim() || undefined, m.trim() || undefined);
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onZamknij}>
      <Pressable style={st.zaslona} onPress={onZamknij}>
        <Pressable style={st.stop} onPress={(e) => e.stopPropagation()}>
          <View style={[st.karta, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
            <Text style={[st.tytul, { color: t.colors.foreground }]} numberOfLines={2}>
              {nazwa}
            </Text>

            <Label>Ile</Label>
            <Input
              value={l}
              onChangeText={setL}
              placeholder="np. 2"
              keyboardType="decimal-pad"
              autoFocus
            />

            <Label>Miara</Label>
            <Input value={m} onChangeText={setM} placeholder="zostaw puste, jeśli sztuki" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={st.miary}>
                {MIARY.map((x) => (
                  <Pressable
                    key={x}
                    onPress={() => setM(m === x ? '' : x)}
                    style={[
                      st.miara,
                      {
                        borderColor: m === x ? t.colors.primary : t.colors.border,
                        backgroundColor: m === x ? t.colors.muted : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[st.miaraText, { color: t.colors.foreground }]}>{x}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Body muted>
              Puste pole znaczy „nie pokazuj". Możesz zostawić samą liczbę albo samą miarę.
            </Body>

            <Button title="Zapisz" onPress={zapisz} />
            <Button title="Anuluj" variant="ghost" onPress={onZamknij} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  zaslona: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  stop: { padding: 14 },
  karta: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 8 },
  tytul: { fontFamily: FONT.sans, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  miary: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  miara: { borderWidth: 1, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: 12 },
  miaraText: { fontFamily: FONT.sans, fontSize: 13 },
});
