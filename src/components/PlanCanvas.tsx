/**
 * Płótno edytora planu — sterowanie jak w narzędziach do projektowania 2D.
 *
 * Najważniejsza zasada: klocek przeciąga się BEZPOŚREDNIO. Wcześniej trzeba było
 * trafić w osobny uchwyt i to była główna przyczyna tego, że edytor wydawał się
 * nieintuicyjny — w Figmie, Canvie czy dowolnym innym narzędziu po prostu łapiesz
 * obiekt i go ciągniesz.
 *
 * Sterowanie myszą jak w programach graficznych: WIDOK przesuwa się kółkiem
 * wciśniętym jak przycisk (albo spacją z przeciągnięciem), a lewy przycisk służy
 * do zaznaczania — kliknięcie bierze klocek, przeciągnięcie po pustym polu
 * rozciąga ramkę i bierze wszystko, czego dotknie, tak jak zaznaczanie plików
 * na pulpicie.
 *
 * Na telefonie nie ma środkowego przycisku, więc tam palec po pustym polu nadal
 * przesuwa mapę.
 *
 * Rozstrzygnięcie „klocek, ramka czy widok" zapada w momencie dotknięcia. Żeby
 * dało się to zdecydować wewnątrz gestu, trzymamy mapę zajętości kratek
 * w wartości współdzielonej — inaczej trzeba by pytać JS w trakcie gestu
 * i decyzja spóźniałaby się o klatkę.
 *
 * Zaznaczenie ma osiem uchwytów (rogi i boki) plus obrót nad górną krawędzią,
 * czyli dokładnie tyle, ile człowiek spodziewa się zobaczyć.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, MouseButton } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StorePlan } from './StorePlan';
import { FONT } from './ui';
import { rotateAround, sideNormal } from '../lib/geometry';
import { cellsOf, type MapBlock, type StoreMap } from '../lib/mapModel';
import { PLACEABLE, type BlockType } from '../data/blocks';
import { radius, useTheme } from '../lib/theme';

/**
 * Znacznik „to uchwyt, nie płótno".
 *
 * Uchwyty rozmiaru i przyciski przybliżania są dziećmi płótna, więc ich zdarzenia
 * wypływają do nasłuchu płótna. Bez tego znacznika płótno przejmowałoby wskaźnik
 * i uchwyt nie dostawałby ani ruchu, ani puszczenia — czyli nie dałoby się nic
 * rozciągnąć. Na natywnym atrybut jest ignorowany i nic nie szkodzi.
 */
const UCHWYT = { dataSet: { uchwyt: '1' } } as object;

/**
 * Kursor pokazujący, w którą stronę pociągnie uchwyt.
 *
 * Klocek może być obrócony o 45°, więc strzałki nie da się przypisać na sztywno
 * do nazwy uchwytu — bierzemy kierunek, w którym uchwyt faktycznie rozciąga.
 * Kierunek jest dwustronny (ciągnąć da się w obie strony), stąd reszta z 180°.
 * Oś Y rośnie w dół, więc kierunek „w prawo i w dół" to strzałka NW–SE.
 */
function kursorDlaKierunku(nx: number, ny: number): string {
  const kat = ((Math.atan2(ny, nx) * 180) / Math.PI + 360) % 180;
  if (kat < 22.5 || kat >= 157.5) return 'ew-resize';
  if (kat < 67.5) return 'nwse-resize';
  if (kat < 112.5) return 'ns-resize';
  return 'nesw-resize';
}

/** Ile pikseli musi przejechać wskaźnik, żeby kliknięcie stało się zaznaczaniem ramką. */
const PROG_RAMKI = 5;

/**
 * Pas u góry płótna zarezerwowany dla paska narzędzi.
 *
 * Bez tego pasek zasłaniałby lewy górny róg planu — czyli dokładnie to miejsce,
 * od którego zaczyna się większość sklepów. Plan mieści się pod paskiem i tam
 * też wraca po wyśrodkowaniu.
 */
const PAS_NARZEDZI = 44;

const MIN_SCALE = 0.35;
const MAX_SCALE = 8;
const MIN_VIEWPORT_H = 320;
const HANDLE = 30;
const GRIP = 13;

export type Side = 'N' | 'S' | 'W' | 'E';
type Corner = 'NW' | 'NE' | 'SW' | 'SE';
type Grip = Side | Corner;

const GRIPS: Grip[] = ['NW', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W'];

type Props = {
  map: StoreMap;
  /** Klocek z uchwytami — tylko gdy zaznaczony jest dokładnie jeden. */
  selected: MapBlock | null;
  /** Wszystkie zaznaczone klocki. Shift dokłada do zaznaczenia, Ctrl+A bierze wszystkie. */
  selectedIds: string[];
  path?: number[] | null;
  /** Zwykłe kliknięcie w kratkę — stawianie klocka albo zaznaczanie. */
  onCellPress: (x: number, y: number, additive: boolean) => void;
  /** Zaznacz klocek pod kratką (wywoływane na początku przeciągania). */
  onSelectAt: (x: number, y: number) => void;
  /** Aktywne narzędzie i jego zmiana — pasek nad płótnem. */
  tool: { kind: 'select' } | { kind: 'erase' } | { kind: 'block'; type: BlockType };
  onTool: (t: Props['tool']) => void;
  /** Ctrl+A — zaznacz wszystkie klocki. */
  onSelectAll: () => void;
  /** Ramka zaznaczenia po pustym polu — współrzędne w kratkach. */
  onMarquee: (x0: number, y0: number, x1: number, y1: number, additive: boolean) => void;
  /** Chwyt za klocek już zaznaczony: zaczyna się przeciąganie całej grupy. */
  onBeginGroupDrag: () => void;
  /** Alt + przeciągnięcie: zduplikuj klocek pod kratką i zaznacz kopię. */
  onDuplicateAt: (x: number, y: number) => void;
  onMoveBy: (dx: number, dy: number) => void;
  /** Koniec przeciągania klocka — moment na uporządkowanie nakładek. */
  onDragEnd: () => void;
  onResizeEdge: (side: Side, steps: number) => void;
  onRotate: () => void;
  onDelete: () => void;
  onDeselect: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canDelete: boolean;
  /** Rodzic decyduje o rozmiarze — płótno wypełnia to, co dostanie. */
  style?: StyleProp<ViewStyle>;
};

export function PlanCanvas({
  map,
  selected,
  selectedIds,
  tool,
  onTool,
  path,
  onCellPress,
  onSelectAt,
  onSelectAll,
  onMarquee,
  onBeginGroupDrag,
  onDuplicateAt,
  onMoveBy,
  onDragEnd,
  onResizeEdge,
  onRotate,
  onDelete,
  onDeselect,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  canDelete,
  style,
}: Props) {
  const t = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const hostRef = useRef<View>(null);

  const tx = useSharedValue(0);
  const ty = useSharedValue(PAS_NARZEDZI);
  const scale = useSharedValue(1);

  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startScale = useSharedValue(1);

  /** 1 = na tej kratce stoi klocek. Potrzebne w gescie, stąd wartość współdzielona. */
  const occupied = useSharedValue<number[]>([]);
  /** 0 = widok, 1 = klocek, 2 = ramka zaznaczenia. */
  const dragging = useSharedValue(0);
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const moved = useSharedValue(0);
  /** Alt duplikuje przy przeciąganiu, środkowy przycisk zawsze przesuwa widok. */
  const altHeld = useSharedValue(0);
  const middleDown = useSharedValue(0);
  /** Shift dokłada klocek do zaznaczenia zamiast zaczynać nowe. */
  const shiftHeld = useSharedValue(0);
  /** Spacja z przeciągnięciem przesuwa widok — dla myszy bez środkowego przycisku. */
  const spaceHeld = useSharedValue(0);
  /** Ramka zaznaczenia w pikselach płótna: początek i bieżący róg. */
  const markX0 = useSharedValue(0);
  const markY0 = useSharedValue(0);
  const markX1 = useSharedValue(0);
  const markY1 = useSharedValue(0);
  const markOn = useSharedValue(0);
  /**
   * 1 = na tej kratce stoi klocek, który JUŻ jest zaznaczony.
   *
   * Dzięki temu chwycenie dowolnego z zaznaczonych klocków ciągnie całą grupę
   * i nie kasuje zaznaczenia — inaczej po zaznaczeniu pięciu regałów pierwszy
   * chwyt zostawiałby jeden.
   */
  const selectedCells = useSharedValue<number[]>([]);

  /**
   * Przy skali 1 ma być widać CAŁY plan, nie tylko jego szerokość.
   * Dopasowanie wyłącznie do szerokości sprawiało, że sklep 40×28 otwierał się
   * przybliżony do jednej trzeciej — człowiek widział fragment i nie wiedział,
   * gdzie jest reszta.
   */
  const cell =
    size.w > 0 && size.h > 0
      ? Math.min((size.w - 12) / map.gridW, (size.h - 12 - PAS_NARZEDZI) / map.gridH)
      : 0;
  const pxW = cell * map.gridW;
  const pxH = cell * map.gridH;

  useEffect(() => {
    const occ = new Array<number>(map.gridW * map.gridH).fill(0);
    for (const b of map.blocks) for (const c of cellsOf(map, b)) occ[c] = 1;
    occupied.value = occ;
  }, [map]);

  useEffect(() => {
    const sel = new Array<number>(map.gridW * map.gridH).fill(0);
    for (const b of map.blocks) {
      if (!selectedIds.includes(b.id)) continue;
      for (const c of cellsOf(map, b)) sel[c] = 1;
    }
    selectedCells.value = sel;
  }, [map, selectedIds]);

  const zoomBy = (factor: number) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value * factor));
    const ratio = next / scale.value;
    const cx = size.w / 2;
    const cy = size.h / 2;
    tx.value = withTiming(cx - (cx - tx.value) * ratio, { duration: 110 });
    ty.value = withTiming(cy - (cy - ty.value) * ratio, { duration: 110 });
    scale.value = withTiming(next, { duration: 110 });
  };

  function resetView() {
    tx.value = withTiming(0);
    ty.value = withTiming(PAS_NARZEDZI);
    scale.value = withTiming(1);
  }

  /**
   * Wszystko, czego potrzebuje tor myszy, w jednym pudełku.
   *
   * Dzięki temu nasłuch zdarzeń rejestruje się RAZ i nie odpina się w środku
   * przeciągania, kiedy zmieni się plan albo zaznaczenie. Odpięcie w trakcie
   * gubiło gest — a to właśnie na tym wykładało się zaznaczanie.
   */
  const api = useRef({
    cell,
    gridW: map.gridW,
    gridH: map.gridH,
    onSelectAt,
    onCellPress,
    onBeginGroupDrag,
    onDuplicateAt,
    onMoveBy,
    onDragEnd,
    onMarquee,
    selected,
    selectedIds,
    canDelete,
    onDelete,
    onRotate,
    onDeselect,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onSelectAll,
  });
  api.current = {
    cell,
    gridW: map.gridW,
    gridH: map.gridH,
    onSelectAt,
    onCellPress,
    onBeginGroupDrag,
    onDuplicateAt,
    onMoveBy,
    onDragEnd,
    onMarquee,
    selected,
    selectedIds,
    canDelete,
    onDelete,
    onRotate,
    onDeselect,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onSelectAll,
  };

  // Kółko myszy i skróty klawiszowe — na komputerze bez tego nie ma mowy o wygodzie.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = hostRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value * factor));
      const ratio = next / scale.value;
      tx.value = px - (px - tx.value) * ratio;
      ty.value = py - (py - ty.value) * ratio;
      scale.value = next;
    };

    const onAlt = (e: KeyboardEvent) => {
      altHeld.value = e.altKey ? 1 : 0;
      shiftHeld.value = e.shiftKey ? 1 : 0;
      // Spacja przesuwa widok, ale nie wtedy, gdy ktoś pisze w polu obok.
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        if (e.type === 'keydown') e.preventDefault();
        spaceHeld.value = e.type === 'keydown' ? 1 : 0;
      }
    };
    const onBlur = () => {
      altHeld.value = 0;
      shiftHeld.value = 0;
      spaceHeld.value = 0;
      middleDown.value = 0;
    };

    /**
     * CAŁA mysz idzie po surowych zdarzeniach wskaźnika, nie po gestach
     * z biblioteki.
     *
     * Powód jest praktyczny: gest przebudowuje się, gdy zmieni się zaznaczenie
     * albo plan — czyli dokładnie w chwili, w której go zaczynasz. Na komputerze
     * gubiło to kliknięcia i klocka nie dawało się zaznaczyć. Tutaj nasłuch
     * rejestruje się raz, a wszystko, co zmienne, czytamy z `api.current`.
     *
     * Gesty z biblioteki zostają dla dotyku, gdzie sprawdzają się bez zarzutu.
     */
    type Tor =
      | { co: 'widok'; x: number; y: number; tx: number; ty: number }
      | { co: 'klocek'; x: number; y: number; dx: number; dy: number }
      | { co: 'ramka'; x: number; y: number; cx: number; cy: number; ruszyl: boolean };
    let tor: Tor | null = null;

    /** Pozycja wskaźnika w kratkach planu. */
    const doKratek = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      const c = api.current.cell;
      if (c <= 0) return null;
      const cx = Math.floor((e.clientX - r.left - tx.value) / scale.value / c);
      const cy = Math.floor((e.clientY - r.top - ty.value) / scale.value / c);
      if (cx < 0 || cy < 0 || cx >= api.current.gridW || cy >= api.current.gridH) return null;
      return { cx, cy, idx: cy * api.current.gridW + cx };
    };

    const onPointerDown = (e: PointerEvent) => {
      // Środkowy przycisk (albo spacja) przesuwa widok — jak w programach graficznych.
      if (e.button === 1 || (e.button === 0 && spaceHeld.value === 1)) {
        e.preventDefault();
        middleDown.value = 1;
        tor = { co: 'widok', x: e.clientX, y: e.clientY, tx: tx.value, ty: ty.value };
        node.style.cursor = 'grabbing';
        node.setPointerCapture?.(e.pointerId);
        return;
      }
      if (e.button !== 0) return;
      // Uchwyty rozmiaru, obrotu i przyciski przybliżania są dziećmi płótna.
      // Zdarzenie z nich dochodzi tutaj przez wypływanie — musimy je przepuścić,
      // inaczej płótno przejmuje wskaźnik i uchwyt nie dostaje ani ruchu, ani puszczenia.
      const cel = e.target as HTMLElement | null;
      if (cel?.closest?.('[data-uchwyt]')) return;

      const kratka = doKratek(e);
      if (!kratka) return;
      node.setPointerCapture?.(e.pointerId);
      markOn.value = 0;

      const wZaznaczeniu = selectedCells.value[kratka.idx] === 1;
      const zajete = occupied.value[kratka.idx] === 1;
      // Shift i Alt czytamy WPROST ze zdarzenia myszy. Śledzenie ich klawiaturą
      // gubi się, gdy okno straci skupienie z wciśniętym klawiszem — a wtedy
      // shift z kliknięciem po cichu przestaje dokładać do zaznaczenia.
      const zShiftem = e.shiftKey;

      if (zajete && !zShiftem) {
        if (e.altKey) api.current.onDuplicateAt(kratka.cx, kratka.cy);
        else if (wZaznaczeniu) api.current.onBeginGroupDrag();
        else api.current.onSelectAt(kratka.cx, kratka.cy);
        tor = { co: 'klocek', x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
        return;
      }
      if (zajete) {
        // Shift w klocek to gest zaznaczania — dokłada go do grupy przy puszczeniu.
        tor = { co: 'klocek', x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
        return;
      }
      // Puste pole: ramka zapali się dopiero, gdy wskaźnik ruszy.
      const r = node.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      markX0.value = px;
      markY0.value = py;
      markX1.value = px;
      markY1.value = py;
      tor = { co: 'ramka', x: e.clientX, y: e.clientY, cx: kratka.cx, cy: kratka.cy, ruszyl: false };
    };

    /**
     * Kursor mówi, co się stanie po naciśnięciu — jak w narzędziach graficznych.
     * Uchwyty mają własne strzałki rozciągania (patrz GripHandle).
     */
    const ustawKursor = (e: PointerEvent) => {
      const cel = e.target as HTMLElement | null;
      if (cel?.closest?.('[data-uchwyt]')) {
        node.style.cursor = '';
        return;
      }
      if (spaceHeld.value === 1) {
        node.style.cursor = 'grab';
        return;
      }
      const kratka = doKratek(e);
      node.style.cursor = kratka && occupied.value[kratka.idx] === 1 ? 'move' : 'default';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!tor) {
        ustawKursor(e);
        return;
      }

      if (tor.co === 'widok') {
        tx.value = tor.tx + (e.clientX - tor.x);
        ty.value = tor.ty + (e.clientY - tor.y);
        return;
      }

      if (tor.co === 'klocek') {
        const krok = api.current.cell * scale.value;
        if (krok <= 0) return;
        const dx = Math.round((e.clientX - tor.x) / krok);
        const dy = Math.round((e.clientY - tor.y) / krok);
        if (dx !== tor.dx || dy !== tor.dy) {
          api.current.onMoveBy(dx - tor.dx, dy - tor.dy);
          tor.dx = dx;
          tor.dy = dy;
        }
        return;
      }

      const przejechal = Math.abs(e.clientX - tor.x) + Math.abs(e.clientY - tor.y);
      if (!tor.ruszyl && przejechal < PROG_RAMKI) return;
      tor.ruszyl = true;
      markOn.value = 1;
      const r = node.getBoundingClientRect();
      markX1.value = e.clientX - r.left;
      markY1.value = e.clientY - r.top;
    };

    const onPointerUp = (e: PointerEvent) => {
      const koniec = tor;
      tor = null;
      middleDown.value = 0;
      markOn.value = 0;
      node.style.cursor = '';
      if (!koniec || koniec.co === 'widok') return;

      if (koniec.co === 'klocek') {
        const ruszony = koniec.dx !== 0 || koniec.dy !== 0;
        if (ruszony) {
          api.current.onDragEnd();
          return;
        }
        // Klocek stał w miejscu, czyli to było zwykłe kliknięcie.
        const kratka = doKratek(e);
        if (kratka) api.current.onCellPress(kratka.cx, kratka.cy, e.shiftKey);
        return;
      }

      if (!koniec.ruszyl) {
        // Kliknięcie w puste pole, a nie ramka — odznacza albo stawia klocek.
        api.current.onCellPress(koniec.cx, koniec.cy, e.shiftKey);
        return;
      }
      const c = api.current.cell;
      if (c <= 0) return;
      const naKratki = (px: number, t: number) => (px - t) / scale.value / c;
      api.current.onMarquee(
        naKratki(markX0.value, tx.value),
        naKratki(markY0.value, ty.value),
        naKratki(markX1.value, tx.value),
        naKratki(markY1.value, ty.value),
        e.shiftKey
      );
    };

    const onPointerCancel = () => {
      tor = null;
      middleDown.value = 0;
      markOn.value = 0;
      node.style.cursor = '';
    };
    // Bez tego przeglądarka włącza własne przewijanie kółkiem.
    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const a = api.current;
      // Skróty jak w każdym edytorze. Ctrl i Cmd traktujemy tak samo.
      const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); return a.onUndo(); }
        if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); return a.onRedo(); }
        if (k === 'c') { e.preventDefault(); return a.onCopy(); }
        if (k === 'v') { e.preventDefault(); return a.onPaste(); }
        if (k === 'a') { e.preventDefault(); return a.onSelectAll(); }
        return;
      }
      if (e.key === 'Escape') return a.onDeselect();
      // Strzałki i Delete działają na całym zaznaczeniu, obrót tylko na pojedynczym.
      if (!a.selectedIds.length) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (a.canDelete) a.onDelete();
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && a.selected) return a.onRotate();
      const nudge: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const d = nudge[e.key];
      if (d) {
        e.preventDefault();
        a.onMoveBy(d[0], d[1]);
      }
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('auxclick', onAuxClick);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onAlt);
    window.addEventListener('keyup', onAlt);
    window.addEventListener('blur', onBlur);
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('auxclick', onAuxClick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keydown', onAlt);
      window.removeEventListener('keyup', onAlt);
      window.removeEventListener('blur', onBlur);
    };
    // Celowo bez zaznaczenia i planu w zależnościach: nasłuch ma się rejestrować
    // raz, a nie odpinać w chwili, gdy kliknięcie zmienia stan. Wszystko zmienne
    // czytamy z api.current.
  }, [size.w]);

  /**
   * Jeden gest na wszystko: decyduje w momencie dotknięcia, czy ciągniemy klocek,
   * czy przesuwamy widok. Dzięki temu nie ma osobnego uchwytu do przesuwania.
   */

  /**
   * Co robi przeciągnięcie po pustym polu: na myszy ramkę zaznaczenia (2),
   * palcem przesuwanie mapy (0). Telefon nie ma środkowego przycisku, więc
   * gdyby i tam pusty obszar zaznaczał, nie dałoby się ruszyć widokiem.
   */
  const pustePoleCiagnie = Platform.OS === 'web' ? 2 : 0;

  const drag = useMemo(
    () =>
      Gesture.Pan()
        // Tylko lewy przycisk. Środkowy jest zarezerwowany dla przesuwania widoku
        // i gdyby uruchamiał ten gest, zaczynałby przy okazji ramkę zaznaczenia.
        .mouseButton(MouseButton.LEFT)
        .averageTouches(true)
        .onBegin((e) => {
          startTx.value = tx.value;
          startTy.value = ty.value;
          lastX.value = 0;
          lastY.value = 0;
          moved.value = 0;
          markOn.value = 0;
          // Widok przesuwa środkowy przycisk (albo spacja) — obsługuje go osobny
          // tor na zdarzeniach wskaźnika, więc tutaj tylko schodzimy z drogi.
          if (middleDown.value === 1 || spaceHeld.value === 1) {
            dragging.value = 3;
            return;
          }
          dragging.value = pustePoleCiagnie;
          if (cell <= 0) return;
          const cx = Math.floor((e.x - tx.value) / scale.value / cell);
          const cy = Math.floor((e.y - ty.value) / scale.value / cell);
          if (cx < 0 || cy < 0 || cx >= map.gridW || cy >= map.gridH) return;
          const idx = cy * map.gridW + cx;

          if (selectedCells.value[idx] === 1 && shiftHeld.value === 0) {
            // Chwyt za którykolwiek z zaznaczonych ciągnie całą grupę.
            dragging.value = 1;
            if (altHeld.value === 1) runOnJS(onDuplicateAt)(cx, cy);
            else runOnJS(onBeginGroupDrag)();
            return;
          }
          if (occupied.value[idx] === 1) {
            // Shift w klocek to gest zaznaczania, nie przeciągania — dokłada go
            // do grupy (robi to stuknięcie), więc niczym tu nie ruszamy.
            if (shiftHeld.value === 1) {
              dragging.value = 3;
              return;
            }
            dragging.value = 1;
            if (altHeld.value === 1) runOnJS(onDuplicateAt)(cx, cy);
            else runOnJS(onSelectAt)(cx, cy);
            return;
          }
          // Puste pole: na myszy rozciągamy ramkę zaznaczenia, palcem przesuwamy mapę.
          // Zapamiętujemy tylko punkt startu — ramka zapala się dopiero, gdy
          // wskaźnik ruszy (patrz PROG_RAMKI). Samo kliknięcie ma zostać
          // kliknięciem, tak jak wszędzie indziej.
          markX0.value = e.x;
          markY0.value = e.y;
          markX1.value = e.x;
          markY1.value = e.y;
        })
        .onUpdate((e) => {
          if (Math.abs(e.translationX) + Math.abs(e.translationY) > 3) moved.value = 1;
          if (dragging.value === 3) return;
          if (dragging.value === 2) {
            if (
              markOn.value === 0 &&
              Math.abs(e.x - markX0.value) + Math.abs(e.y - markY0.value) < PROG_RAMKI
            ) {
              return;
            }
            markOn.value = 1;
            markX1.value = e.x;
            markY1.value = e.y;
            return;
          }
          if (dragging.value === 0) {
            tx.value = startTx.value + e.translationX;
            ty.value = startTy.value + e.translationY;
            return;
          }
          if (cell <= 0) return;
          const step = cell * scale.value;
          const dx = Math.round(e.translationX / step);
          const dy = Math.round(e.translationY / step);
          if (dx !== lastX.value || dy !== lastY.value) {
            const sx = dx - lastX.value;
            const sy = dy - lastY.value;
            lastX.value = dx;
            lastY.value = dy;
            runOnJS(onMoveBy)(sx, sy);
          }
        })
        .onEnd(() => {
          // Podczas ciągnięcia klocek może przechodzić przez inne — układamy to
          // dopiero po puszczeniu, żeby nie zacinał się o każdą przeszkodę.
          if (dragging.value === 1) runOnJS(onDragEnd)();
          if (dragging.value === 2 && markOn.value === 1) {
            markOn.value = 0;
            if (cell > 0) {
              const doKratek = (px: number, t: number) => (px - t) / scale.value / cell;
              runOnJS(onMarquee)(
                doKratek(markX0.value, tx.value),
                doKratek(markY0.value, ty.value),
                doKratek(markX1.value, tx.value),
                doKratek(markY1.value, ty.value),
                shiftHeld.value === 1
              );
            }
          }
        })
        // Gest bywa przerwany (okno traci skupienie, przeglądarka przejmuje
        // wskaźnik). Bez tego ramka zostawałaby narysowana na ekranie.
        .onFinalize(() => {
          markOn.value = 0;
        }),
    [cell, map.gridW, map.gridH, pustePoleCiagnie, onMoveBy, onSelectAt, onDuplicateAt, onBeginGroupDrag, onDragEnd, onMarquee]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          startScale.value = scale.value;
          startTx.value = tx.value;
          startTy.value = ty.value;
        })
        .onUpdate((e) => {
          const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale.value * e.scale));
          const ratio = next / startScale.value;
          tx.value = e.focalX - (e.focalX - startTx.value) * ratio;
          ty.value = e.focalY - (e.focalY - startTy.value) * ratio;
          scale.value = next;
        }),
    []
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        // Kliknięcie zostaje kliknięciem, choćby przycisk był wciśnięty dłużej —
        // to ruch wskaźnika, a nie czas, robi z niego przeciągnięcie.
        .maxDuration(1200)
        .maxDistance(8)
        .onEnd((e) => {
          if (cell <= 0) return;
          const cx = Math.floor((e.x - tx.value) / scale.value / cell);
          const cy = Math.floor((e.y - ty.value) / scale.value / cell);
          if (cx < 0 || cy < 0 || cx >= map.gridW || cy >= map.gridH) return;
          runOnJS(onCellPress)(cx, cy, shiftHeld.value === 1);
        }),
    [cell, map.gridW, map.gridH, onCellPress]
  );

  /**
   * Na komputerze całą myszą steruje tor na zdarzeniach wskaźnika (patrz efekt
   * wyżej): zaznaczanie, przeciąganie klocków, ramka i przesuwanie widoku.
   * Gesty z biblioteki zostają dla dotyku — tam działają jak trzeba, a na webie
   * potrafiły zgubić gest w chwili, gdy zaznaczenie zmieniało stan komponentu.
   */
  const composed = useMemo(
    () => (Platform.OS === 'web' ? pinch : Gesture.Simultaneous(drag, pinch, tap)),
    [drag, pinch, tap]
  );

  /** Ramka zaznaczenia. Rysujemy ją w pikselach płótna, poza przesuwaną zawartością. */
  const marqueeStyle = useAnimatedStyle(() => ({
    opacity: markOn.value,
    left: Math.min(markX0.value, markX1.value),
    top: Math.min(markY0.value, markY1.value),
    width: Math.abs(markX1.value - markX0.value),
    height: Math.abs(markY1.value - markY0.value),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  /** Punkty zaczepienia uchwytów, już po obrocie klocka. */
  const anchors = useMemo(() => {
    if (!selected) return null;
    const b = selected;
    const px = b.x + 0.5;
    const py = b.y + 0.5;
    const R = (x: number, y: number) => rotateAround(x, y, px, py, b.rot ?? 0);
    const mx = b.x + b.w / 2;
    const my = b.y + b.h / 2;
    return {
      NW: R(b.x, b.y),
      N: R(mx, b.y),
      NE: R(b.x + b.w, b.y),
      E: R(b.x + b.w, my),
      SE: R(b.x + b.w, b.y + b.h),
      S: R(mx, b.y + b.h),
      SW: R(b.x, b.y + b.h),
      W: R(b.x, my),
      rotate: R(mx, b.y - 1.2),
      remove: R(b.x + b.w + 1.1, b.y - 1.1),
    } as Record<Grip | 'rotate' | 'remove', { x: number; y: number }>;
  }, [selected]);

  return (
    <View
      ref={hostRef}
      onLayout={onLayout}
      style={[
        styles.viewport,
        { backgroundColor: t.colors.card, borderColor: t.colors.border },
        style,
      ]}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={StyleSheet.absoluteFill}>
          {cell > 0 && (
            <Animated.View
              style={[{ width: pxW, height: pxH, transformOrigin: 'top left' }, contentStyle]}
            >
              <StorePlan
                map={map}
                cell={cell}
                selectedIds={selectedIds}
                path={path}
              />
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.marquee,
          // Wypełnienie ledwo widoczne — ramka ma pokazywać zasięg, nie zasłaniać planu.
          { borderColor: t.colors.primary, backgroundColor: t.colors.primary + '2e' },
          marqueeStyle,
        ]}
      />

      {selected && anchors && cell > 0 && (
        <>
          {GRIPS.map((g) => (
            <Anchor key={g} at={anchors[g]} tx={tx} ty={ty} scale={scale} cell={cell} size={GRIP + 10}>
              <GripHandle
                grip={g}
                rot={selected.rot ?? 0}
                cell={cell}
                scale={scale}
                onResizeEdge={onResizeEdge}
              />
            </Anchor>
          ))}

          <Anchor at={anchors.rotate} tx={tx} ty={ty} scale={scale} cell={cell} size={HANDLE}>
            <RoundBtn glyph="⟳" label="Obróć o 45 stopni" onPress={onRotate} />
          </Anchor>

          {canDelete && (
            <Anchor at={anchors.remove} tx={tx} ty={ty} scale={scale} cell={cell} size={HANDLE}>
              <RoundBtn glyph="✕" label="Usuń klocek" onPress={onDelete} danger />
            </Anchor>
          )}
        </>
      )}

      {/*
        Pasek narzędzi zawsze pod ręką, nad samym płótnem. Sięganie do panelu
        po prawej za każdym razem, gdy trzeba postawić klocek, było najczęściej
        powtarzanym ruchem przy mapowaniu.
      */}
      <View
        {...UCHWYT}
        style={[styles.toolBox, { backgroundColor: t.colors.card, borderColor: t.colors.border }]}
      >
        <ToolBtn
          glyph="↖"
          label="Zaznaczanie"
          active={tool.kind === 'select'}
          onPress={() => onTool({ kind: 'select' })}
        />
        <View style={[styles.toolSep, { backgroundColor: t.colors.border }]} />
        {PLACEABLE.map((b) => (
          <ToolBtn
            key={b.key}
            glyph={TOOL_GLYPH[b.key] ?? '▢'}
            label={`Postaw: ${b.name}`}
            active={tool.kind === 'block' && tool.type === b.key}
            onPress={() => onTool({ kind: 'block', type: b.key })}
          />
        ))}
        <View style={[styles.toolSep, { backgroundColor: t.colors.border }]} />
        <ToolBtn
          glyph="⌫"
          label="Usuwanie klocków"
          active={tool.kind === 'erase'}
          onPress={() => onTool({ kind: 'erase' })}
          danger
        />
      </View>

      <View {...UCHWYT} style={styles.zoomBox}>
        <ZoomBtn label="Przybliż" glyph="+" onPress={() => zoomBy(1.3)} />
        <ZoomBtn label="Oddal" glyph="−" onPress={() => zoomBy(1 / 1.3)} />
        <ZoomBtn label="Wyśrodkuj" glyph="⤢" onPress={resetView} muted />
      </View>
    </View>
  );
}

/** Znaki na pasku narzędzi. Pełna nazwa siedzi w etykiecie dostępności i podpowiedzi. */
const TOOL_GLYPH: Record<string, string> = {
  klocek: '▢',
  sciana: '▬',
  wejscie: '⇥',
  kasy: '▤',
};

function ToolBtn({
  glyph,
  label,
  active,
  danger,
  onPress,
}: {
  glyph: string;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const barwa = danger ? t.colors.destructive : t.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      {...(Platform.OS === 'web' ? ({ title: label } as object) : null)}
      style={({ pressed }) => [
        styles.toolBtn,
        {
          backgroundColor: active ? barwa : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.toolGlyph,
          { color: active ? t.colors.primaryForeground : t.colors.foreground },
        ]}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

function Anchor({
  at,
  tx,
  ty,
  scale,
  cell,
  size,
  children,
}: {
  at: { x: number; y: number };
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  scale: SharedValue<number>;
  cell: number;
  size: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value + at.x * cell * scale.value - size / 2 },
      { translateY: ty.value + at.y * cell * scale.value - size / 2 },
    ],
  }));
  return (
    <Animated.View {...UCHWYT} style={[styles.anchor, { width: size, height: size }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Uchwyt zaznaczenia. Rogi zmieniają oba wymiary naraz, boki jeden.
 * Przy klocku obróconym liczymy rzut ruchu na kierunek prostopadły do ściany,
 * więc skos rozciąga się wzdłuż siebie, a nie wzdłuż ekranu.
 */
function GripHandle({
  grip,
  rot,
  cell,
  scale,
  onResizeEdge,
}: {
  grip: Grip;
  rot: number;
  cell: number;
  scale: SharedValue<number>;
  onResizeEdge: (side: Side, steps: number) => void;
}) {
  const t = useTheme();
  const lastA = useSharedValue(0);
  const lastB = useSharedValue(0);

  const sides = useMemo(() => {
    const map: Record<Grip, Side[]> = {
      N: ['N'], S: ['S'], W: ['W'], E: ['E'],
      NW: ['N', 'W'], NE: ['N', 'E'], SW: ['S', 'W'], SE: ['S', 'E'],
    };
    return map[grip];
  }, [grip]);

  const normals = useMemo(() => sides.map((s) => ({ s, ...sideNormal(s, rot) })), [sides, rot]);

  /**
   * Rozciąganie zmienia plan, a plan przebudowywał tę funkcję — czyli gest
   * powstawał od nowa w środku przeciągania i biblioteka gubiła go po pierwszym
   * kroku. Stała opakowująca sięga po najświeższą wersję, sama się nie zmieniając.
   */
  const swiezy = useRef(onResizeEdge);
  swiezy.current = onResizeEdge;
  const rozciagnij = useCallback((side: Side, steps: number) => swiezy.current(side, steps), []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          lastA.value = 0;
          lastB.value = 0;
        })
        .onUpdate((e) => {
          if (cell <= 0) return;
          const step = cell * scale.value;
          normals.forEach((n, i) => {
            const along = e.translationX * n.nx + e.translationY * n.ny;
            const steps = Math.round(along / step);
            const prev = i === 0 ? lastA.value : lastB.value;
            if (steps !== prev) {
              const delta = steps - prev;
              if (i === 0) lastA.value = steps;
              else lastB.value = steps;
              runOnJS(rozciagnij)(n.s, delta);
            }
          });
        }),
    [cell, normals, rozciagnij]
  );

  /**
   * Na komputerze uchwyt słucha wskaźnika wprost — tak samo jak płótno i z tego
   * samego powodu: gest z biblioteki gubił się tu w chwili, gdy rozciąganie
   * zmieniało plan. Na dotyku zostaje gest, bo tam działa bez zarzutu.
   */
  const wezel = useRef<View>(null);
  const swieze = useRef({ cell, normals });
  swieze.current = { cell, normals };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = wezel.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    let start: { x: number; y: number; a: number; b: number } | null = null;

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      // Uchwyt zjada zdarzenie, żeby płótno pod spodem nie zaczęło ramki.
      e.preventDefault();
      e.stopPropagation();
      start = { x: e.clientX, y: e.clientY, a: 0, b: 0 };
      node.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const { cell: c, normals: n } = swieze.current;
      const krok = c * scale.value;
      if (krok <= 0) return;
      n.forEach((os, i) => {
        const wzdluz = (e.clientX - start!.x) * os.nx + (e.clientY - start!.y) * os.ny;
        const kroki = Math.round(wzdluz / krok);
        const poprzednio = i === 0 ? start!.a : start!.b;
        if (kroki === poprzednio) return;
        if (i === 0) start!.a = kroki;
        else start!.b = kroki;
        rozciagnij(os.s, kroki - poprzednio);
      });
    };
    const up = () => {
      start = null;
    };

    node.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [rozciagnij, scale]);

  const corner = sides.length === 2;
  // Uchwyt narożny ciągnie po przekątnej, czyli po sumie obu swoich kierunków.
  const kursor = useMemo(() => {
    const nx = normals.reduce((sum, n) => sum + n.nx, 0);
    const ny = normals.reduce((sum, n) => sum + n.ny, 0);
    return kursorDlaKierunku(nx, ny);
  }, [normals]);

  const uchwyt = (
    <View
      ref={wezel}
      accessibilityRole="adjustable"
      accessibilityLabel={`Rozciągnij ${grip}`}
      style={[
        styles.grip,
        {
          width: corner ? GRIP : grip === 'N' || grip === 'S' ? GRIP + 6 : GRIP - 3,
          height: corner ? GRIP : grip === 'N' || grip === 'S' ? GRIP - 3 : GRIP + 6,
          backgroundColor: t.colors.card,
          borderColor: t.colors.foreground,
        },
        { cursor: kursor } as unknown as ViewStyle,
      ]}
    />
  );

  if (Platform.OS === 'web') return uchwyt;
  return <GestureDetector gesture={gesture}>{uchwyt}</GestureDetector>;
}

function RoundBtn({
  glyph,
  label,
  onPress,
  danger,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: danger ? t.colors.destructive : t.colors.card,
          borderColor: danger ? t.colors.destructive : t.colors.foreground,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.glyph,
          { color: danger ? t.colors.destructiveForeground : t.colors.foreground },
        ]}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

function ZoomBtn({
  glyph,
  label,
  onPress,
  muted,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.zoomBtn,
        {
          backgroundColor: muted ? t.colors.muted : t.colors.card,
          borderColor: t.colors.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text
        style={[
          muted ? styles.zoomSmall : styles.zoomText,
          { color: muted ? t.colors.mutedForeground : t.colors.foreground },
        ]}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, minHeight: MIN_VIEWPORT_H, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  marquee: { position: 'absolute', borderWidth: 1, borderRadius: 2 },
  anchor: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  btn: {
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: { borderRadius: 2, borderWidth: 1.5 },
  glyph: { fontFamily: FONT.sansBold, fontSize: 15, lineHeight: 19 },
  toolBox: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  toolSep: { width: 1, alignSelf: 'stretch', marginHorizontal: 2 },
  toolBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolGlyph: { fontFamily: FONT.sansSemi, fontSize: 15, lineHeight: 19 },
  zoomBox: { position: 'absolute', right: 8, bottom: 8, gap: 6 },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { fontFamily: FONT.sansBold, fontSize: 17, lineHeight: 20 },
  zoomSmall: { fontFamily: FONT.sansSemi, fontSize: 13, lineHeight: 16 },
});
