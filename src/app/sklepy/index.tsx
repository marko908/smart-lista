import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Empty, FONT, H1, Input, Label, Pill, Screen } from '../../components/ui';
import { CHAINS, chainName, type ChainKey } from '../../data/chains';
import { czyAdmin } from '../../lib/admin';
import { useKonto } from '../../lib/konto';
import { BLOCK_BY_KEY } from '../../data/blocks';
import { openTextFile } from '../../lib/fileIO';
import { parseStoreFile } from '../../lib/mapFile';
import { wybierz } from '../../lib/potwierdz';
import { newId, useApp } from '../../lib/storage';
import { radius, useTheme } from '../../lib/theme';
import type { Store } from '../../lib/types';

export default function Stores() {
  const { sesja } = useKonto();
  const t = useTheme();
  const { state, update } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [chain, setChain] = useState<ChainKey>('lidl');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!note) return;
    const h = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(h);
  }, [note]);

  function addStore(parsed: Omit<Store, 'id' | 'createdAt'>) {
    const fresh: Store = { ...parsed, id: newId('store'), createdAt: new Date().toISOString() };
    update((prev) => ({ ...prev, stores: [...prev.stores, fresh] }));
    return fresh;
  }

  async function importFromFile() {
    const file = await openTextFile();
    if (!file.ok) {
      if (!file.cancelled) setNote(file.message);
      return;
    }
    const parsed = parseStoreFile(file.text);
    if (!parsed.ok) {
      setNote(parsed.error);
      return;
    }

    const dup = state.stores.find(
      (s) => s.name === parsed.store.name && s.chain === parsed.store.chain
    );
    const info = parsed.warnings.length ? ` ${parsed.warnings.join(' ')}` : '';

    if (!dup) {
      const fresh = addStore(parsed.store);
      setNote(`Wczytano „${fresh.name}".${info}`);
      return;
    }

    const wybor = await wybierz(
      'Taki sklep już jest',
      `„${dup.name}" już istnieje. Zastąpić jego plan, czy dodać osobny wpis?`,
      'Dodaj osobno',
      'Zastąp'
    );
    if (!wybor) return;

    if (wybor === 'pierwsza') {
      const fresh = addStore({ ...parsed.store, name: `${parsed.store.name} (kopia)` });
      setNote(`Dodano „${fresh.name}".${info}`);
      return;
    }

    update((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => (s.id === dup.id ? { ...s, ...parsed.store } : s)),
    }));
    setNote(`Zaktualizowano „${dup.name}".${info}`);
  }

  function createStore() {
    const store: Store = {
      id: newId('store'),
      name: name.trim() || `${chainName(chain)} — mój sklep`,
      chain,
      street: street.trim() || undefined,
      city: city.trim() || undefined,
      map: null,
      walkOrder: [],
      mappedAt: null,
      createdAt: new Date().toISOString(),
    };
    update((prev) => ({ ...prev, stores: [...prev.stores, store] }));
    setName('');
    setStreet('');
    setCity('');
    setAdding(false);
    router.push(`/sklepy/plan/${store.id}`);
  }

  /**
   * Rysowanie planów i wgrywanie plików należy do administratora.
   *
   * Plan zrobiony byle jak daje bezsensowną trasę, a człowiek obciąży winą
   * aplikację, nie własny rysunek. Użytkownik dostaje gotowy katalog i wybiera
   * z niego w konkretnej liście.
   */
  if (!czyAdmin(sesja)) {
    return (
      <Screen>
        <H1>Sklepy</H1>
        <Card>
          <Body muted>
            Katalog sklepów prowadzimy my. Sklep wybierzesz w każdej liście osobno, a ulubiony
            ustawisz w profilu.
          </Body>
        </Card>
        <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <H1>Moje sklepy</H1>
        <Body muted>
          Ułóż plan sklepu z klocków, a trasa policzy się sama. Można to zrobić z pamięci —
          nie trzeba stać w sklepie.
        </Body>
      </View>

      {adding ? (
        <Card>
          <Label>Sieć</Label>
          <View style={st.chains}>
            {CHAINS.map((c) => (
              <Pill
                key={c.key}
                label={c.name}
                active={chain === c.key}
                onPress={() => setChain(c.key)}
              />
            ))}
          </View>
          <Label>Nazwa sklepu</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="np. Lidl Poznańska"
          />

          {/* Adres, bo w zasięgu bywa kilka sklepów tej samej sieci, a plan
              jest przypisany do konkretnego budynku, nie do szyldu. */}
          <Label>Ulica</Label>
          <Input value={street} onChangeText={setStreet} placeholder="np. Poznańska 12" />

          <Label>Miasto</Label>
          <Input
            value={city}
            onChangeText={setCity}
            placeholder="np. Rybnik"
            returnKeyType="done"
            onSubmitEditing={createStore}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Dodaj i mapuj" onPress={createStore} style={{ flex: 1 }} />
            <Button
              title="Anuluj"
              variant="ghost"
              onPress={() => {
                setAdding(false);
                setName('');
              }}
            />
          </View>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          <Button title="Dodaj sklep" onPress={() => setAdding(true)} />
          <Button title="Wczytaj sklep z pliku" variant="secondary" onPress={importFromFile} />
        </View>
      )}

      {note && (
        <View style={[st.note, { backgroundColor: t.colors.muted, borderColor: t.colors.primary }]}>
          <Text style={[st.noteText, { color: t.colors.foreground }]}>{note}</Text>
        </View>
      )}

      {state.stores.length === 0 ? (
        <Empty
          title="Brak sklepów"
          hint="Dodaj ten, do którego chodzisz najczęściej, i ustaw jego marszrutę. Zajmuje to około dwóch minut."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {state.stores.map((store) => {
            const placed = store.map
              ? store.map.blocks.filter((b) => !BLOCK_BY_KEY[b.type]?.fixed).length
              : 0;
            const hasPlan = placed > 0;
            const mapped = hasPlan || store.walkOrder.length > 0;
            return (
              <Pressable
                key={store.id}
                onPress={() => router.push(`/sklepy/plan/${store.id}`)}
                style={({ pressed }) => [
                  st.row,
                  {
                    backgroundColor: t.colors.card,
                    borderColor: mapped ? t.colors.primary : t.colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[st.name, { color: t.colors.foreground }]}>{store.name}</Text>
                  <Text style={[st.meta, { color: t.colors.mutedForeground }]}>
                    {[chainName(store.chain), [store.street, store.city].filter(Boolean).join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                    {hasPlan
                      ? ` · plan: ${placed} klocków`
                      : store.walkOrder.length > 0
                        ? ` · marszruta: ${store.walkOrder.length} sekcji`
                        : ' · typowy układ sieci'}
                  </Text>
                </View>
                <Text style={[st.chev, { color: t.colors.primary }]}>›</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  chains: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
  },
  name: { fontFamily: FONT.sansSemi, fontSize: 16, letterSpacing: -0.25 },
  meta: { fontFamily: FONT.sans, fontSize: 13 },
  chev: { fontFamily: FONT.sansBold, fontSize: 26, lineHeight: 28 },
  note: { borderWidth: 1, borderLeftWidth: 3, borderRadius: radius.md, padding: 11 },
  noteText: { fontFamily: FONT.sansMedium, fontSize: 13.5, lineHeight: 19 },
});
