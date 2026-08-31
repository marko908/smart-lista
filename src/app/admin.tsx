/**
 * Panel administratora — katalog sklepów.
 *
 * Sklepy przestały być własnością użytkownika. Człowiek robiący zakupy wybiera
 * z gotowego katalogu i nie rysuje planów — bo plan zrobiony byle jak daje
 * bezsensowną trasę, a winą za to i tak obciąży aplikację.
 *
 * Ekran chowa się przed nieadministratorami, ale to jest tylko schowanie
 * guzika: pisanie po katalogu blokują reguły RLS w bazie, nie ten warunek.
 */

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, FONT, H1, Input, Label, Pill, Screen } from '../components/ui';
import { CHAINS, chainName, type ChainKey } from '../data/chains';
import { czyAdmin } from '../lib/admin';
import { useKonto } from '../lib/konto';
import { potwierdz } from '../lib/potwierdz';
import { newId, useApp } from '../lib/storage';
import { radius, useTheme } from '../lib/theme';
import type { Store } from '../lib/types';

export default function Admin() {
  const t = useTheme();
  const { sesja } = useKonto();
  const { state, update } = useApp();
  const [edytowany, setEdytowany] = useState<string | null>(null);
  const [nowy, setNowy] = useState(false);

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

  async function usun(sklep: Store) {
    /**
     * Kasowanie jest nieodwracalne i zabiera CUDZĄ pracę — plan sklepu to
     * kilkadziesiąt minut układania klocków. Dlatego pytamy wprost, a w pytaniu
     * mówimy, co dokładnie zniknie.
     */
    const zgoda = await potwierdz(
      'Usunąć sklep z bazy?',
      `„${sklep.name}" zniknie razem z planem. Tego nie da się cofnąć — jeśli chcesz go tylko schować przed użytkownikami, użyj „Ukryj".`
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
      name: 'Nowy sklep',
      chain: 'lidl',
      map: null,
      walkOrder: [],
      mappedAt: null,
      createdAt: new Date().toISOString(),
      // Nowy sklep startuje ukryty: dopóki nie ma planu, trasa z niego
      // nie ma sensu, a użytkownik nie ma jak tego rozpoznać.
      ukryty: true,
    };
    update((prev) => ({ ...prev, stores: [...prev.stores, sklep] }));
    setEdytowany(sklep.id);
    setNowy(false);
  }

  const widoczne = sklepy.filter((s) => !s.ukryty).length;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <H1>Katalog sklepów</H1>
        <Body muted>
          {sklepy.length} w bazie · {widoczne} widocznych dla użytkowników
        </Body>
      </View>

      <Button title="Dodaj sklep" onPress={dodaj} />

      {sklepy.length === 0 && <Body muted>Katalog jest pusty.</Body>}

      {sklepy.map((s) => {
        const otwarty = edytowany === s.id;
        return (
          <Card key={s.id}>
            <Pressable onPress={() => setEdytowany(otwarty ? null : s.id)}>
              <View style={st.naglowek}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[st.nazwa, { color: t.colors.foreground }]}>{s.name}</Text>
                  <Text style={[st.opis, { color: t.colors.mutedForeground }]}>
                    {chainName(s.chain)}
                    {s.street || s.city ? ` · ${[s.street, s.city].filter(Boolean).join(', ')}` : ''}
                    {s.map ? '' : ' · bez planu'}
                  </Text>
                </View>
                <Text
                  style={[
                    st.stan,
                    {
                      color: s.ukryty ? t.colors.mutedForeground : t.colors.primary,
                      borderColor: s.ukryty ? t.colors.border : t.colors.primary,
                    },
                  ]}
                >
                  {s.ukryty ? 'ukryty' : 'widoczny'}
                </Text>
              </View>
            </Pressable>

            {otwarty && (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Label>Nazwa</Label>
                <Input value={s.name} onChangeText={(v) => zmien(s.id, { name: v })} />

                <Label>Sieć</Label>
                <View style={st.sieci}>
                  {CHAINS.map((c) => (
                    <Pill
                      key={c.key}
                      label={c.name}
                      active={s.chain === c.key}
                      onPress={() => zmien(s.id, { chain: c.key as ChainKey })}
                    />
                  ))}
                </View>

                <Label>Ulica</Label>
                <Input
                  value={s.street ?? ''}
                  onChangeText={(v) => zmien(s.id, { street: v })}
                  placeholder="np. Żorska 2"
                />

                <Label>Miasto</Label>
                <Input
                  value={s.city ?? ''}
                  onChangeText={(v) => zmien(s.id, { city: v })}
                  placeholder="np. Rybnik"
                />

                <Button
                  title={s.map ? 'Edytuj plan' : 'Narysuj plan'}
                  variant="secondary"
                  onPress={() => router.push(`/sklepy/plan/${s.id}`)}
                />
                <Button
                  title={s.ukryty ? 'Pokaż użytkownikom' : 'Ukryj przed użytkownikami'}
                  variant="secondary"
                  onPress={() => zmien(s.id, { ukryty: !s.ukryty })}
                />
                <Button title="Usuń z bazy" variant="danger" onPress={() => usun(s)} />
              </View>
            )}
          </Card>
        );
      })}

      <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const st = StyleSheet.create({
  naglowek: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nazwa: { fontFamily: FONT.sans, fontSize: 15, fontWeight: '600' },
  opis: { fontFamily: FONT.sans, fontSize: 12.5 },
  stan: {
    fontFamily: FONT.sans, fontSize: 11, borderWidth: 1, borderRadius: radius.full,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  sieci: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
