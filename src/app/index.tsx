import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Empty, FONT, H1, Input, Label, Screen } from '../components/ui';
import { chainName } from '../data/chains';
import { PRODUCT_COUNT } from '../data/products';
import { newId, useApp } from '../lib/storage';
import { radius, useTheme } from '../lib/theme';
import type { ShoppingList } from '../lib/types';

export default function Home() {
  const t = useTheme();
  const { state, update } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  function createList() {
    const trimmed = name.trim() || 'Zakupy';
    const list: ShoppingList = {
      id: newId('list'),
      name: trimmed,
      storeId: state.stores[0]?.id ?? null,
      items: [],
      createdAt: new Date().toISOString(),
    };
    update((prev) => ({ ...prev, lists: [list, ...prev.lists] }));
    setName('');
    setAdding(false);
    router.push(`/lista/${list.id}`);
  }

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <H1>Listy zakupów</H1>
        <Body muted>
          Lista układa się w kolejności przejścia przez sklep, nie w kolejności wpisywania.
        </Body>
      </View>

      <Pressable
        onPress={() => router.push('/sklepy')}
        style={({ pressed }) => [
          st.storesRow,
          {
            backgroundColor: t.colors.card,
            borderColor: t.colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[st.storesTitle, { color: t.colors.foreground }]}>Moje sklepy</Text>
          <Text style={[st.storesHint, { color: t.colors.mutedForeground }]}>
            {state.stores.length === 0
              ? 'Zmapuj pierwszy sklep, żeby trasa miała sens'
              : `${state.stores.length} ${plural(state.stores.length, 'sklep', 'sklepy', 'sklepów')} · ${
                  state.stores.filter((s) => s.walkOrder.length > 0).length
                } z marszrutą`}
          </Text>
        </View>
        <Text style={[st.chev, { color: t.colors.primary }]}>›</Text>
      </Pressable>

      {adding ? (
        <Card>
          <Label>Nazwa listy</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="np. Zakupy na weekend"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={createList}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Utwórz" onPress={createList} style={{ flex: 1 }} />
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
        <Button title="Nowa lista" onPress={() => setAdding(true)} />
      )}

      {state.lists.length === 0 ? (
        <Empty
          title="Jeszcze żadnej listy"
          hint={`Katalog zna ${PRODUCT_COUNT} produktów i sam przypisze je do sekcji sklepu.`}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {state.lists.map((list) => {
            const store = state.stores.find((s) => s.id === list.storeId) ?? null;
            const left = list.items.filter((i) => !i.checked).length;
            return (
              <Pressable
                key={list.id}
                onPress={() => router.push(`/lista/${list.id}`)}
                style={({ pressed }) => [
                  st.listRow,
                  {
                    backgroundColor: t.colors.card,
                    borderColor: t.colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[st.listName, { color: t.colors.foreground }]}>{list.name}</Text>
                  <Text style={[st.listMeta, { color: t.colors.mutedForeground }]}>
                    {store ? `${store.name} · ${chainName(store.chain)}` : 'Bez sklepu'}
                  </Text>
                </View>
                <View
                  style={[
                    st.badge,
                    {
                      backgroundColor: left > 0 ? t.colors.primary : t.colors.muted,
                      borderColor: t.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      st.badgeText,
                      { color: left > 0 ? t.colors.primaryForeground : t.colors.mutedForeground },
                    ]}
                  >
                    {left > 0 ? left : '✓'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}

const st = StyleSheet.create({
  storesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
  },
  storesTitle: { fontFamily: FONT.sansSemi, fontSize: 15.5, letterSpacing: -0.2 },
  storesHint: { fontFamily: FONT.sans, fontSize: 13, lineHeight: 18 },
  chev: { fontFamily: FONT.sansBold, fontSize: 26, lineHeight: 28 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
  },
  listName: { fontFamily: FONT.sansSemi, fontSize: 16, letterSpacing: -0.25 },
  listMeta: { fontFamily: FONT.sans, fontSize: 13 },
  badge: {
    minWidth: 34,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { fontFamily: FONT.monoBold, fontSize: 13 },
});
