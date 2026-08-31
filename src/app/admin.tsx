/**
 * Panel administratora — katalog sklepów.
 *
 * Sklepy nie należą do użytkownika. Człowiek robiący zakupy wybiera z gotowego
 * katalogu i nie rysuje planów, bo plan zrobiony byle jak daje bezsensowną
 * trasę, a winą i tak obciąży aplikację.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SKLEP NIE MA WŁASNEJ NAZWY
 *
 * Sieć plus adres identyfikują go jednoznacznie i bez pola do wymyślania.
 * Osobna nazwa była zaproszeniem do bałaganu: „Lidl", „lidl żorska",
 * „Lidl przy domu" — trzy zapisy tego samego sklepu, nieporównywalne między
 * sobą. Nazwę składamy z sieci i adresu przy zapisie.
 *
 * ZMIANY WCHODZĄ DOPIERO PO „ZAPISZ"
 *
 * Formularz trzyma własny brudnopis. Zapisywanie przy każdym naciśnięciu
 * klawisza znaczyło, że w połowie wpisywania ulicy katalog ma sklep z ulicą
 * „Żors" — i że synchronizacja wysyła każdy taki stan do bazy.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Body, Button, Card, FONT, H1, Input, Label, Pill, Screen } from '../components/ui';
import { StorePlan } from '../components/StorePlan';
import { CHAINS, chainName, type ChainKey } from '../data/chains';
import { czyAdmin } from '../lib/admin';
import { ustalPolozenie } from '../lib/lokalizacja';
import { useKonto } from '../lib/konto';
import { potwierdz } from '../lib/potwierdz';
import { newId, useApp } from '../lib/storage';
import { radius, useTheme } from '../lib/theme';
import type { Store } from '../lib/types';

/** Nazwa składana z tego, co identyfikuje sklep naprawdę. */
export function zlozNazwe(chain: ChainKey, street?: string, city?: string): string {
  return [chainName(chain), [street, city].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
}

type Brudnopis = {
  chain: ChainKey;
  street: string;
  city: string;
  szerokosc?: number;
  dlugosc?: number;
};

export default function Admin() {
  const t = useTheme();
  const { sesja } = useKonto();
  const { state, update } = useApp();
  const { width } = useWindowDimensions();
  const [otwarty, setOtwarty] = useState<string | null>(null);
  const [brudnopis, setBrudnopis] = useState<Brudnopis | null>(null);
  const [pobieram, setPobieram] = useState(false);

  /** Na monitorze plan mieści się obok listy i nie ma powodu go chować. */
  const szeroki = Platform.OS === 'web' && width >= 900;

  const sklepy = useMemo(
    () => [...state.stores].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    [state.stores]
  );

  if (!czyAdmin(sesja)) {
    return (
      <Screen>
        <H1>Panel</H1>
        <Card>
          <Body muted>Ten ekran jest dla administratora katalogu sklepów.</Body>
        </Card>
        <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  function zmien(id: string, zmiana: Partial<Store>) {
    update((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => (s.id === id ? { ...s, ...zmiana } : s)),
    }));
  }

  function otworz(s: Store) {
    if (otwarty === s.id) {
      setOtwarty(null);
      setBrudnopis(null);
      return;
    }
    setOtwarty(s.id);
    setBrudnopis({
      chain: s.chain,
      street: s.street ?? '',
      city: s.city ?? '',
      szerokosc: s.szerokosc,
      dlugosc: s.dlugosc,
    });
  }

  function zapisz(id: string) {
    if (!brudnopis) return;
    zmien(id, {
      chain: brudnopis.chain,
      street: brudnopis.street.trim() || undefined,
      city: brudnopis.city.trim() || undefined,
      szerokosc: brudnopis.szerokosc,
      dlugosc: brudnopis.dlugosc,
      name: zlozNazwe(brudnopis.chain, brudnopis.street.trim(), brudnopis.city.trim()),
    });
    setOtwarty(null);
    setBrudnopis(null);
  }

  async function zlapPolozenie() {
    setPobieram(true);
    const gdzie = await ustalPolozenie();
    setPobieram(false);
    if (gdzie.stan !== 'znana' || !brudnopis) return;
    setBrudnopis({ ...brudnopis, szerokosc: gdzie.punkt.szerokosc, dlugosc: gdzie.punkt.dlugosc });
  }

  async function usun(sklep: Store) {
    /**
     * Kasowanie jest nieodwracalne i zabiera kilkadziesiąt minut układania
     * klocków. Pytamy wprost i mówimy, co dokładnie zniknie — oraz że jest
     * łagodniejsze wyjście.
     */
    const zgoda = await potwierdz(
      'Usunąć sklep z bazy?',
      `„${sklep.name}" zniknie razem z planem. Tego nie da się cofnąć — jeśli chcesz go tylko schować przed użytkownikami, użyj ukrycia.`
    );
    if (!zgoda) return;
    update((prev) => ({
      ...prev,
      stores: prev.stores.filter((s) => s.id !== sklep.id),
      lists: prev.lists.map((l) => (l.storeId === sklep.id ? { ...l, storeId: null } : l)),
      ulubionySklep: prev.ulubionySklep === sklep.id ? null : prev.ulubionySklep,
    }));
  }

  function dodaj() {
    const sklep: Store = {
      id: newId('store'),
      name: zlozNazwe('lidl'),
      chain: 'lidl',
      map: null,
      walkOrder: [],
      mappedAt: null,
      createdAt: new Date().toISOString(),
      // Nowy sklep startuje ukryty: bez planu trasa z niego nie ma sensu,
      // a użytkownik nie ma jak tego rozpoznać.
      ukryty: true,
    };
    update((prev) => ({ ...prev, stores: [...prev.stores, sklep] }));
    otworz(sklep);
  }

  const podglad = sklepy.find((s) => s.id === otwarty) ?? null;
  const widocznych = sklepy.filter((s) => !s.ukryty).length;

  const lista = (
    <>
      <View style={{ gap: 4 }}>
        <H1>Katalog sklepów</H1>
        <Body muted>
          {sklepy.length} w bazie · {widocznych} widocznych dla użytkowników
        </Body>
      </View>

      <Button title="Dodaj sklep" onPress={dodaj} />

      {sklepy.length === 0 && <Body muted>Katalog jest pusty.</Body>}

      {sklepy.map((s) => {
        const rozwiniety = otwarty === s.id;
        return (
          <Card key={s.id}>
            <View style={st.naglowek}>
              <Pressable style={{ flex: 1 }} onPress={() => otworz(s)}>
                <Text style={[st.nazwa, { color: t.colors.foreground }]}>{s.name}</Text>
                <Text style={[st.opis, { color: t.colors.mutedForeground }]}>
                  {s.map ? 'z planem' : 'bez planu'}
                  {s.szerokosc == null ? ' · bez współrzędnych' : ''}
                </Text>
              </Pressable>

              {/* Szybkie akcje: ukrycie i skasowanie bez rozwijania wiersza.
                  To są dwie rzeczy, które robi się najczęściej i po których
                  nie ma się co zastanawiać nad resztą pól. */}
              <Pressable
                onPress={() => zmien(s.id, { ukryty: !s.ukryty })}
                hitSlop={10}
                accessibilityLabel={s.ukryty ? 'Pokaż użytkownikom' : 'Ukryj przed użytkownikami'}
                style={[
                  st.akcja,
                  { borderColor: s.ukryty ? t.colors.border : t.colors.primary },
                ]}
              >
                <Text
                  style={[
                    st.akcjaZnak,
                    { color: s.ukryty ? t.colors.mutedForeground : t.colors.primary },
                  ]}
                >
                  {s.ukryty ? '🚫' : '👁'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => usun(s)}
                hitSlop={10}
                accessibilityLabel={`Usuń ${s.name}`}
                style={[st.akcja, { borderColor: t.colors.destructive }]}
              >
                <Text style={[st.akcjaZnak, { color: t.colors.destructive }]}>🗑</Text>
              </Pressable>
            </View>

            {rozwiniety && brudnopis && (
              <View style={{ gap: 8, marginTop: 10 }}>
                <Label>Sieć</Label>
                <View style={st.sieci}>
                  {CHAINS.map((c) => (
                    <Pill
                      key={c.key}
                      label={c.name}
                      active={brudnopis.chain === c.key}
                      onPress={() => setBrudnopis({ ...brudnopis, chain: c.key as ChainKey })}
                    />
                  ))}
                </View>

                <Label>Ulica</Label>
                <Input
                  value={brudnopis.street}
                  onChangeText={(v) => setBrudnopis({ ...brudnopis, street: v })}
                  placeholder="np. Żorska 51"
                />

                <Label>Miasto</Label>
                <Input
                  value={brudnopis.city}
                  onChangeText={(v) => setBrudnopis({ ...brudnopis, city: v })}
                  placeholder="np. Rybnik"
                />

                <Label>Współrzędne</Label>
                <Body muted>
                  {brudnopis.szerokosc != null && brudnopis.dlugosc != null
                    ? `${brudnopis.szerokosc.toFixed(5)}, ${brudnopis.dlugosc.toFixed(5)}`
                    : 'Brak — sklep nie pojawi się wśród najbliższych.'}
                </Body>
                <Button
                  title={pobieram ? 'Pobieram…' : 'Użyj mojej lokalizacji'}
                  variant="secondary"
                  disabled={pobieram}
                  onPress={zlapPolozenie}
                />

                <Button title="Zapisz" onPress={() => zapisz(s.id)} />
                <Button
                  title={s.map ? 'Edytuj plan' : 'Narysuj plan'}
                  variant="secondary"
                  onPress={() => router.push(`/sklepy/plan/${s.id}`)}
                />
                <Button
                  title="Anuluj"
                  variant="ghost"
                  onPress={() => {
                    setOtwarty(null);
                    setBrudnopis(null);
                  }}
                />
              </View>
            )}
          </Card>
        );
      })}

      <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
    </>
  );

  if (!szeroki) return <Screen>{lista}</Screen>;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.colors.background }}>
      <View style={{ flex: 1, minWidth: 380 }}>
        <Screen>{lista}</Screen>
      </View>

      {/* Plan obok listy, bez chowania — na monitorze jest na niego miejsce,
          a przy edycji katalogu chce się widzieć, o którym sklepie mowa. */}
      <View style={[st.podglad, { borderLeftColor: t.colors.border }]}>
        {podglad?.map ? (
          <>
            <Label>{podglad.name}</Label>
            <StorePlan map={podglad.map} cell={12} uproszczony />
          </>
        ) : (
          <Body muted>
            {podglad ? 'Ten sklep nie ma jeszcze planu.' : 'Wybierz sklep, żeby zobaczyć plan.'}
          </Body>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  naglowek: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nazwa: { fontFamily: FONT.sans, fontSize: 15, fontWeight: '600' },
  opis: { fontFamily: FONT.sans, fontSize: 12.5, marginTop: 2 },
  akcja: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  akcjaZnak: { fontFamily: FONT.sans, fontSize: 15, lineHeight: 19 },
  sieci: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  podglad: { width: 420, borderLeftWidth: 1, padding: 16, gap: 10 },
});
