import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Body, Button, Card, FONT, H2, Input, Label, Pill } from '../../../components/ui';
import { PlanCanvas, type Side } from '../../../components/PlanCanvas';
import { SectionPicker } from '../../../components/SectionPicker';
import { BLOCK_BY_KEY, PLACEABLE, typeForSections, type BlockType } from '../../../data/blocks';
import { createBareMap, createStarterMap, starterSectionCount } from '../../../data/layouts';
import { sectionName, type SectionKey } from '../../../data/sections';
import {
  allSections,
  areaM2,
  blockAt,
  cellsOf,
  clampSize,
  createDefaultMap,
  findSpot,
  fits,
  blocksInRect,
  removable,
  overlaps,
  rotateBlock,
  sectionGroups,
  validate,
  type MapBlock,
  type StoreMap,
} from '../../../lib/mapModel';
import { saveTextFile } from '../../../lib/fileIO';
import { fileNameFor, serializeStore } from '../../../lib/mapFile';
import { computeRoute, costForOrder } from '../../../lib/route';
import { newId, useApp } from '../../../lib/storage';
import { radius, useTheme } from '../../../lib/theme';

type Tool = { kind: 'select' } | { kind: 'erase' } | { kind: 'block'; type: BlockType };

/** Granice sali. Poniżej sześciu kratek nie ma czego mapować, powyżej stu — to hipermarket. */
const GRID_MIN = 6;
const GRID_MAX = 120;

export default function PlanBuilder() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { state, update } = useApp();

  const [tool, setTool] = useState<Tool>({ kind: 'select' });
  /**
   * Zaznaczenie jest ZBIOREM, nie pojedynczym klockiem.
   *
   * Shift dokłada klocek, Ctrl+A bierze wszystkie, a chwyt za którykolwiek
   * z zaznaczonych ciągnie całą grupę. Uchwyty (rozmiar, obrót) pokazujemy
   * tylko przy jednym zaznaczonym — przy grupie nie wiadomo, co miałyby robić.
   */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectOne = useCallback((blockId: string | null) => {
    setSelectedIds(blockId ? [blockId] : []);
  }, []);
  const [picker, setPicker] = useState<'A' | 'B' | null>(null);
  const [showRoute, setShowRoute] = useState(true);

  /**
   * Na szerokim ekranie panel idzie z prawej, jak w każdym narzędziu 2D:
   * płótno dostaje całą wysokość, a właściwości są obok, nie pod spodem.
   * Na telefonie zostaje układ pionowy, bo 340 px paska zjadłoby pół ekranu.
   */
  const { width: screenW } = useWindowDimensions();
  const sidePanel = screenW >= 900;
  const [note, setNote] = useState<string | null>(null);
  /** Pozycje sprzed przeciągania — do cofnięcia, gdy nie ma gdzie postawić. */
  const dragOrigin = useRef<{ id: string; x: number; y: number }[]>([]);

  /**
   * Historia zmian planu. Ctrl+Z zdejmuje ze stosu „przed", Ctrl+Y ze stosu „po".
   *
   * Zmiany tego samego rodzaju następujące szybko po sobie sklejamy w jeden krok —
   * inaczej cofanie przeciągnięcia przez pół sklepu wymagałoby trzydziestu Ctrl+Z.
   */
  const history = useRef<{ past: StoreMap[]; future: StoreMap[] }>({ past: [], future: [] });
  const lastPush = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const clipboard = useRef<MapBlock[] | null>(null);

  const store = state.stores.find((s) => s.id === id) ?? null;
  const map = store?.map ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: store ? store.name : 'Plan' });
  }, [navigation, store?.name]);

  // Świeży sklep dostaje plan z wejściem i kasami od razu — bez nich
  // trasa nie ma startu ani mety, a stawianie ich ręcznie za każdym razem
  // to tylko podatek od nowego sklepu.
  useEffect(() => {
    if (store && !store.map) {
      update((prev) => ({
        ...prev,
        stores: prev.stores.map((s) => (s.id === store.id ? { ...s, map: createStarterMap() } : s)),
      }));
    }
  }, [store?.id, store?.map]);

  useEffect(() => {
    if (!note) return;
    const h = setTimeout(() => setNote(null), 2200);
    return () => clearTimeout(h);
  }, [note]);

  const selected =
    selectedIds.length === 1 ? map?.blocks.find((b) => b.id === selectedIds[0]) ?? null : null;
  const validation = useMemo(() => (map ? validate(map) : null), [map]);

  /**
   * Kategorie obecne gdziekolwiek na planie — do podpowiedzi w wyszukiwarce.
   * Liczone z CAŁEGO planu, nie z zaznaczonego klocka: pytanie brzmi „czy o tej
   * kategorii już pomyślałem w tym sklepie", a nie „czy jest na tym regale".
   */
  const uzyteKategorie = useMemo(() => {
    const zbior = new Set<SectionKey>();
    if (map) for (const b of map.blocks) for (const k of allSections(b)) zbior.add(k);
    return zbior;
  }, [map]);

  /** Ile kratek zajmuje to, co już stoi — poniżej tego sali nie da się zmniejszyć. */
  const minGrid = useMemo(() => {
    if (!map) return { w: GRID_MIN, h: GRID_MIN };
    let w = GRID_MIN;
    let h = GRID_MIN;
    for (const b of map.blocks) {
      for (const c of cellsOf(map, b)) {
        w = Math.max(w, (c % map.gridW) + 1);
        h = Math.max(h, Math.floor(c / map.gridW) + 1);
      }
    }
    return { w, h };
  }, [map]);

  const preview = useMemo(() => {
    if (!map || !showRoute) return null;
    const present = [...sectionGroups(map).keys()];
    if (!present.length) return null;
    const r = computeRoute(map, present);
    if (!r) return null;
    return { ...r, naive: costForOrder(map, present) };
  }, [map, showRoute]);

  /**
   * Każda zmiana planu liczy się z POPRZEDNIEGO stanu, nie z migawki z renderu.
   * Inaczej dwie zmiany w jednej klatce (np. dwa szybkie stuknięcia w uchwyt)
   * czytały ten sam stan i druga kasowała pierwszą.
   */
  const editMap = useCallback(
    (fn: (m: StoreMap) => StoreMap, coalesceKey?: string) => {
      update((prev) => ({
        ...prev,
        stores: prev.stores.map((s) => {
          if (s.id !== id || !s.map) return s;
          const next = fn(s.map);
          if (next === s.map) return s;

          // Sklejanie: kolejne kroki tego samego przeciągnięcia to jedno cofnięcie.
          const now = Date.now();
          const sklej =
            !!coalesceKey &&
            lastPush.current.key === coalesceKey &&
            now - lastPush.current.at < 700;
          lastPush.current = { key: coalesceKey ?? '', at: now };

          if (!sklej) {
            history.current.past.push(s.map);
            if (history.current.past.length > 120) history.current.past.shift();
            history.current.future = [];
          }
          return { ...s, map: next };
        }),
      }));
    },
    [id, update]
  );

  /** Podmiana planu bez zapisywania do historii — używana przez samo cofanie. */
  const replaceMap = useCallback(
    (next: StoreMap) => {
      update((prev) => ({
        ...prev,
        stores: prev.stores.map((s) => (s.id === id ? { ...s, map: next } : s)),
      }));
    },
    [id, update]
  );

  const undo = useCallback(() => {
    const h = history.current;
    if (!map || !h.past.length) {
      setNote('Nie ma czego cofać.');
      return;
    }
    const prevMap = h.past[h.past.length - 1];
    h.past = h.past.slice(0, -1);
    h.future = [...h.future, map];
    lastPush.current = { key: '', at: 0 };
    replaceMap(prevMap);
    setSelectedIds([]);
    setPicker(null);
  }, [map, replaceMap]);

  const redo = useCallback(() => {
    const h = history.current;
    if (!map || !h.future.length) {
      setNote('Nie ma czego ponowić.');
      return;
    }
    const nextMap = h.future[h.future.length - 1];
    h.future = h.future.slice(0, -1);
    h.past = [...h.past, map];
    lastPush.current = { key: '', at: 0 };
    replaceMap(nextMap);
    setSelectedIds([]);
    setPicker(null);
  }, [map, replaceMap]);

  const copyBlock = useCallback(() => {
    const grupa = map?.blocks.filter((b) => selectedIds.includes(b.id)) ?? [];
    if (!grupa.length) {
      setNote('Najpierw zaznacz klocek.');
      return;
    }
    clipboard.current = grupa.map((b) => ({ ...b }));
    setNote(grupa.length === 1 ? 'Skopiowano klocek.' : `Skopiowano ${grupa.length} klocków.`);
  }, [map, selectedIds]);

  /**
   * Wklejanie szuka miejsca klocek po klocku, na planie rosnącym po każdym z nich —
   * inaczej cała skopiowana grupa celowałaby w to samo wolne pole i klocki
   * lądowałyby jeden na drugim.
   */
  const pasteBlock = useCallback(() => {
    const src = clipboard.current;
    if (!src?.length || !map) {
      setNote('Schowek jest pusty.');
      return;
    }
    let robocza = map;
    const nowe: string[] = [];
    for (const b of src) {
      const spot = findSpot(robocza, { ...b, id: newId('blk') }, 5);
      if (!spot) continue;
      robocza = { ...robocza, blocks: [...robocza.blocks, spot] };
      nowe.push(spot.id);
    }
    if (!nowe.length) {
      setNote('Nie ma miejsca na wklejenie.');
      return;
    }
    if (nowe.length < src.length) setNote(`Zmieściło się ${nowe.length} z ${src.length} klocków.`);
    editMap(() => robocza);
    setSelectedIds(nowe);
    setPicker(null);
  }, [map, editMap]);

  const setMap = useCallback((next: StoreMap) => editMap(() => next), [editMap]);

  /** Ręczna zmiana rozmiaru sali. Granice pilnuje GridSize, tu tylko zapis. */
  const resizeGrid = useCallback(
    (gridW: number, gridH: number) => {
      editMap((m) => (m.gridW === gridW && m.gridH === gridH ? m : { ...m, gridW, gridH }));
    },
    [editMap]
  );


  const onCellPress = useCallback(
    (x: number, y: number, additive = false) => {
      if (!map) return;
      const hit = blockAt(map, x, y);

      if (tool.kind === 'select') {
        if (additive) {
          // Shift w klocek: dokłada go do zaznaczenia albo wyjmuje, jeśli już był.
          // Shift w puste pole nie kasuje zaznaczenia — to byłaby przykra niespodzianka
          // po zaznaczeniu kilkunastu regałów.
          if (hit) setSelectedIds((prev) =>
            prev.includes(hit.id) ? prev.filter((v) => v !== hit.id) : [...prev, hit.id]
          );
          return;
        }
        selectOne(hit ? hit.id : null);
        setPicker(null);
        return;
      }

      if (tool.kind === 'erase') {
        if (!hit) return;
        if (!removable(map, [hit.id]).length) {
          setNote(
            hit.type === 'wejscie'
              ? 'To jedyne wejście — trasa musi skądś startować. Postaw drugie, wtedy da się je usunąć.'
              : 'To jedyne kasy — trasa musi gdzieś kończyć. Postaw drugie, wtedy da się je usunąć.'
          );
          return;
        }
        setMap({ ...map, blocks: map.blocks.filter((b) => b.id !== hit.id) });
        setSelectedIds((prev) => prev.filter((v) => v !== hit.id));
        return;
      }

      const def = BLOCK_BY_KEY[tool.type];
      const block: MapBlock = {
        id: newId('blk'), type: tool.type, rot: 0,
        x, y, w: def.size[0], h: def.size[1],
        sections: [], sectionsB: [],
      };
      if (!fits(map, block) || overlaps(map, block)) return;
      setMap({ ...map, blocks: [...map.blocks, block] });
      selectOne(block.id);
      setTool({ kind: 'select' });
    },
    [map, tool, setMap, selectOne]
  );

  const patch = useCallback(
    (p: Partial<MapBlock> | ((cur: MapBlock) => Partial<MapBlock>), coalesceKey?: string) => {
      editMap((m) => {
        const cur = m.blocks.find((b) => b.id === selectedIds[0]);
        if (!cur || selectedIds.length !== 1) return m;
        const next = { ...cur, ...(typeof p === 'function' ? p(cur) : p) };
        // Typ jest konsekwencją kategorii, nie osobnym wyborem: przypisanie
        // nabiału robi z klocka lodówkę, druga kategoria robi regał dwustronny.
        next.type = typeForSections(next.sections, next.sectionsB, cur.type);
        const [w, h] = clampSize(next.type, next.w, next.h);
        next.w = w;
        next.h = h;
        if (!fits(m, next) || overlaps(m, next, cur.id)) return m;
        return { ...m, blocks: m.blocks.map((b) => (b.id === cur.id ? next : b)) };
      }, coalesceKey);
    },
    [editMap, selectedIds]
  );

  /**
   * Przesuwanie idzie za palcem i NIE sprawdza kolizji.
   *
   * Wcześniej klocek zacinał się o każdy inny po drodze i przeciągnięcie go
   * przez pół sklepu było walką. Teraz przechodzi przez przeszkody, a porządek
   * robimy dopiero po puszczeniu — w onDragEnd.
   */
  const onMoveBy = useCallback(
    (dx: number, dy: number) => {
      editMap((m) => {
        const grupa = m.blocks.filter((x) => selectedIds.includes(x.id));
        if (!grupa.length) return m;
        // Grupa rusza się w całości albo wcale — inaczej klocek opierający się
        // o ścianę zostawałby w tyle i układ się rozjeżdżał.
        const przesuniete = grupa.map((x) => ({ ...x, x: x.x + dx, y: x.y + dy }));
        if (przesuniete.some((x) => !fits(m, x))) return m;
        const wg = new Map(przesuniete.map((x) => [x.id, x]));
        return { ...m, blocks: m.blocks.map((x) => wg.get(x.id) ?? x) };
      }, 'przesuwanie');
    },
    [editMap, selectedIds]
  );

  /**
   * Po puszczeniu porządkujemy nakładki.
   *
   * Pojedynczy klocek odsuwamy na najbliższe wolne pole — tak, żeby dało się go
   * przeciągnąć przez pół sklepu, nie zacinając się o każdą przeszkodę po drodze.
   * Przy grupie takiego odsuwania nie ma: rozjechałoby układ, który człowiek
   * właśnie chciał zachować. Grupa albo mieści się w całości, albo wraca skąd
   * przyszła.
   */
  const onDragEnd = useCallback(() => {
    editMap((m) => {
      const grupa = m.blocks.filter((x) => selectedIds.includes(x.id));
      if (!grupa.length) return m;

      // Nakładki wewnątrz grupy nas nie obchodzą — grupa jechała w całości,
      // więc jej wzajemne odległości się nie zmieniły. Liczy się tylko to,
      // czy nie wjechała na coś spoza zaznaczenia.
      const wGrupie = new Set(grupa.map((x) => x.id));
      const reszta = { ...m, blocks: m.blocks.filter((x) => !wGrupie.has(x.id)) };
      if (!grupa.some((x) => overlaps(reszta, x))) return m;

      if (grupa.length === 1) {
        const spot = findSpot(m, grupa[0], 4);
        if (spot) return { ...m, blocks: m.blocks.map((x) => (x.id === spot.id ? spot : x)) };
      }

      const skad = new Map(dragOrigin.current.map((o) => [o.id, o]));
      if (grupa.every((x) => skad.has(x.id))) {
        setNote(
          grupa.length === 1
            ? 'Nie ma tam miejsca — klocek wrócił na swoje.'
            : 'Nie ma tam miejsca — zaznaczenie wróciło na swoje.'
        );
        return {
          ...m,
          blocks: m.blocks.map((x) => {
            const o = skad.get(x.id);
            return o && wGrupie.has(x.id) ? { ...x, x: o.x, y: o.y } : x;
          }),
        };
      }
      return m;
    });
  }, [editMap, selectedIds]);

  /**
   * Rozciąganie przez łapanie za bok. Dodatnie kroki wydłużają klocek
   * w stronę tej ściany: przy N i W trzeba przy okazji przesunąć początek,
   * bo klocek rośnie „do góry" albo „w lewo".
   */
  const onResizeEdge = useCallback(
    (side: Side, steps: number) => {
      if (!steps) return;
      const cur = selected;
      if (!cur || !map) return;

      const want =
        side === 'S' ? { w: cur.w, h: cur.h + steps, x: cur.x, y: cur.y }
        : side === 'E' ? { w: cur.w + steps, h: cur.h, x: cur.x, y: cur.y }
        : side === 'N' ? { w: cur.w, h: cur.h + steps, x: cur.x, y: cur.y - steps }
        : { w: cur.w + steps, h: cur.h, x: cur.x - steps, y: cur.y };

      const [w, h] = clampSize(cur.type, want.w, want.h);
      if (w === cur.w && h === cur.h) {
        if (steps < 0) setNote('Mniejszy już nie będzie.');
        return;
      }
      // Docięcie do minimum mogło zjeść krok — początek koryguje się o tyle samo.
      const dx = side === 'W' ? cur.w - w : 0;
      const dy = side === 'N' ? cur.h - h : 0;
      const cand: MapBlock = { ...cur, w, h, x: cur.x + dx, y: cur.y + dy };

      if (!fits(map, cand) || overlaps(map, cand, cur.id)) {
        setNote('Nie ma miejsca — przesuń klocek albo zrób miejsce obok.');
        return;
      }
      patch({ w, h, x: cand.x, y: cand.y }, 'rozciaganie');
    },
    [map, selected, patch]
  );

  /** Zaznaczenie w momencie chwycenia klocka — jak w narzędziach 2D. */
  const selectAt = useCallback(
    (x: number, y: number) => {
      if (!map) return;
      const hit = blockAt(map, x, y);
      if (!hit) return;
      dragOrigin.current = [{ id: hit.id, x: hit.x, y: hit.y }];
      if (!selectedIds.includes(hit.id)) {
        selectOne(hit.id);
        setPicker(null);
      }
    },
    [map, selectedIds, selectOne]
  );

  /**
   * Chwyt za klocek należący do zaznaczenia. Zaznaczenia NIE ruszamy — zapamiętujemy
   * tylko, skąd cała grupa wyszła, żeby dało się ją cofnąć, gdy nie ma gdzie postawić.
   */
  const beginGroupDrag = useCallback(() => {
    if (!map) return;
    dragOrigin.current = map.blocks
      .filter((b) => selectedIds.includes(b.id))
      .map((b) => ({ id: b.id, x: b.x, y: b.y }));
  }, [map, selectedIds]);

  /**
   * Ramka zaznaczenia po pustym polu — jak zaznaczanie plików na pulpicie.
   * Z shiftem dokłada do tego, co już zaznaczone, zamiast zaczynać od zera.
   */
  const onMarquee = useCallback(
    (x0: number, y0: number, x1: number, y1: number, additive: boolean) => {
      if (!map) return;
      const trafione = blocksInRect(map, x0, y0, x1, y1).map((b) => b.id);
      setSelectedIds((prev) => {
        if (!additive) return trafione;
        const razem = new Set(prev);
        for (const t of trafione) razem.add(t);
        return [...razem];
      });
      setPicker(null);
    },
    [map]
  );

  /** Ctrl+A — całe wnętrze sklepu naraz, żeby dało się przesunąć układ w bloku. */
  const selectAll = useCallback(() => {
    if (!map) return;
    setSelectedIds(map.blocks.map((b) => b.id));
    setPicker(null);
    setNote(`Zaznaczono ${map.blocks.length} klocków.`);
  }, [map]);

  /**
   * Alt + przeciągnięcie duplikuje klocek, tak jak w narzędziach do projektowania.
   * Kopia nie może stanąć dokładnie na oryginale, bo klocki nie mogą się nakładać —
   * findSpot odsuwa ją o kratkę na najbliższe wolne pole i to ją przeciągasz dalej.
   */
  const duplicateAt = useCallback(
    (x: number, y: number) => {
      if (!map) return;
      const src = blockAt(map, x, y);
      if (!src) return;
      const kopia: MapBlock = { ...src, id: newId('blk') };
      const spot = findSpot(map, kopia, 3);
      if (!spot) {
        setNote('Nie ma miejsca na kopię — zrób trochę luzu obok.');
        selectOne(src.id);
        return;
      }
      setMap({ ...map, blocks: [...map.blocks, spot] });
      selectOne(spot.id);
      setPicker(null);
    },
    [map, setMap, selectOne]
  );

  const deleteSelected = useCallback(() => {
    if (!map) return;
    const doKasacji = removable(map, selectedIds);
    if (!doKasacji.length) {
      setNote('Jedno wejście i jedne kasy muszą zostać — bez nich trasa nie ma startu ani mety.');
      return;
    }
    const ids = new Set(doKasacji.map((b) => b.id));
    setMap({ ...map, blocks: map.blocks.filter((b) => !ids.has(b.id)) });
    setSelectedIds((prev) => prev.filter((v) => !ids.has(v)));

    const oszczedzone = selectedIds.length - doKasacji.length;
    if (oszczedzone > 0) {
      setNote(`Usunięto ${doKasacji.length} klocków. Wejście i kasy zostały — trasa musi mieć start i metę.`);
    } else if (doKasacji.length > 1) {
      setNote(`Usunięto ${doKasacji.length} klocków.`);
    }
  }, [map, selectedIds, setMap]);

  const onRotate = useCallback(() => {
    const cur = selected;
    if (!cur || !map) return;
    const spot = findSpot(map, rotateBlock(cur));
    if (!spot) {
      setNote('Nie ma miejsca na obrót — przesuń klocek na luźniejsze pole.');
      return;
    }
    patch({ x: spot.x, y: spot.y, rot: spot.rot });
  }, [map, selected, patch]);

  if (!store || !map) {
    return (
      <View style={[stl.center, { backgroundColor: t.colors.background }]}>
        <Body muted>Przygotowuję plan…</Body>
      </View>
    );
  }

  const def = selected ? BLOCK_BY_KEY[selected.type] : null;
  const canDelete = map ? removable(map, selectedIds).length > 0 : false;

  async function exportToFile() {
    if (!store) return;
    const res = await saveTextFile(fileNameFor(store), serializeStore(store));
    setNote(res.message);
  }

  function resetPlan() {
    Alert.alert(
      'Zacząć plan od nowa?',
      'Możesz wrócić do gotowego układu dyskontu albo zacząć od pustej sali z samym wejściem i kasami.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Gotowy układ',
          onPress: () => {
            setMap(createStarterMap());
            setSelectedIds([]);
          },
        },
        {
          text: 'Pusta sala',
          style: 'destructive',
          onPress: () => {
            setMap(createBareMap());
            setSelectedIds([]);
          },
        },
      ]
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.background,
        flexDirection: sidePanel ? 'row' : 'column',
      }}
    >
      <View style={sidePanel ? stl.canvasWide : stl.canvasNarrow}>
        <PlanCanvas
          style={{ flex: 1 }}
          map={map}
          selected={selected}
          path={showRoute ? preview?.path ?? null : null}
          selectedIds={selectedIds}
          tool={tool}
          onTool={setTool}
          onCellPress={onCellPress}
          onSelectAt={selectAt}
          onSelectAll={selectAll}
          onMarquee={onMarquee}
          onBeginGroupDrag={beginGroupDrag}
          onDuplicateAt={duplicateAt}
          onMoveBy={onMoveBy}
          onDragEnd={onDragEnd}
          onResizeEdge={onResizeEdge}
          onRotate={onRotate}
          onDelete={deleteSelected}
          onDeselect={() => { setSelectedIds([]); setPicker(null); }}
          onUndo={undo}
          onRedo={redo}
          onCopy={copyBlock}
          onPaste={pasteBlock}
          canDelete={canDelete}
        />
      </View>

      <ScrollView
        style={
          sidePanel
            ? [stl.panelWide, { borderLeftColor: t.colors.border, backgroundColor: t.colors.card }]
            : stl.panelNarrow
        }
        contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {note && (
          <View style={[stl.note, { backgroundColor: t.colors.muted, borderColor: t.colors.primary }]}>
            <Text style={[stl.noteText, { color: t.colors.foreground }]}>{note}</Text>
          </View>
        )}

        <View style={{ gap: 7 }}>
          <Label>Rozmiar sali</Label>
          <GridSize gridW={map.gridW} gridH={map.gridH} min={minGrid} onApply={resizeGrid} onRefuse={setNote} />
          <Text style={[stl.scale, { color: t.colors.mutedForeground }]}>
            ok. {areaM2(map)} m² · 1 kratka ≈ 1 m
          </Text>
        </View>

        <View style={{ gap: 7 }}>
          <Label>Postaw klocek</Label>
          <View style={stl.wrap}>
            <Pill label="Zaznacz" active={tool.kind === 'select'} onPress={() => setTool({ kind: 'select' })} />
            {PLACEABLE.map((b) => (
              <Pill
                key={b.key}
                label={b.name}
                active={tool.kind === 'block' && tool.type === b.key}
                onPress={() => setTool({ kind: 'block', type: b.key })}
              />
            ))}
            <Pill label="Usuń" active={tool.kind === 'erase'} onPress={() => setTool({ kind: 'erase' })} />
          </View>
        </View>

        {selectedIds.length > 1 && (
          <Card>
            <View style={stl.rowBetween}>
              <H2>Zaznaczone: {selectedIds.length}</H2>
              <Pill label="Odznacz" onPress={() => setSelectedIds([])} />
            </View>
            <Body muted>
              Przeciągnij którykolwiek z nich, a pojadą razem. Delete usuwa całą grupę
              poza wejściem i kasami. Rozmiar i obrót ustawia się pojedynczo — zaznacz
              jeden klocek.
            </Body>
          </Card>
        )}

        {selected && def && (
          <Card>
            <View style={stl.rowBetween}>
              <H2>{def.name}</H2>
              <Text style={[stl.dims, { color: t.colors.mutedForeground }]}>
                {selected.w}×{selected.h} m
              </Text>
            </View>

            {def.sections ? (
              <>
                <CategoryList
                  label="Kategorie na tym klocku"
                  hint="Jeden regał może mieć różne produkty na różnych półkach"
                  items={selected.sections}
                  onRemove={(key) =>
                    patch((cur) => ({ sections: cur.sections.filter((k) => k !== key) }))
                  }
                  onAdd={() => setPicker(picker === 'A' ? null : 'A')}
                  adding={picker === 'A'}
                />
                <CategoryList
                  label="Druga strona regału"
                  hint={
                    selected.sections.length
                      ? 'Dodaj, jeśli z drugiej strony alejki są inne produkty'
                      : 'Najpierw wybierz kategorię na pierwszej stronie'
                  }
                  items={selected.sectionsB}
                  onRemove={(key) =>
                    patch((cur) => ({ sectionsB: cur.sectionsB.filter((k) => k !== key) }))
                  }
                  onAdd={() => selected.sections.length && setPicker(picker === 'B' ? null : 'B')}
                  adding={picker === 'B'}
                  disabled={!selected.sections.length}
                />
              </>
            ) : (
              <Body muted>{def.hint}.</Body>
            )}

            {picker && (
              <SectionPicker
                title={picker === 'A' ? 'Dodaj kategorię' : 'Dodaj kategorię z drugiej strony'}
                onClose={() => setPicker(null)}
                uzyte={uzyteKategorie}
                onPick={(key) => {
                  patch((cur) =>
                    picker === 'A'
                      ? { sections: cur.sections.includes(key) ? cur.sections : [...cur.sections, key] }
                      : { sectionsB: cur.sectionsB.includes(key) ? cur.sectionsB : [...cur.sectionsB, key] }
                  );
                  // Wybór NIE zamyka wyszukiwarki. Regał ma zwykle kilka kategorii,
                  // a otwieranie jej od nowa przy każdej to sięganie po mysz.
                  // Zamyka Escape albo ponowne stuknięcie w „Dodaj kategorię".
                }}
              />
            )}

            {canDelete && <Button title="Usuń klocek" variant="ghost" onPress={deleteSelected} />}
          </Card>
        )}

        <Card>
          <View style={stl.rowBetween}>
            <H2>Trasa</H2>
            <Pill label={showRoute ? 'ukryj' : 'pokaż'} active={showRoute} onPress={() => setShowRoute((v) => !v)} />
          </View>

          {preview ? (
            <>
              <Text style={[stl.stat, { color: t.colors.foreground }]}>
                {preview.cost} m
                {preview.naive != null && preview.naive > preview.cost ? `  ·  zamiast ${preview.naive} po kolei` : ''}
              </Text>
              <Body muted>
                {preview.order.length} sekcji, kolejność {preview.exact ? 'dokładnie optymalna' : 'przybliżona'}.
              </Body>
              <Text style={[stl.order, { color: t.colors.mutedForeground }]} numberOfLines={5}>
                {preview.order.map(sectionName).join(' → ')}
              </Text>
            </>
          ) : (
            <Body muted>Przypisz sekcję choć jednemu regałowi, a trasa policzy się sama.</Body>
          )}

          {validation && !validation.ok ? (
            <View style={[stl.errors, { borderColor: t.colors.destructive }]}>
              {validation.errors.map((e, i) => (
                <Text key={i} style={[stl.errText, { color: t.colors.destructive }]}>
                  {e}
                </Text>
              ))}
            </View>
          ) : validation && validation.warnings.length ? (
            <Text style={[stl.warn, { color: t.colors.mutedForeground }]}>{validation.warnings.join(' ')}</Text>
          ) : (
            <Text style={[stl.warn, { color: t.colors.primary }]}>Plan przechodzi walidację.</Text>
          )}
        </Card>

        <View style={{ gap: 8 }}>
          <Button title="Zapisz sklep do pliku" onPress={exportToFile} />
          <Text style={[stl.hint, { color: t.colors.mutedForeground }]}>
            Jeden sklep to jeden plik {'—'} możesz go przenieść na inne urządzenie
            albo trzymać jako kopię.
          </Text>
          <Button
            title="Wolisz prostą marszrutę?"
            variant="secondary"
            onPress={() => router.push(`/sklepy/${store.id}`)}
          />
          <Button title="Zacznij plan od nowa" variant="ghost" onPress={resetPlan} />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Lista kategorii przypisanych do klocka.
 *
 * Regał potrafi mieć sushi na środkowej półce i masło na dolnej — z punktu
 * widzenia trasy leżą w tym samym miejscu, więc trzymamy je jako zwykłą listę.
 * Druga strona alejki to co innego i ma własną listę.
 */
/**
 * Wymiary sali wpisywane z ręki.
 *
 * Pole trzyma własny tekst, bo w trakcie pisania przechodzi się przez stany
 * bez sensu („4", pusty ciąg przy kasowaniu) — plan przestawiamy dopiero przy
 * zatwierdzeniu albo wyjściu z pola.
 *
 * Zmniejszenie nie może uciąć tego, co już stoi: klocek poza planem przestałby
 * się rysować, a przy zapisie do pliku wyleciałby na walidacji. Zamiast po cichu
 * przycinać, odmawiamy i mówimy, ile minimum wchodzi.
 */
function GridSize({
  gridW,
  gridH,
  min,
  onApply,
  onRefuse,
}: {
  gridW: number;
  gridH: number;
  min: { w: number; h: number };
  onApply: (w: number, h: number) => void;
  onRefuse: (message: string) => void;
}) {
  const t = useTheme();
  const [w, setW] = useState(String(gridW));
  const [h, setH] = useState(String(gridH));

  useEffect(() => setW(String(gridW)), [gridW]);
  useEffect(() => setH(String(gridH)), [gridH]);

  const commit = () => {
    const nw = parseInt(w, 10);
    const nh = parseInt(h, 10);
    const chcianeW = Number.isFinite(nw) ? nw : gridW;
    const chcianeH = Number.isFinite(nh) ? nh : gridH;
    const doceloweW = Math.max(min.w, Math.min(GRID_MAX, chcianeW));
    const doceloweH = Math.max(min.h, Math.min(GRID_MAX, chcianeH));

    if (doceloweW !== chcianeW || doceloweH !== chcianeH) {
      onRefuse(
        chcianeW < min.w || chcianeH < min.h
          ? `Klocki zajmują ${min.w}×${min.h} kratek — mniejsza sala ucięłaby część planu.`
          : `Sala mieści się w ${GRID_MAX} kratkach.`
      );
    }
    setW(String(doceloweW));
    setH(String(doceloweH));
    onApply(doceloweW, doceloweH);
  };

  /**
   * Enter zatwierdza — przez wyjście z pola, żeby był jeden tor zatwierdzania.
   * onSubmitEditing z React Native nie dochodzi tu na webie, a Marko buduje plany
   * na PC. Na telefonie klawiatura numeryczna nie ma zresztą klawisza Enter
   * i zatwierdza samo wyjście z pola.
   */
  const enterBlurs = Platform.OS === 'web'
    ? ({
        onKeyDown: (e: { key: string; currentTarget: { blur: () => void } }) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        },
      } as object)
    : null;

  return (
    <View style={{ gap: 5 }}>
      <View style={stl.gridRow}>
        <Input
          value={w}
          onChangeText={setW}
          onBlur={commit}
          onSubmitEditing={commit}
          {...enterBlurs}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          selectTextOnFocus
          accessibilityLabel="Szerokość sali w kratkach"
          style={stl.gridInput}
        />
        <Text style={[stl.gridX, { color: t.colors.mutedForeground }]}>×</Text>
        <Input
          value={h}
          onChangeText={setH}
          onBlur={commit}
          onSubmitEditing={commit}
          {...enterBlurs}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          selectTextOnFocus
          accessibilityLabel="Wysokość sali w kratkach"
          style={stl.gridInput}
        />
        <Text style={[stl.gridX, { color: t.colors.mutedForeground }]}>kratek</Text>
      </View>
      <Text style={[stl.hint, { color: t.colors.mutedForeground }]}>
        Od {min.w}×{min.h} (tyle zajmują klocki) do {GRID_MAX} kratek.
      </Text>
    </View>
  );
}

function CategoryList({
  label,
  hint,
  items,
  onAdd,
  onRemove,
  adding,
  disabled,
}: {
  label: string;
  hint: string;
  items: SectionKey[];
  onAdd: () => void;
  onRemove: (key: SectionKey) => void;
  adding?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6, opacity: disabled ? 0.5 : 1 }}>
      <Label>{label}</Label>
      {items.length > 0 && (
        <View style={stl.wrap}>
          {items.map((key) => (
            <Pressable
              key={key}
              onPress={() => onRemove(key)}
              accessibilityRole="button"
              accessibilityLabel={`Usuń ${sectionName(key)}`}
              style={({ pressed }) => [
                stl.chip,
                {
                  backgroundColor: t.colors.primary,
                  borderColor: t.colors.primary,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[stl.chipText, { color: t.colors.primaryForeground }]}>
                {sectionName(key)}
              </Text>
              <Text style={[stl.chipX, { color: t.colors.primaryForeground }]}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        onPress={onAdd}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          stl.addBtn,
          {
            borderColor: adding ? t.colors.primary : t.colors.border,
            backgroundColor: t.colors.muted,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[stl.addText, { color: t.colors.foreground }]}>
          {adding ? 'Zamknij wybór' : items.length ? '+ Dodaj kolejną' : '+ Dodaj kategorię'}
        </Text>
      </Pressable>
      <Text style={[stl.hint, { color: t.colors.mutedForeground }]}>{hint}</Text>
    </View>
  );
}

function Slot({
  label,
  value,
  set,
  onPress,
}: {
  label: string;
  value: string;
  set: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress}>
      <View style={[stl.slot, { borderColor: t.colors.border, backgroundColor: t.colors.muted }]}>
        <Text style={[stl.slotLabel, { color: t.colors.mutedForeground }]}>{label}</Text>
        <Text style={[stl.slotValue, { color: set ? t.colors.foreground : t.colors.mutedForeground }]}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

const stl = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvasWide: { flex: 1, padding: 12 },
  canvasNarrow: { height: 400, padding: 12, paddingBottom: 0 },
  panelWide: { width: 340, flexGrow: 0, flexShrink: 0, borderLeftWidth: 1 },
  panelNarrow: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 17 },
  scale: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.4 },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  gridInput: { width: 64, textAlign: 'center' },
  gridX: { fontFamily: FONT.mono, fontSize: 12 },
  note: { borderWidth: 1, borderLeftWidth: 3, borderRadius: radius.md, padding: 10 },
  noteText: { fontFamily: FONT.sansMedium, fontSize: 13.5, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dims: { fontFamily: FONT.mono, fontSize: 12 },
  slot: { borderWidth: 1, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 12, gap: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  chipText: { fontFamily: FONT.sansMedium, fontSize: 13 },
  chipX: { fontFamily: FONT.sansBold, fontSize: 11 },
  addBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 9,
    alignItems: 'center',
  },
  addText: { fontFamily: FONT.sansMedium, fontSize: 13.5 },
  slotLabel: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  slotValue: { fontFamily: FONT.sansMedium, fontSize: 14.5 },
  picker: { borderWidth: 1, borderRadius: radius.md, padding: 10, gap: 8 },
  stat: { fontFamily: FONT.sansBold, fontSize: 22, letterSpacing: -0.5 },
  order: { fontFamily: FONT.mono, fontSize: 11, lineHeight: 16 },
  errors: { borderLeftWidth: 3, paddingLeft: 10, gap: 3 },
  errText: { fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 17 },
  warn: { fontFamily: FONT.sans, fontSize: 12.5 },
});
