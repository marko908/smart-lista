/**
 * Model planu sklepu — klocki na siatce.
 *
 * Jedna kratka to mniej więcej metr. Plan ma oddawać proporcje, nie centymetry:
 * do policzenia kolejności sekcji liczy się topologia, a nie geodezja.
 *
 * Klocki mogą być obrócone co 45°, więc każdy sprowadzamy do ODCISKU — zbioru
 * kratek, które zajmuje (patrz lib/geometry.ts). Kolizje, ściany i punkty dostępu
 * liczą się na odciskach, nie na prostokątach.
 *
 * Wejście i kasy są zwykłymi klockami z flagą `fixed`: da się je przesuwać
 * i skalować, a usunąć tylko wtedy, gdy zostaje jeszcze jedno takie samo —
 * trasa musi mieć start i metę (patrz `removable`).
 */

import { BLOCK_BY_KEY, isCheckout, type BlockType } from '../data/blocks';
import type { SectionKey } from '../data/sections';
import {
  centerOf,
  footprint,
  footprintFits,
  longAxis,
  nextAngle,
  normalizeAngle,
  type Angle,
} from './geometry';

export type MapBlock = {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Obrót w stopniach, co 45. Wokół środka pierwszej kratki. */
  rot: Angle;
  /**
   * Kategorie na tym klocku — dowolnie wiele.
   *
   * Jeden regał potrafi mieć sushi na środkowej półce i masło na dolnej.
   * Z punktu widzenia trasy leżą w TYM SAMYM miejscu: stoisz raz i sięgasz
   * po jedno i drugie. Dlatego wszystkie dostają ten sam zestaw kratek dostępu.
   */
  sections: SectionKey[];
  /**
   * Kategorie po przeciwnej stronie regału. Puste = klocek jednostronny.
   *
   * To co innego niż półki: druga strona alejki to fizycznie inne miejsce,
   * więc dostaje własne kratki dostępu.
   */
  sectionsB: SectionKey[];
};

export type StoreMap = {
  gridW: number;
  gridH: number;
  blocks: MapBlock[];
};

/**
 * Domyslna siatka: 40x28 to okolo 1120 m2.
 *
 * Zmierzony Lidl (Rybnik, Zorska) ma 1679 m2 calego budynku przy boku 50 m,
 * czyli mniej wiecej 50x34. Odejmujac magazyn i zaplecze, sala sprzedazy
 * wychodzi w okolicach 1100-1400 m2 — i to jest to, co sie mapuje.
 */
export const DEFAULT_GRID_W = 40;
export const DEFAULT_GRID_H = 28;
export const METERS_PER_CELL = 1;

let seq = 0;
function fixedId(type: BlockType): string {
  seq += 1;
  return `fix_${type}_${seq}`;
}

export function createDefaultMap(): StoreMap {
  const mk = (type: BlockType, x: number, y: number): MapBlock => {
    const def = BLOCK_BY_KEY[type];
    return {
      id: fixedId(type),
      type,
      x,
      y,
      w: def.size[0],
      h: def.size[1],
      rot: 0,
      sections: [],
      sectionsB: [],
    };
  };
  return {
    gridW: DEFAULT_GRID_W,
    gridH: DEFAULT_GRID_H,
    blocks: [mk('wejscie', 3, 27), mk('kasy', 18, 23)],
  };
}

export function isFixed(b: MapBlock): boolean {
  return BLOCK_BY_KEY[b.type].fixed;
}

/**
 * Które z podanych klocków wolno usunąć.
 *
 * Trasa potrzebuje startu i mety, więc jedno wejście i jedne kasy muszą zostać.
 * Ale drugie wejście czy druga kasa to już zwykły klocek — sklepy mają po kilka
 * i skoro można je postawić, trzeba móc je też skasować.
 *
 * Liczymy na całym zbiorze naraz, nie klocek po klocku: przy zaznaczeniu Ctrl+A
 * każde z dwóch wejść z osobna wyglądałoby na usuwalne, a razem zabrałyby
 * planowi start.
 */
export function removable(map: StoreMap, ids: string[]): MapBlock[] {
  const chce = new Set(ids);
  const zostalo = new Map<BlockType, number>();
  const out: MapBlock[] = [];

  for (const b of map.blocks) {
    if (!chce.has(b.id)) continue;
    if (!isFixed(b)) {
      out.push(b);
      continue;
    }
    const ile = zostalo.get(b.type) ?? map.blocks.filter((x) => x.type === b.type).length;
    if (ile <= 1) continue;
    zostalo.set(b.type, ile - 1);
    out.push(b);
  }
  return out;
}

/**
 * Klocki objęte ramką zaznaczenia — tak jak zaznaczanie plików na pulpicie.
 *
 * Wystarczy, że ramka dotknie klocka: wymaganie objęcia go w całości brzmi
 * porządniej, ale w praktyce zmusza do celowania wokół długich regałów.
 * Liczymy na kratkach, nie na prostokątach, bo klocek może być obrócony o 45°.
 */
export function blocksInRect(
  map: StoreMap,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): MapBlock[] {
  const lewo = Math.min(x0, x1);
  const prawo = Math.max(x0, x1);
  const gora = Math.min(y0, y1);
  const dol = Math.max(y0, y1);

  return map.blocks.filter((b) =>
    cellsOf(map, b).some((c) => {
      const cx = c % map.gridW;
      const cy = (c - cx) / map.gridW;
      return cx + 1 > lewo && cx < prawo && cy + 1 > gora && cy < dol;
    })
  );
}

export function isBlocking(b: MapBlock): boolean {
  return BLOCK_BY_KEY[b.type].blocking;
}

/**
 * Docina rozmiar do minimum typu. Minimum dotyczy dłuższego i krótszego boku,
 * nie sztywno szerokości i wysokości — inaczej obrót zmieniałby powierzchnię.
 */
export function clampSize(type: BlockType, w: number, h: number): [number, number] {
  const [a, b] = BLOCK_BY_KEY[type].min;
  const minShort = Math.min(a, b);
  const minLong = Math.max(a, b);
  const rw = Math.round(w);
  const rh = Math.round(h);
  return rw >= rh
    ? [Math.max(rw, minLong), Math.max(rh, minShort)]
    : [Math.max(rw, minShort), Math.max(rh, minLong)];
}

export const idx = (x: number, y: number, w: number) => y * w + x;

export function inBounds(map: StoreMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.gridW && y < map.gridH;
}

export function cellsOf(map: StoreMap, b: MapBlock): number[] {
  return footprint(b, map.gridW, map.gridH);
}

export function rasterize(map: StoreMap): Uint8Array {
  const walls = new Uint8Array(map.gridW * map.gridH);
  for (const b of map.blocks) {
    if (!isBlocking(b)) continue;
    for (const c of cellsOf(map, b)) walls[c] = 1;
  }
  return walls;
}

export function blockAt(map: StoreMap, x: number, y: number): MapBlock | null {
  if (!inBounds(map, x, y)) return null;
  const target = idx(x, y, map.gridW);
  for (let i = map.blocks.length - 1; i >= 0; i--) {
    if (cellsOf(map, map.blocks[i]).includes(target)) return map.blocks[i];
  }
  return null;
}

export function overlaps(map: StoreMap, cand: MapBlock, ignoreId?: string): boolean {
  const mine = new Set(cellsOf(map, cand));
  return map.blocks.some(
    (b) => b.id !== ignoreId && cellsOf(map, b).some((c) => mine.has(c))
  );
}

export function fits(map: StoreMap, cand: MapBlock): boolean {
  return footprintFits(cand, map.gridW, map.gridH);
}

export function rotateBlock(b: MapBlock, dir: 1 | -1 = 1): MapBlock {
  return { ...b, rot: nextAngle(b.rot ?? 0, dir) };
}

/**
 * Szuka miejsca dla klocka blisko zadanej pozycji.
 *
 * Obrót przy stałym punkcie odniesienia (pierwsza kratka) sprawia, że długi
 * regał zamiata w bok i potrafi wpaść na sąsiada. Zamiast po cichu odmówić,
 * próbujemy kilku kratek dookoła — cicha odmowa wygląda jak zepsuty przycisk.
 */
export function findSpot(
  map: StoreMap,
  cand: MapBlock,
  radius = 2
): MapBlock | null {
  const at = (x: number, y: number): MapBlock | null => {
    const t = { ...cand, x, y };
    return fits(map, t) && !overlaps(map, t, cand.id) ? t : null;
  };

  const exact = at(cand.x, cand.y);
  if (exact) return exact;

  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const hit = at(cand.x + dx, cand.y + dy);
        if (hit) return hit;
      }
    }
  }
  return null;
}

/** Kratki podłogi stykające się z odciskiem klocka. */
export function surroundingCells(map: StoreMap, b: MapBlock, walls: Uint8Array): number[] {
  const own = new Set(cellsOf(map, b));
  const out = new Set<number>();
  for (const c of own) {
    const cx = c % map.gridW;
    const cy = (c - cx) / map.gridW;
    const push = (nx: number, ny: number) => {
      if (!inBounds(map, nx, ny)) return;
      const ni = idx(nx, ny, map.gridW);
      if (own.has(ni) || walls[ni]) return;
      out.add(ni);
    };
    push(cx + 1, cy);
    push(cx - 1, cy);
    push(cx, cy + 1);
    push(cx, cy - 1);
  }
  return [...out];
}

/**
 * Punkty dostępu klocka, rozbite na sekcje.
 *
 * Regał dwustronny dzielimy wzdłuż jego dłuższej osi — po obrocie ta oś też jest
 * obrócona, więc podział działa tak samo dla skosu jak dla pionu. Kratkę
 * przypisujemy do strony po znaku iloczynu wektorowego względem tej osi.
 */
export function accessPoints(
  map: StoreMap,
  b: MapBlock,
  walls: Uint8Array
): { section: SectionKey; cells: number[] }[] {
  const a = b.sections ?? [];
  const bb = b.sectionsB ?? [];
  if (!a.length && !bb.length) return [];

  const around = surroundingCells(map, b, walls);
  if (!around.length) return [];

  // Klocek jednostronny: wszystkie kategorie sięga się z tych samych kratek.
  if (!bb.length) return a.map((section) => ({ section, cells: around }));

  const { cx, cy } = centerOf(b);
  const { ax, ay } = longAxis(b);
  const sideA: number[] = [];
  const sideB: number[] = [];
  for (const c of around) {
    const x = (c % map.gridW) + 0.5;
    const y = Math.floor(c / map.gridW) + 0.5;
    const cross = ax * (y - cy) - ay * (x - cx);
    (cross < 0 ? sideA : sideB).push(c);
  }

  const out: { section: SectionKey; cells: number[] }[] = [];
  if (sideA.length) for (const section of a) out.push({ section, cells: sideA });
  if (sideB.length) for (const section of bb) out.push({ section, cells: sideB });
  return out;
}

/** Wszystkie kategorie klocka, obie strony razem. */
export function allSections(b: MapBlock): SectionKey[] {
  return [...(b.sections ?? []), ...(b.sectionsB ?? [])];
}

export function sectionGroups(map: StoreMap): Map<SectionKey, number[]> {
  const walls = rasterize(map);
  const groups = new Map<SectionKey, number[]>();
  for (const b of map.blocks) {
    for (const { section, cells } of accessPoints(map, b, walls)) {
      const prev = groups.get(section);
      groups.set(section, prev ? [...prev, ...cells] : [...cells]);
    }
  }
  for (const [k, v] of groups) groups.set(k, [...new Set(v)]);
  return groups;
}

export function entranceCells(map: StoreMap): number[] {
  const out: number[] = [];
  for (const b of map.blocks) {
    if (b.type === 'wejscie') out.push(...cellsOf(map, b));
  }
  return [...new Set(out)];
}

export function checkoutCells(map: StoreMap): number[] {
  const walls = rasterize(map);
  const out: number[] = [];
  for (const b of map.blocks) {
    if (isCheckout(b.type)) out.push(...surroundingCells(map, b, walls));
  }
  return [...new Set(out)];
}


export function flood(map: StoreMap, walls: Uint8Array, sources: number[]): Uint8Array {
  const seen = new Uint8Array(map.gridW * map.gridH);
  const queue: number[] = [];
  for (const s of sources) {
    if (!walls[s] && !seen[s]) {
      seen[s] = 1;
      queue.push(s);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % map.gridW;
    const cy = (cur - cx) / map.gridW;
    const step = (nx: number, ny: number) => {
      if (!inBounds(map, nx, ny)) return;
      const ni = idx(nx, ny, map.gridW);
      if (walls[ni] || seen[ni]) return;
      seen[ni] = 1;
      queue.push(ni);
    };
    step(cx + 1, cy);
    step(cx - 1, cy);
    step(cx, cy + 1);
    step(cx, cy - 1);
  }
  return seen;
}

export type Validation = { ok: boolean; errors: string[]; warnings: string[] };

export function validate(map: StoreMap): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const walls = rasterize(map);
  const start = entranceCells(map);
  const end = checkoutCells(map);

  if (!start.length) errors.push('Brak wejścia.');
  if (!end.length) errors.push('Do kas nie da się podejść — nie mają wolnej kratki dookoła.');

  for (const b of map.blocks) {
    if (!fits(map, b)) {
      errors.push('Któryś klocek wystaje poza plan.');
      break;
    }
  }

  const withSection = map.blocks.filter((b) => allSections(b).length > 0);
  if (!withSection.length) warnings.push('Żaden regał nie ma jeszcze przypisanej sekcji.');
  for (const b of withSection) {
    if (!accessPoints(map, b, walls).length) {
      errors.push('Któryś regał nie ma wolnej kratki dookoła — nie da się do niego dojść.');
      break;
    }
  }

  if (start.length) {
    const reach = flood(map, walls, start);
    if (end.length && !end.some((c) => reach[c])) {
      errors.push('Od wejścia nie da się dojść do kas.');
    }
    const unreachable = [...sectionGroups(map).entries()].filter(
      ([, cells]) => !cells.some((c) => reach[c])
    );
    if (unreachable.length) {
      errors.push(
        `Sekcje odcięte od wejścia: ${unreachable.length}. Sprawdź, czy alejka nie jest zamurowana.`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function areaM2(map: StoreMap): number {
  return map.gridW * map.gridH * METERS_PER_CELL * METERS_PER_CELL;
}

export { normalizeAngle };
export type { Angle };
