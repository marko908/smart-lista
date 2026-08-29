/**
 * Silnik trasy: od planu sklepu do kolejności sekcji i narysowanej ścieżki.
 *
 * Liczy się w całości na urządzeniu, bez sieci — w sklepach zasięg jest fatalny.
 * Przy siatce 18×26 (468 kratek) i kilkunastu sekcjach to ułamek milisekundy,
 * więc trasę można przeliczać po każdym odhaczeniu produktu.
 *
 * Kroki: rasteryzacja → punkty dostępu → macierz odległości (BFS wielopunktowy)
 * → kolejność (Held-Karp albo najbliższy sąsiad z 2-opt) → ścieżka do narysowania.
 */

import type { SectionKey } from '../data/sections';
import { checkoutCells, entranceCells, rasterize, sectionGroups, type StoreMap } from './mapModel';

/** Powyżej tylu sekcji rezygnujemy z rozwiązania dokładnego. */
const EXACT_LIMIT = 13;
const UNREACHABLE = -1;

export type ComputedRoute = {
  /** Sekcje w kolejności odwiedzania. */
  order: SectionKey[];
  /** Sekcje, do których nie da się dojść albo których nie ma na planie. */
  unreachable: SectionKey[];
  /** Pełna łamana do narysowania — indeksy kratek. */
  path: number[];
  /** Długość trasy w kratkach. */
  cost: number;
  /** Czy kolejność jest dokładnie optymalna, czy przybliżona. */
  exact: boolean;
};

/**
 * BFS wielopunktowy. Siatka jest nieważona, więc BFS daje wynik dokładny
 * i jest tańszy od Dijkstry.
 */
function bfs(
  gridW: number,
  gridH: number,
  walls: Uint8Array,
  sources: number[]
): { dist: Int32Array; prev: Int32Array } {
  const n = gridW * gridH;
  const dist = new Int32Array(n).fill(UNREACHABLE);
  const prev = new Int32Array(n).fill(UNREACHABLE);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  for (const s of sources) {
    if (s < 0 || s >= n || walls[s] || dist[s] !== UNREACHABLE) continue;
    dist[s] = 0;
    queue[tail++] = s;
  }

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % gridW;
    const cy = (cur - cx) / gridW;
    const d = dist[cur] + 1;

    const step = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) return;
      const ni = ny * gridW + nx;
      if (walls[ni] || dist[ni] !== UNREACHABLE) return;
      dist[ni] = d;
      prev[ni] = cur;
      queue[tail++] = ni;
    };
    step(cx + 1, cy);
    step(cx - 1, cy);
    step(cx, cy + 1);
    step(cx, cy - 1);
  }

  return { dist, prev };
}

/** Najbliższa komórka z celu wraz z odległością. */
function closest(dist: Int32Array, targets: number[]): { cell: number; d: number } | null {
  let best: { cell: number; d: number } | null = null;
  for (const c of targets) {
    const d = dist[c];
    if (d === UNREACHABLE) continue;
    if (!best || d < best.d) best = { cell: c, d };
  }
  return best;
}

/**
 * Reprezentant sekcji — jedna kratka, do której „idzie się po produkt".
 *
 * Bez tego macierz odległości mierzyłaby dystans między NAJBLIŻSZYMI kratkami
 * dwóch sekcji. Regał ma kilkanaście kratek dostępu, więc dwie sąsiednie alejki
 * wychodziły oddalone o 2 kratki, choć trzeba przejść całą ich długość.
 * Koszt był zaniżony, a kolejność bywała przez to gorsza niż mogła być.
 *
 * Bierzemy kratkę środkową — to uczciwy proxy na „produkt leży gdzieś na półce".
 */
function representative(cells: number[], gridW: number): number | undefined {
  const sorted = [...cells].sort((a, b) => {
    const ay = Math.floor(a / gridW), by = Math.floor(b / gridW);
    return ay !== by ? ay - by : (a % gridW) - (b % gridW);
  });
  return sorted[Math.floor(sorted.length / 2)];
}

/** Odtworzenie ścieżki z tablicy poprzedników, od źródła BFS do komórki. */
function tracePath(prev: Int32Array, to: number): number[] {
  const out: number[] = [];
  let cur = to;
  while (cur !== UNREACHABLE) {
    out.push(cur);
    cur = prev[cur];
  }
  return out.reverse();
}

/**
 * Otwarty problem komiwojażera: start w wejściu, koniec w kasach,
 * po drodze wszystkie potrzebne sekcje.
 *
 * `d[i][j]` obejmuje węzły 0..n-1 (sekcje) plus start i meta podane osobno.
 */
function solveOrder(
  n: number,
  fromStart: number[],
  between: number[][],
  toEnd: number[]
): { order: number[]; cost: number; exact: boolean } {
  if (n === 0) return { order: [], cost: 0, exact: true };
  if (n === 1) return { order: [0], cost: fromStart[0] + toEnd[0], exact: true };

  if (n <= EXACT_LIMIT) {
    return { ...heldKarp(n, fromStart, between, toEnd), exact: true };
  }
  return { ...nearestPlus2opt(n, fromStart, between, toEnd), exact: false };
}

function heldKarp(
  n: number,
  fromStart: number[],
  between: number[][],
  toEnd: number[]
): { order: number[]; cost: number } {
  const size = 1 << n;
  const INF = Number.MAX_SAFE_INTEGER;
  const dp = new Float64Array(size * n).fill(INF);
  const parent = new Int32Array(size * n).fill(-1);

  for (let i = 0; i < n; i++) dp[(1 << i) * n + i] = fromStart[i];

  for (let mask = 1; mask < size; mask++) {
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      const cur = dp[mask * n + i];
      if (cur === INF) continue;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        const nextMask = mask | (1 << j);
        const cand = cur + between[i][j];
        if (cand < dp[nextMask * n + j]) {
          dp[nextMask * n + j] = cand;
          parent[nextMask * n + j] = i;
        }
      }
    }
  }

  const full = size - 1;
  let bestCost = INF;
  let bestLast = 0;
  for (let i = 0; i < n; i++) {
    const c = dp[full * n + i];
    if (c === INF) continue;
    const total = c + toEnd[i];
    if (total < bestCost) {
      bestCost = total;
      bestLast = i;
    }
  }

  const order: number[] = [];
  let mask = full;
  let cur = bestLast;
  while (cur !== -1) {
    order.push(cur);
    const p = parent[mask * n + cur];
    mask ^= 1 << cur;
    cur = p;
  }
  order.reverse();

  return { order, cost: bestCost };
}

function nearestPlus2opt(
  n: number,
  fromStart: number[],
  between: number[][],
  toEnd: number[]
): { order: number[]; cost: number } {
  const unused = new Set<number>();
  for (let i = 0; i < n; i++) unused.add(i);

  const order: number[] = [];
  let cur = -1;
  while (unused.size) {
    let best = -1;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const c of unused) {
      const d = cur === -1 ? fromStart[c] : between[cur][c];
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    order.push(best);
    unused.delete(best);
    cur = best;
  }

  const total = (o: number[]): number => {
    let sum = fromStart[o[0]];
    for (let i = 0; i < o.length - 1; i++) sum += between[o[i]][o[i + 1]];
    return sum + toEnd[o[o.length - 1]];
  };

  // 2-opt: odwracanie fragmentów, dopóki cokolwiek się poprawia.
  let cost = total(order);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 60) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        const c = total(cand);
        if (c < cost - 1e-9) {
          order.splice(0, order.length, ...cand);
          cost = c;
          improved = true;
        }
      }
    }
  }

  return { order, cost };
}

/**
 * Policz trasę przez sklep dla zadanych sekcji.
 * Zwraca null, gdy plan nie nadaje się do liczenia (brak wejścia albo kas).
 */
export function computeRoute(map: StoreMap, needed: SectionKey[]): ComputedRoute | null {
  const startCells = entranceCells(map);
  const endCells = checkoutCells(map);
  if (!startCells.length || !endCells.length) return null;

  const walls = rasterize(map);
  const groups = sectionGroups(map);

  // Start i meta też sprowadzamy do jednej kratki, żeby koszt był policzalny
  // i zgodny z tym, co widać narysowane.
  const startCell = representative(startCells.filter((c) => !walls[c]), map.gridW);
  if (startCell === undefined) return null;

  const wanted: { section: SectionKey; rep: number }[] = [];
  const unreachable: SectionKey[] = [];
  for (const s of needed) {
    const cells = groups.get(s);
    if (cells && cells.length) wanted.push({ section: s, rep: representative(cells, map.gridW)! });
    else unreachable.push(s);
  }

  const startField = bfs(map.gridW, map.gridH, walls, [startCell]);
  if (!closest(startField.dist, endCells)) return null;

  // Meta jest zbiorem, nie punktem: trasa kończy się przy TEJ kasie, która
  // wypadnie najbliżej ostatniej sekcji. Przypięcie mety z góry (np. do kasy
  // najbliższej wejściu) potrafiło wydłużyć trasę bardziej, niż wynosił zysk
  // z optymalnej kolejności.
  const endField = bfs(map.gridW, map.gridH, walls, endCells);

  const live = wanted.filter((g) => {
    if (startField.dist[g.rep] !== UNREACHABLE) return true;
    unreachable.push(g.section);
    return false;
  });

  const fields = live.map((g) => bfs(map.gridW, map.gridH, walls, [g.rep]));
  const n = live.length;
  const fromStart = live.map((g) => startField.dist[g.rep]);
  const toEnd = live.map((g) => {
    const d = endField.dist[g.rep];
    return d === UNREACHABLE ? 1e6 : d;
  });
  const between: number[][] = live.map((_, i) =>
    live.map((g, j) => {
      if (i === j) return 0;
      const d = fields[i].dist[g.rep];
      return d === UNREACHABLE ? 1e6 : d;
    })
  );

  const solved = solveOrder(n, fromStart, between, toEnd);
  const order = solved.order.map((i) => live[i].section);

  const path: number[] = [];
  let cursor = startCell;
  const appendLeg = (targets: number[]): void => {
    const field = bfs(map.gridW, map.gridH, walls, [cursor]);
    const hit = closest(field.dist, targets);
    if (!hit) return;
    const leg = tracePath(field.prev, hit.cell);
    path.push(...(path.length ? leg.slice(1) : leg));
    cursor = hit.cell;
  };

  for (const i of solved.order) appendLeg([live[i].rep]);
  appendLeg(endCells);

  const cost = path.length > 0 ? path.length - 1 : 0;
  return { order, unreachable, path, cost, exact: solved.exact };
}

/**
 * Długość trasy dla NARZUCONEJ kolejności sekcji.
 *
 * Służy do pokazania, ile daje liczenie trasy: porównujemy koszt kolejności
 * wpisywania z kosztem kolejności optymalnej. Bez tej liczby cała obietnica
 * produktu jest gołosłowna.
 */
export function costForOrder(map: StoreMap, order: SectionKey[]): number | null {
  const startCells = entranceCells(map);
  const endCells = checkoutCells(map);
  if (!startCells.length || !endCells.length) return null;

  const walls = rasterize(map);
  const groups = sectionGroups(map);
  const startCell = representative(startCells.filter((c) => !walls[c]), map.gridW);
  if (startCell === undefined) return null;

  let cursor = startCell;
  let total = 0;

  for (const s of order) {
    const cells = groups.get(s);
    if (!cells || !cells.length) continue;
    const rep = representative(cells, map.gridW);
    if (rep === undefined) continue;
    const field = bfs(map.gridW, map.gridH, walls, [cursor]);
    if (field.dist[rep] === UNREACHABLE) continue;
    total += field.dist[rep];
    cursor = rep;
  }

  const last = bfs(map.gridW, map.gridH, walls, [cursor]);
  const hit = closest(last.dist, endCells);
  return hit ? total + hit.d : null;
}
