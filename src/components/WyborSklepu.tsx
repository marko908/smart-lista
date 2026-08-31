/**
 * Wybór sklepu dla listy.
 *
 * Rząd pigułek działał przy trzech sklepach i przestawał przy dziesięciu —
 * a człowiek, który zmapował kilka Biedronek, ma ich właśnie tyle. Dlatego
 * lista z wyszukiwarką, a na ekranie listy zakupów widać tylko OSTATNI wybór.
 *
 * Adres jest tu równie ważny jak nazwa: „Biedronka" i „Biedronka" różnią się
 * wyłącznie ulicą, a plan sklepu jest przypisany do konkretnego budynku.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Body, Button, FONT, Input, Label } from './ui';
import { chainName } from '../data/chains';
import { normalize } from '../lib/normalize';
import { radius, useTheme } from '../lib/theme';
import type { Store } from '../lib/types';

export function opisSklepu(s: Store): string {
  const adres = [s.street, s.city].filter(Boolean).join(', ');
  return [chainName(s.chain), adres].filter(Boolean).join(' · ');
}

type Props = {
  sklepy: Store[];
  wybrany: string | null;
  onWybierz: (storeId: string | null) => void;
  onZamknij: () => void;
  /** Przejście do zakładania nowego sklepu. */
  onNowy: () => void;
};

export function WyborSklepu({ sklepy, wybrany, onWybierz, onZamknij, onNowy }: Props) {
  const t = useTheme();
  const [szukaj, setSzukaj] = useState('');

  const widoczne = useMemo(() => {
    const q = normalize(szukaj);
    if (!q) return sklepy;
    return sklepy.filter((s) => normalize(`${s.name} ${s.street ?? ''} ${s.city ?? ''}`).includes(q));
  }, [sklepy, szukaj]);

  return (
    <View style={[st.karta, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
      <Label>W którym sklepie</Label>

      {sklepy.length > 4 && (
        <Input value={szukaj} onChangeText={setSzukaj} placeholder="Szukaj po nazwie albo ulicy" />
      )}

      <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => onWybierz(null)}
          style={[st.wiersz, { borderColor: !wybrany ? t.colors.primary : t.colors.border }]}
        >
          <Text style={[st.nazwa, { color: t.colors.foreground }]}>Bez sklepu</Text>
          <Text style={[st.opis, { color: t.colors.mutedForeground }]}>
            lista w kolejności wpisywania
          </Text>
        </Pressable>

        {widoczne.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onWybierz(s.id)}
            style={[st.wiersz, { borderColor: s.id === wybrany ? t.colors.primary : t.colors.border }]}
          >
            <Text style={[st.nazwa, { color: t.colors.foreground }]}>{s.name}</Text>
            <Text style={[st.opis, { color: t.colors.mutedForeground }]}>
              {opisSklepu(s)}
              {s.map ? '' : ' · bez planu'}
            </Text>
          </Pressable>
        ))}

        {/* Pusty katalog i pusty wynik szukania to dwie różne sytuacje.
            „Nic nie pasuje do »«" przy zerze sklepów brzmiało jak awaria. */}
        {widoczne.length === 0 &&
          (sklepy.length === 0 ? (
            <Body muted>Nie masz jeszcze żadnego sklepu. Zmapuj pierwszy, żeby trasa miała sens.</Body>
          ) : (
            <Body muted>Nic nie pasuje do „{szukaj}".</Body>
          ))}
      </ScrollView>

      <Button title="Dodaj nowy sklep" variant="secondary" onPress={onNowy} />
      <Button title="Zamknij" variant="ghost" onPress={onZamknij} />
    </View>
  );
}

const st = StyleSheet.create({
  karta: { borderWidth: 1, borderRadius: radius.md, padding: 10, gap: 8 },
  wiersz: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6, gap: 1 },
  nazwa: { fontFamily: FONT.sans, fontSize: 14, fontWeight: '600' },
  opis: { fontFamily: FONT.sans, fontSize: 12 },
});
