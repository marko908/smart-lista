import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Body, Button, Card, Empty, FONT, H2, Input, Label, Pill, Screen } from '../../components/ui';
import { SectionPicker } from '../../components/SectionPicker';
import { StorePlan } from '../../components/StorePlan';
import { chainName } from '../../data/chains';
import { SECTIONS, SECTION_GROUPS, sectionName, type SectionKey } from '../../data/sections';
import { matchProduct, suggest } from '../../lib/match';
import { parseEntry, splitEntries } from '../../lib/normalize';
import { buildRoute, currentGroup, nextGroup, type RouteGroup } from '../../lib/sort';
import { potwierdz } from '../../lib/potwierdz';
import { newId, useApp } from '../../lib/storage';
import { radius, useTheme } from '../../lib/theme';
import type { ListItem } from '../../lib/types';
import { sectionGroups, type StoreMap } from '../../lib/mapModel';

type SortMode = 'trasa' | 'wpisywanie' | 'podglad';

/**
 * TYMCZASOWE — podgląd trasy narysowanej na planie sklepu.
 *
 * Narzędzie diagnostyczne dla autora: pozwala zobaczyć, którędy silnik
 * poprowadził trasę, zamiast wnioskować to z kolejności pozycji na liście.
 * Nie jest częścią tego, co ma zostać w gotowej aplikacji.
 *
 * Żeby to usunąć: ustaw na false, a potem wyrzuć zakładkę „Podgląd trasy",
 * komponent PodgladTrasy i wariant 'podglad' z SortMode.
 */
const PODGLAD_TRASY = true;

/**
 * UKRYTE — zakładka „Kolejność wpisywania".
 *
 * Trasa jest całym sensem tej aplikacji, a druga zakładka podważała ją przy
 * każdym otwarciu listy. Zostaje w kodzie, bo przy porównywaniu wyników trasy
 * bywa przydatna — wystarczy ustawić na true.
 */
const ZAKLADKA_WPISYWANIE = false;

const NAZWY_TRYBOW: Record<SortMode, string> = {
  trasa: 'Kolejność trasy',
  wpisywanie: 'Kolejność wpisywania',
  podglad: 'Podgląd trasy',
};

export default function ListScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { state, update } = useApp();

  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<SortMode>('trasa');
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const list = state.lists.find((l) => l.id === id) ?? null;
  const store = state.stores.find((s) => s.id === list?.storeId) ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: list?.name ?? 'Lista' });
  }, [navigation, list?.name]);

  const suggestions = useMemo(() => (draft.trim().length >= 2 ? suggest(draft, 6) : []), [draft]);
  const pole = useRef<TextInput>(null);
  /** Najświeższa wersja dodawania — nasłuch rejestruje się raz i sięga tutaj. */
  const dodaj = useRef<(text: string) => void>(() => {});

  /**
   * Enter dodaje pozycję. Nasłuch wisi wprost na węźle, bo React Native Web
   * obsługuje klawiaturę pola tekstowego po swojemu i `onSubmitEditing`
   * przekazane z zewnątrz tu nie dochodzi.
   *
   * Najświeższą treść czytamy z samego pola, a nie ze stanu — dzięki temu
   * nasłuch rejestruje się raz i nie gubi się przy przerysowaniu listy.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = pole.current as unknown as HTMLInputElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const enter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      dodaj.current(node.value);
    };
    node.addEventListener('keydown', enter);
    return () => node.removeEventListener('keydown', enter);
  }, []);
  const route = useMemo(() => (list ? buildRoute(list, store) : null), [list, store]);

  if (!list || !route) {
    return (
      <Screen>
        <Body>Nie ma takiej listy.</Body>
        <Button title="Wróć" onPress={() => router.back()} />
      </Screen>
    );
  }

  function mutate(fn: (items: ListItem[]) => ListItem[]) {
    update((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => (l.id === list!.id ? { ...l, items: fn(l.items) } : l)),
    }));
  }

  /**
   * Dodanie jednej albo wielu pozycji naraz.
   *
   * Podpowiedź w polu obiecuje „2 mleka, chleb, pomidory", więc przecinek musi
   * rozdzielać. Wszystko idzie jednym zapisem stanu — inaczej przy wklejeniu
   * listy z piętnastu rzeczy mielibyśmy piętnaście przerysowań pod rząd.
   */
  function addItem(text: string) {
    const czesci = splitEntries(text);
    if (!czesci.length) return;

    const teraz = new Date().toISOString();
    const nowe: ListItem[] = czesci.map((czesc) => {
      const { name, qty } = parseEntry(czesc);
      const match = matchProduct(name);
      return {
        id: newId('item'),
        text: name,
        qty,
        section: match.section,
        sectionLocked: false,
        matchedProductId: match.product?.id ?? null,
        checked: false,
        createdAt: teraz,
      };
    });

    mutate((items) => [...items, ...nowe]);
    setDraft('');
    kursorDoPola();
  }

  dodaj.current = addItem;

  /**
   * Kursor wraca do pola po każdym dodaniu — bez przewijania.
   *
   * Listę pisze się seriami, a sięganie po mysz między kolejnymi produktami
   * jest tu jeszcze bardziej męczące niż w wyszukiwarce sekcji. `preventScroll`
   * jest konieczne, bo lista pod polem rośnie z każdą pozycją i zwykłe
   * `focus()` przewijałoby widok.
   */
  function kursorDoPola() {
    // Po dodaniu React przerysowuje listę. Ustawienie kursora w tej samej chwili
    // gubi się w tym przerysowaniu, więc czekamy, aż przerysowanie się skończy.
    const ustaw = () => {
      const node = pole.current as unknown as HTMLElement | null;
      if (Platform.OS === 'web' && node && typeof node.focus === 'function') {
        node.focus({ preventScroll: true });
        return;
      }
      pole.current?.focus();
    };
    if (Platform.OS === 'web' && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(ustaw));
    } else {
      setTimeout(ustaw, 0);
    }
  }

  function toggleChecked(itemId: string) {
    mutate((items) => items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
  }

  function removeItem(itemId: string) {
    mutate((items) => items.filter((i) => i.id !== itemId));
  }

  function setSection(itemId: string, section: SectionKey) {
    mutate((items) =>
      items.map((i) => (i.id === itemId ? { ...i, section, sectionLocked: true } : i))
    );
    setPickerFor(null);
  }

  function setStore(storeId: string | null) {
    update((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => (l.id === list!.id ? { ...l, storeId } : l)),
    }));
  }

  async function confirmDeleteList() {
    const zgoda = await potwierdz('Usunąć listę?', `„${list!.name}" zniknie razem z pozycjami.`);
    if (!zgoda) return;
    update((prev) => ({ ...prev, lists: prev.lists.filter((l) => l.id !== list!.id) }));
    router.back();
  }

  const left = list.items.filter((i) => !i.checked).length;
  const here = currentGroup(route);
  const next = nextGroup(route);

  const sourceLabel =
    route.source === 'plan'
      ? `Trasa z planu · ${route.cost} kratek`
      : route.source === 'marszruta'
        ? 'Twoja marszruta'
        : route.source === 'siec'
          ? `Typowy układ — ${store ? chainName(store.chain) : 'sieć'}`
          : 'Brak sklepu — kolejność wpisywania';

  return (
    <Screen>
      {/* wybór sklepu */}
      <View style={{ gap: 7 }}>
        <Label>Sklep</Label>
        <View style={st.wrap}>
          {state.stores.map((s) => (
            <Pill
              key={s.id}
              label={s.name}
              active={s.id === list.storeId}
              onPress={() => setStore(s.id)}
            />
          ))}
          <Pill label="Bez sklepu" active={!list.storeId} onPress={() => setStore(null)} />
        </View>
        {state.stores.length === 0 && (
          <Pressable onPress={() => router.push('/sklepy')}>
            <Text style={[st.link, { color: t.colors.primary }]}>
              Dodaj sklep i ustaw marszrutę →
            </Text>
          </Pressable>
        )}
      </View>

      {/* dopisywanie */}
      <Card>
        <Input
          ref={pole}
          value={draft}
          onChangeText={setDraft}
          placeholder="np. 2 mleka, chleb, pomidory"
          returnKeyType="done"
          // Na webie Enter obsługuje nasłuch na węźle (patrz wyżej) — gdyby
          // zostało też to, pozycja dodawałaby się dwa razy.
          onSubmitEditing={Platform.OS === 'web' ? undefined : () => addItem(draft)}
          autoCorrect={false}
        />
        {suggestions.length > 0 && (
          <View style={st.wrap}>
            {suggestions.map((p) => (
              <Pill key={p.id} label={p.name} onPress={() => addItem(p.name)} />
            ))}
          </View>
        )}
        <Button title="Dodaj" onPress={() => addItem(draft)} disabled={!draft.trim()} />
      </Card>

      {list.items.length === 0 ? (
        <Empty
          title="Lista jest pusta"
          hint="Wpisuj produkty w dowolnej kolejności — o ułożenie ich pod sklep zadba Alejka."
        />
      ) : (
        <>
          {/* pasek trasy */}
          <View
            style={[
              st.routeBar,
              { backgroundColor: t.colors.muted, borderColor: t.colors.border },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[st.routeSrc, { color: t.colors.mutedForeground }]}>{sourceLabel}</Text>
              {here ? (
                <Text style={[st.routeHere, { color: t.colors.foreground }]}>
                  Teraz: {here.name}
                  {next ? ` → ${next.name}` : ''}
                </Text>
              ) : (
                <Text style={[st.routeHere, { color: t.colors.foreground }]}>
                  Wszystko odhaczone
                </Text>
              )}
            </View>
            <Text style={[st.routeLeft, { color: t.colors.primary }]}>{left}</Text>
          </View>

          {/* przełącznik sortowania — to jest cały dowód */}
          <View style={[st.seg, { borderColor: t.colors.border, backgroundColor: t.colors.muted }]}>
            {([
              'trasa',
              ...(ZAKLADKA_WPISYWANIE ? ['wpisywanie'] : []),
              ...(PODGLAD_TRASY && store?.map ? ['podglad'] : []),
            ] as SortMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[
                  st.segBtn,
                  mode === m && { backgroundColor: t.colors.card, borderColor: t.colors.border },
                ]}
              >
                <Text
                  style={[
                    st.segText,
                    { color: mode === m ? t.colors.foreground : t.colors.mutedForeground },
                  ]}
                >
                  {NAZWY_TRYBOW[m]}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'podglad' && store?.map ? (
            <PodgladTrasy map={store.map} path={route.path} order={route.groups} />
          ) : mode === 'trasa' ? (
            <View style={{ gap: 6 }}>
              {/*
                Jeden ciąg, produkt po produkcie w kolejności trasy. Podział na
                ponumerowane sekcje wyglądał jak instrukcja montażu — w sklepie
                idzie się od rzeczy do rzeczy, a nie od rozdziału do rozdziału.
                Nazwa sekcji zostaje przy pozycji jako podpis, żeby było wiadomo,
                czego szukać wzrokiem.
              */}
              {route.groups.flatMap((g) =>
                g.items.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    showSection
                    onToggle={() => toggleChecked(item.id)}
                    onRemove={() => removeItem(item.id)}
                    onSection={() => setPickerFor(pickerFor === item.id ? null : item.id)}
                    picking={pickerFor === item.id}
                    onPick={(s) => setSection(item.id, s)}
                  />
                ))
              )}
              {route.unknownCount > 0 && route.source !== 'brak' && (
                <Text style={[st.footnote, { color: t.colors.mutedForeground }]}>
                  {route.unknownCount}{' '}
                  {route.unknownCount === 1 ? 'pozycja trafiła' : 'pozycji trafiło'} na koniec —
                  marszruta tego sklepu nie zna tych sekcji.
                </Text>
              )}
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {list.items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  showSection
                  onToggle={() => toggleChecked(item.id)}
                  onRemove={() => removeItem(item.id)}
                  onSection={() => setPickerFor(pickerFor === item.id ? null : item.id)}
                  picking={pickerFor === item.id}
                  onPick={(s) => setSection(item.id, s)}
                />
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ marginTop: 10 }}>
        <Button title="Usuń listę" variant="ghost" onPress={confirmDeleteList} />
      </View>
    </Screen>
  );
}

function Row({
  item,
  showSection,
  onToggle,
  onRemove,
  onSection,
  picking,
  onPick,
}: {
  item: ListItem;
  showSection: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onSection: () => void;
  picking: boolean;
  onPick: (s: SectionKey) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View
        style={[
          st.row,
          {
            backgroundColor: t.colors.card,
            borderColor: t.colors.border,
            opacity: item.checked ? 0.55 : 1,
          },
        ]}
      >
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          hitSlop={6}
          style={[
            st.check,
            {
              borderColor: item.checked ? t.colors.primary : t.colors.border,
              backgroundColor: item.checked ? t.colors.primary : 'transparent',
            },
          ]}
        >
          {item.checked && (
            <Text style={[st.checkMark, { color: t.colors.primaryForeground }]}>✓</Text>
          )}
        </Pressable>

        <Pressable onPress={onToggle} style={{ flex: 1 }}>
          <Text
            style={[
              st.itemText,
              {
                color: t.colors.foreground,
                textDecorationLine: item.checked ? 'line-through' : 'none',
              },
            ]}
          >
            {item.text}
            {item.qty ? <Text style={{ color: t.colors.mutedForeground }}> · {item.qty}</Text> : null}
          </Text>
        </Pressable>

        <Pressable onPress={onSection} hitSlop={4}>
          <Text
            style={[
              st.secTag,
              {
                color: item.section === 'inne' ? t.colors.destructive : t.colors.mutedForeground,
                borderColor: t.colors.border,
              },
            ]}
          >
            {showSection || item.section === 'inne' ? sectionName(item.section) : '⋯'}
          </Text>
        </Pressable>

        <Pressable onPress={onRemove} hitSlop={6}>
          <Text style={[st.remove, { color: t.colors.mutedForeground }]}>✕</Text>
        </Pressable>
      </View>

      {picking && (
        <SectionPicker
          title="Przenieś do sekcji"
          selected={item.section}
          onPick={onPick}
        />
      )}
    </View>
  );
}

/**
 * TYMCZASOWE — plan sklepu z narysowaną trasą.
 *
 * Pokazuje to, czego lista pokazać nie umie: którędy silnik poprowadził drogę
 * i w jakiej kolejności zbiera sekcje. Do oceny, czy trasa ma sens, zanim
 * pójdzie się z nią do sklepu.
 */
function PodgladTrasy({
  map,
  path,
  order,
}: {
  map: StoreMap;
  path: number[] | null;
  order: RouteGroup[];
}) {
  const t = useTheme();
  const [szerokosc, setSzerokosc] = useState(0);
  // Plan rysujemy w pełnej szerokości ekranu; wysokość wychodzi z proporcji siatki.
  const kratka = szerokosc > 0 ? szerokosc / map.gridW : 0;

  /**
   * Kropka na każdy przystanek trasy, w kolejności zbierania.
   *
   * Stawiamy ją na kratce DOSTĘPU, czyli tam, gdzie człowiek staje po produkt,
   * a nie na samym regale — inaczej numer lądowałby wewnątrz bryły i nie
   * byłoby widać, z której strony się podchodzi.
   */
  const punkty = useMemo(() => {
    const dostep = sectionGroups(map);
    return order
      .map((g, i) => {
        const kratki = dostep.get(g.section);
        if (!kratki?.length) return null;
        // Środkowa z kratek dostępu — najbliżej środka odcinka regału.
        return { cell: kratki[Math.floor(kratki.length / 2)], nr: i + 1 };
      })
      .filter((p): p is { cell: number; nr: number } => p !== null);
  }, [map, order]);

  return (
    <View style={{ gap: 10 }}>
      <View
        onLayout={(e) => setSzerokosc(e.nativeEvent.layout.width)}
        style={[st.podglad, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}
      >
        {kratka > 0 && (
          <StorePlan map={map} cell={kratka} path={path} uproszczony punkty={punkty} />
        )}
      </View>

      <View style={{ gap: 4 }}>
        {order.map((g, i) => (
          <Text key={g.section} style={[st.podgladKrok, { color: t.colors.mutedForeground }]}>
            {i + 1}. {g.name}
          </Text>
        ))}
      </View>

      <Text style={[st.footnote, { color: t.colors.mutedForeground }]}>
        Podgląd roboczy — nie jest częścią gotowej aplikacji.
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  link: { fontFamily: FONT.sansMedium, fontSize: 14 },
  routeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  routeSrc: { fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  routeHere: { fontFamily: FONT.sansSemi, fontSize: 15, letterSpacing: -0.25 },
  routeLeft: { fontFamily: FONT.monoBold, fontSize: 20 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.lg, padding: 3, gap: 3 },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segText: { fontFamily: FONT.sansMedium, fontSize: 13, letterSpacing: -0.15 },
  podglad: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  podgladKrok: { fontFamily: FONT.mono, fontSize: 12, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontFamily: FONT.sansBold, fontSize: 13 },
  itemText: { fontFamily: FONT.sans, fontSize: 15.5, letterSpacing: -0.2 },
  secTag: {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 0.3,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  remove: { fontFamily: FONT.sansSemi, fontSize: 14, paddingHorizontal: 2 },
  picker: { borderWidth: 1, borderRadius: radius.lg, padding: 12, gap: 8 },
  footnote: { fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 18 },
});
