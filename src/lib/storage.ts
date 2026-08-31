/**
 * Stan aplikacji i zapis lokalny.
 *
 * Wszystko żyje na urządzeniu — w sklepie zasięg jest fatalny, a aplikacja,
 * która wymaga sieci w środku Biedronki, jest bezużyteczna. Backend dochodzi
 * dopiero w fazie 4 i będzie synchronizacją, nie źródłem prawdy.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext } from 'react';
import { normalizeType } from '../data/blocks';
import { normalizeSection, type SectionKey } from '../data/sections';
import type { MapBlock } from './mapModel';
import type { AppState, Nagrobek, Store } from './types';
import { EMPTY_STATE } from './types';

// v2: kasy i wejscie przestaly byc punktami, staly sie klockami z rozmiarem.
// Stare plany nie dadza sie odczytac, wiec zaczynamy od czystego.
const KEY = 'alejka:state:v2';

/**
 * Migracja zapisanych planów.
 *
 * Model klocków się zmienia: kasy samoobsługowe scaliły się ze zwykłymi,
 * doszedł obrót. Zapis na urządzeniu pamięta stary kształt i bez tłumaczenia
 * aplikacja wywala się przy pierwszym rysowaniu planu — bo pyta o definicję
 * typu, którego już nie ma.
 *
 * Migrujemy zamiast kasować, bo po drugiej stronie jest czyjaś praca.
 */
/**
 * Kategorie klocka. Nowy zapis trzyma listy, stary pojedyncze pola —
 * czytamy oba, żeby nikomu nie zniknęły przypisania z wcześniejszych planów.
 */
function readSections(list: unknown, single: unknown): SectionKey[] {
  const out: SectionKey[] = [];
  const push = (v: unknown) => {
    if (typeof v !== 'string') return;
    const norm = normalizeSection(v);
    if (norm && !out.includes(norm)) out.push(norm);
  };
  if (Array.isArray(list)) list.forEach(push);
  else push(single);
  return out;
}

function migrateBlock(raw: unknown): MapBlock | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Record<string, unknown>;
  const type = typeof b.type === 'string' ? normalizeType(b.type) : null;
  if (!type) return null;

  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const rawRot = num(b.rot, 0);

  return {
    id: typeof b.id === 'string' && b.id ? b.id : `blk_${Math.random().toString(36).slice(2, 8)}`,
    type,
    x: num(b.x, 0),
    y: num(b.y, 0),
    w: Math.max(1, num(b.w, 1)),
    h: Math.max(1, num(b.h, 1)),
    rot: ((((Math.round(rawRot / 45) * 45) % 360) + 360) % 360) as MapBlock['rot'],
    sections: readSections(b.sections, b.section),
    sectionsB: readSections(b.sectionsB, b.sectionB),
  };
}

export function migrateStore(raw: unknown): Store | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== 'string' || typeof s.name !== 'string') return null;

  let map = null as Store['map'];
  const m = s.map as Record<string, unknown> | null | undefined;
  if (m && typeof m === 'object' && Array.isArray(m.blocks)) {
    const blocks = m.blocks.map(migrateBlock).filter((b): b is MapBlock => b !== null);
    map = {
      gridW: typeof m.gridW === 'number' ? m.gridW : 40,
      gridH: typeof m.gridH === 'number' ? m.gridH : 28,
      blocks,
    };
  }

  return { ...(s as unknown as Store), map };
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      stores: Array.isArray(parsed.stores)
        ? parsed.stores.map(migrateStore).filter((s): s is Store => s !== null)
        : [],
      lists: Array.isArray(parsed.lists) ? parsed.lists : [],
      // Zapisy sprzed rozstrzygania fraz wieloznacznych nie mają tego pola.
      wybory:
        parsed.wybory && typeof parsed.wybory === 'object' ? (parsed.wybory as AppState['wybory']) : {},
      // Ani zapisy sprzed synchronizacji tego.
      nagrobki: Array.isArray(parsed.nagrobki) ? parsed.nagrobki : [],
    };
  } catch {
    // Uszkodzony zapis nie może zablokować startu aplikacji.
    return EMPTY_STATE;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Zapis lokalny jest wygodą, nie kontraktem — brak miejsca nie wywala apki.
  }
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/**
 * Ostemplowanie zmian czasem i zostawienie śladu po skasowanych.
 *
 * Wszystkie zmiany stanu przechodzą przez jedno `update`, więc porównanie
 * „przed" z „po" załatwia obie rzeczy naraz i żadne miejsce wywołania nie musi
 * o nich pamiętać. Gdyby stempel trzeba było stawiać ręcznie, ktoś kiedyś by
 * zapomniał — i ta jedna lista przestałaby się synchronizować bez żadnego
 * widocznego objawu.
 *
 * Porównujemy przez JSON, bo dokumenty są małe (kilka list po kilkanaście
 * pozycji), a porównanie pole po polu trzeba by poprawiać przy każdej zmianie
 * modelu.
 */
export function ostempluj(prev: AppState, next: AppState): AppState {
  const teraz = new Date().toISOString();

  function stempluj<T extends { id: string; zmieniono?: string }>(
    stare: T[],
    nowe: T[]
  ): T[] {
    const wgId = new Map(stare.map((d) => [d.id, d] as const));
    return nowe.map((d) => {
      const poprzedni = wgId.get(d.id);
      if (poprzedni && JSON.stringify(poprzedni) === JSON.stringify(d)) return d;
      return { ...d, zmieniono: teraz };
    });
  }

  // Ślad zostawiamy tylko po dokumentach, które baza w ogóle widziała.
  // Lista skasowana przed pierwszą synchronizacją nie ma czego kasować.
  function nagrobki<T extends { id: string; zdalneId?: string | null }>(
    stare: T[],
    nowe: T[],
    tabela: Nagrobek['tabela']
  ): Nagrobek[] {
    const zostaly = new Set(nowe.map((d) => d.id));
    return stare
      .filter((d) => !zostaly.has(d.id) && d.zdalneId)
      .map((d) => ({ zdalneId: d.zdalneId as string, tabela }));
  }

  return {
    ...next,
    stores: stempluj(prev.stores, next.stores),
    lists: stempluj(prev.lists, next.lists),
    nagrobki: [
      ...(next.nagrobki ?? []),
      ...nagrobki(prev.stores, next.stores, 'sklepy'),
      ...nagrobki(prev.lists, next.lists, 'listy'),
    ],
  };
}

export type StoreApi = {
  state: AppState;
  ready: boolean;
  update: (fn: (prev: AppState) => AppState) => void;
};

export const AppStateContext = createContext<StoreApi | null>(null);

export function useApp(): StoreApi {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useApp musi być wywołane wewnątrz <AppProvider>');
  return ctx;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
