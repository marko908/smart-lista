import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, FONT, H2, Label, Pill, Screen } from '../../components/ui';
import { chainName, chainOrder } from '../../data/chains';
import { SECTIONS, SECTION_GROUPS, sectionName, type SectionKey } from '../../data/sections';
import { useApp } from '../../lib/storage';
import { radius, useTheme } from '../../lib/theme';

export default function WalkOrderEditor() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { state, update } = useApp();

  const store = state.stores.find((s) => s.id === id) ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: store?.name ?? 'Marszruta' });
  }, [navigation, store?.name]);

  const inOrder = useMemo(() => new Set(store?.walkOrder ?? []), [store?.walkOrder]);

  if (!store) {
    return (
      <Screen>
        <Body>Nie ma takiego sklepu.</Body>
        <Button title="Wróć" onPress={() => router.back()} />
      </Screen>
    );
  }

  function setOrder(next: SectionKey[]) {
    update((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === store!.id
          ? { ...s, walkOrder: next, mappedAt: next.length ? new Date().toISOString() : null }
          : s
      ),
    }));
  }

  function toggle(key: SectionKey) {
    const current = store!.walkOrder;
    setOrder(current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
  }

  function move(index: number, delta: number) {
    const next = [...store!.walkOrder];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  function prefill() {
    setOrder(chainOrder(store!.chain));
  }

  function confirmClear() {
    Alert.alert('Wyczyścić marszrutę?', 'Sklep wróci do typowego układu sieci.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyczyść', style: 'destructive', onPress: () => setOrder([]) },
    ]);
  }

  function confirmDelete() {
    Alert.alert('Usunąć sklep?', `„${store!.name}" zniknie razem z marszrutą.`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          update((prev) => ({
            ...prev,
            stores: prev.stores.filter((s) => s.id !== store!.id),
            lists: prev.lists.map((l) => (l.storeId === store!.id ? { ...l, storeId: null } : l)),
          }));
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Card>
        <Label>{chainName(store.chain)}</Label>
        <Body muted>
          Stukaj sekcje w kolejności, w jakiej je mijasz — od wejścia do kas. Pomijaj te, których
          w tym sklepie nie ma.
        </Body>
        {store.walkOrder.length === 0 && (
          <Button title="Zacznij od typowego układu sieci" variant="secondary" onPress={prefill} />
        )}
      </Card>

      <View style={{ gap: 8 }}>
        <View style={st.headRow}>
          <H2>Marszruta</H2>
          <Text style={[st.count, { color: t.colors.mutedForeground }]}>
            {store.walkOrder.length} sekcji
          </Text>
        </View>

        {store.walkOrder.length === 0 ? (
          <View style={[st.emptyOrder, { borderColor: t.colors.border }]}>
            <Text style={[st.emptyText, { color: t.colors.mutedForeground }]}>
              Pusto. Wybierz pierwszą sekcję za wejściem.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {store.walkOrder.map((key, i) => (
              <View
                key={key}
                style={[
                  st.orderRow,
                  { backgroundColor: t.colors.card, borderColor: t.colors.border },
                ]}
              >
                <View style={[st.step, { backgroundColor: t.colors.primary }]}>
                  <Text style={[st.stepText, { color: t.colors.primaryForeground }]}>{i + 1}</Text>
                </View>
                <Text style={[st.orderName, { color: t.colors.foreground }]} numberOfLines={1}>
                  {sectionName(key)}
                </Text>
                <IconBtn label="↑" onPress={() => move(i, -1)} disabled={i === 0} />
                <IconBtn
                  label="↓"
                  onPress={() => move(i, 1)}
                  disabled={i === store.walkOrder.length - 1}
                />
                <IconBtn label="✕" onPress={() => toggle(key)} danger />
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <H2>Sekcje do wyboru</H2>
        {SECTION_GROUPS.map((group) => {
          const items = SECTIONS.filter((s) => s.group === group);
          return (
            <View key={group} style={{ gap: 7 }}>
              <Label>{group}</Label>
              <View style={st.palette}>
                {items.map((sec) => (
                  <Pill
                    key={sec.key}
                    label={sec.name}
                    active={inOrder.has(sec.key)}
                    index={
                      inOrder.has(sec.key) ? store.walkOrder.indexOf(sec.key) + 1 : undefined
                    }
                    onPress={() => toggle(sec.key)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ gap: 8, marginTop: 6 }}>
        {store.walkOrder.length > 0 && (
          <Button title="Wyczyść marszrutę" variant="ghost" onPress={confirmClear} />
        )}
        <Button title="Usuń sklep" variant="ghost" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

function IconBtn({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        st.icon,
        {
          borderColor: t.colors.border,
          backgroundColor: t.colors.background,
          opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text
        style={[
          st.iconText,
          { color: danger ? t.colors.destructive : t.colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { fontFamily: FONT.mono, fontSize: 12 },
  emptyOrder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
  },
  emptyText: { fontFamily: FONT.sans, fontSize: 13.5, textAlign: 'center' },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  step: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: FONT.monoBold, fontSize: 11 },
  orderName: { flex: 1, fontFamily: FONT.sansMedium, fontSize: 14.5, letterSpacing: -0.2 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontFamily: FONT.sansSemi, fontSize: 14 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
