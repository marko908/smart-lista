/**
 * Sortowanie listy zakupów według trasy przez sklep.
 *
 * Trzy źródła kolejności, w kolejności zaufania:
 *   1. plan 2D — trasa liczona algorytmem po rzeczywistej topologii
 *   2. marszruta — ręcznie ustawiona kolejność sekcji
 *   3. typowy układ sieci — podkładka, gdy sklep nie jest zmapowany
 */

import { chainOrder } from '../data/chains';
import { sectionName, type SectionKey } from '../data/sections';
import { computeRoute } from './route';
import type { ListItem, ShoppingList, Store } from './types';

export type RouteGroup = {
  section: SectionKey;
  name: string;
  items: ListItem[];
  /** Pozycja w trasie, licząc od 1. */
  step: number;
};

export type RouteSource = 'plan' | 'marszruta' | 'siec' | 'brak';

export type Route = {
  groups: RouteGroup[];
  source: RouteSource;
  /** Sekcje z listy, których dane źródło nie zna — trafiają na koniec. */
  unknownCount: number;
  /** Łamana do narysowania na planie. Tylko przy źródle 'plan'. */
  path: number[] | null;
  /** Długość trasy w kratkach. Tylko przy źródle 'plan'. */
  cost: number | null;
  /** Czy kolejność jest dokładnie optymalna. Tylko przy źródle 'plan'. */
  exact: boolean;
};

function sectionsIn(list: ShoppingList): SectionKey[] {
  return [...new Set(list.items.map((i) => i.section))];
}

/**
 * Grupuje pozycje listy w sekcje i układa je w kolejności trasy.
 * Odhaczone zostają w swoich grupach — znikanie ich w trakcie zakupów
 * gubi kontekst i ludzie tracą orientację, gdzie są.
 */
export function buildRoute(list: ShoppingList, store: Store | null): Route {
  const needed = sectionsIn(list);

  let order: SectionKey[] = [];
  let source: RouteSource = 'brak';
  let path: number[] | null = null;
  let cost: number | null = null;
  let exact = false;

  if (store?.map) {
    const computed = computeRoute(store.map, needed);
    if (computed) {
      order = computed.order;
      source = 'plan';
      path = computed.path;
      cost = computed.cost;
      exact = computed.exact;
    }
  }

  if (source === 'brak' && store && store.walkOrder.length > 0) {
    order = store.walkOrder;
    source = 'marszruta';
  }
  if (source === 'brak' && store) {
    order = chainOrder(store.chain);
    source = 'siec';
  }

  const rank = new Map<SectionKey, number>();
  order.forEach((s, i) => rank.set(s, i));

  const bySection = new Map<SectionKey, ListItem[]>();
  for (const item of list.items) {
    const arr = bySection.get(item.section);
    if (arr) arr.push(item);
    else bySection.set(item.section, [item]);
  }

  let unknownCount = 0;
  const entries = [...bySection.entries()].map(([section, items]) => {
    const r = rank.get(section);
    if (r === undefined) unknownCount += items.length;
    return { section, items, rank: r ?? Number.MAX_SAFE_INTEGER };
  });

  entries.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return sectionName(a.section).localeCompare(sectionName(b.section), 'pl');
  });

  const groups: RouteGroup[] = entries.map((e, i) => ({
    section: e.section,
    name: sectionName(e.section),
    items: e.items,
    step: i + 1,
  }));

  return { groups, source, unknownCount, path, cost, exact };
}

export function remaining(list: ShoppingList): number {
  return list.items.filter((i) => !i.checked).length;
}

/** Pierwsza grupa z niezaznaczonymi pozycjami — „gdzie teraz jesteś". */
export function currentGroup(route: Route): RouteGroup | null {
  return route.groups.find((g) => g.items.some((i) => !i.checked)) ?? null;
}

export function nextGroup(route: Route): RouteGroup | null {
  const current = currentGroup(route);
  if (!current) return null;
  return route.groups.slice(current.step).find((g) => g.items.some((i) => !i.checked)) ?? null;
}
