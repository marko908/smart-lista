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
import { odleglosc, opisOdleglosci, ustalPolozenie, type StanLokalizacji } from '../lib/lokalizacja';
import { radius, useTheme } from '../lib/theme';
import type { Store } from '../lib/types';

/**
 * Adres sklepu. Nazwa i tak zaczyna się od sieci, więc powtarzanie jej tutaj
 * dawało „Lidl · Lidl · Żorska 51".
 */
export function opisSklepu(s: Store): string {
  return [s.street, s.city].filter(Boolean).join(', ') || chainName(s.chain);
}

type Props = {
  sklepy: Store[];
  wybrany: string | null;
  onWybierz: (storeId: string | null) => void;
  onZamknij: () => void;
};

export function WyborSklepu({ sklepy, wybrany, onWybierz, onZamknij }: Props) {
  const t = useTheme();
  const [szukaj, setSzukaj] = useState('');
  const [gdzieJestem, setGdzieJestem] = useState<StanLokalizacji | null>(null);
  const [pytamy, setPytamy] = useState(false);

  async function pokazPobliskie() {
    setPytamy(true);
    setGdzieJestem(await ustalPolozenie());
    setPytamy(false);
  }

  /**
   * Kolejność: najpierw pasujące do wpisanego tekstu, potem najbliższe.
   *
   * Wpisany tekst zawsze wygrywa z odległością — jeśli ktoś pisze „żorska",
   * to wie, czego szuka, i sklep dwa kilometry dalej ma być wyżej niż ten za
   * rogiem. Odległość rozstrzyga dopiero wtedy, gdy pole jest puste albo
   * pasuje kilka sklepów.
   *
   * Sklep BEZ współrzędnych nigdy nie wypada z listy — brak danych po naszej
   * stronie nie może odbierać człowiekowi sklepu, do którego chodzi.
   */
  const widoczne = useMemo(() => {
    const dostepne = sklepy.filter((s) => !s.ukryty);
    const q = normalize(szukaj);
    const pasujace = q
      ? dostepne.filter((s) => normalize(`${s.name} ${s.street ?? ''} ${s.city ?? ''}`).includes(q))
      : dostepne;

    if (gdzieJestem?.stan !== 'znana') return pasujace;
    const ja = gdzieJestem.punkt;
    return [...pasujace].sort((a, b) => {
      const da = a.szerokosc != null && a.dlugosc != null
        ? odleglosc(ja, { szerokosc: a.szerokosc, dlugosc: a.dlugosc }) : Infinity;
      const db = b.szerokosc != null && b.dlugosc != null
        ? odleglosc(ja, { szerokosc: b.szerokosc, dlugosc: b.dlugosc }) : Infinity;
      if (da === db) return a.name.localeCompare(b.name, 'pl');
      return da - db;
    });
  }, [sklepy, szukaj, gdzieJestem]);

  function ileDaleko(s: Store): string | null {
    if (gdzieJestem?.stan !== 'znana' || s.szerokosc == null || s.dlugosc == null) return null;
    return opisOdleglosci(odleglosc(gdzieJestem.punkt, { szerokosc: s.szerokosc, dlugosc: s.dlugosc }));
  }

  return (
    <View style={[st.karta, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}>
      <Label>W którym sklepie</Label>

      {/* Pole zawsze widoczne. Chowanie go przy krótkiej liście oszczędzało
          kilkanaście punktów wysokości i zabierało jedyny sposób, żeby dojść
          do sklepu, nie przewijając całego katalogu. */}
      <Input
        value={szukaj}
        onChangeText={setSzukaj}
        placeholder="Wpisz nazwę, ulicę albo miasto"
        autoCorrect={false}
      />

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
              {[opisSklepu(s), ileDaleko(s)].filter(Boolean).join(' · ')}
              {s.map ? '' : ' · bez planu'}
            </Text>
          </Pressable>
        ))}

        {/* Pusty katalog i pusty wynik szukania to dwie różne sytuacje.
            „Nic nie pasuje do »«" przy zerze sklepów brzmiało jak awaria. */}
        {widoczne.length === 0 &&
          (sklepy.length === 0 ? (
            <Body muted>Nie ma jeszcze żadnego sklepu w katalogu.</Body>
          ) : (
            <Body muted>Nic nie pasuje do „{szukaj}".</Body>
          ))}
      </ScrollView>

      {/* Pytamy o lokalizację dopiero, gdy człowiek sam po nią sięgnie.
          Prośba przy starcie, zanim wiadomo po co, jest zwykle odrzucana,
          a odmowy nie da się cofnąć bez wchodzenia w ustawienia systemu. */}
      {gdzieJestem?.stan !== 'znana' && (
        <Button
          title={
            pytamy
              ? 'Sprawdzam…'
              : gdzieJestem?.stan === 'odmowa'
                ? 'Bez dostępu do lokalizacji'
                : 'Pokaż najbliższe'
          }
          variant="secondary"
          disabled={pytamy || gdzieJestem?.stan === 'odmowa'}
          onPress={pokazPobliskie}
        />
      )}

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
