/**
 * Format pliku sklepu — jeden sklep to jeden plik.
 *
 * Plik z dysku to dane, którym nie wolno ufać na słowo: może być z innej wersji
 * aplikacji, ręcznie edytowany albo po prostu nie ten. Dlatego parsowanie jest
 * pełną walidacją, a nie rzutowaniem typu — błędny plik ma dać czytelny komunikat,
 * a nie wywalić aplikację przy pierwszym rysowaniu planu.
 */

import { footprintFits, type Angle } from './geometry';
import { normalizeType } from '../data/blocks';
import { CHAIN_BY_KEY, type ChainKey } from '../data/chains';
import { CATALOG_VERSION, normalizeSection, type SectionKey } from '../data/sections';
import type { MapBlock, StoreMap } from './mapModel';
import type { Store } from './types';

export const FILE_FORMAT = 'alejka.store';
export const FILE_VERSION = 1;
export const FILE_EXT = '.alejka.json';

export type StoreFile = {
  format: typeof FILE_FORMAT;
  version: number;
  exportedAt: string;
  catalogVersion: number;
  store: {
    name: string;
    chain: ChainKey;
    map: StoreMap | null;
    walkOrder: SectionKey[];
  };
};

export function serializeStore(store: Store): string {
  const payload: StoreFile = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    catalogVersion: CATALOG_VERSION,
    store: {
      name: store.name,
      chain: store.chain,
      map: store.map,
      walkOrder: store.walkOrder,
    },
  };
  return JSON.stringify(payload, null, 2);
}

/** Nazwa pliku z nazwy sklepu — bez ogonków, bez spacji, jeden sklep jeden plik. */
export function fileNameFor(store: { name: string; chain: ChainKey }): string {
  const slug = store.name
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => 'acelnoszz'['ąćęłńóśźż'.indexOf(c)])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${slug || store.chain}${FILE_EXT}`;
}

export type ParseResult =
  | { ok: true; store: Omit<Store, 'id' | 'createdAt'>; warnings: string[] }
  | { ok: false; error: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseBlock(raw: unknown, gridW: number, gridH: number, i: number): MapBlock | string {
  if (!isObj(raw)) return `Klocek ${i + 1} nie jest obiektem.`;
  const { id, type, x, y, w, h, section, sectionB } = raw;

  const kind = typeof type === 'string' ? normalizeType(type) : null;
  if (!kind) return `Klocek ${i + 1} ma nieznany typ: „${String(type)}".`;
  for (const [key, val] of Object.entries({ x, y, w, h })) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || !Number.isInteger(val)) {
      return `Klocek ${i + 1}: pole ${key} musi być nieujemną liczbą całkowitą.`;
    }
  }
  const nx = x as number, ny = y as number, nw = w as number, nh = h as number;
  if (nw < 1 || nh < 1) return `Klocek ${i + 1} ma zerowy rozmiar.`;

  /**
   * Kategorie: nowy format trzyma listy, starszy pojedyncze pola.
   * Czytamy oba, a nieznane klucze tłumaczymy — plik z „nabiałem" ma się
   * wczytać jako mleko, a nie polecieć w kosz.
   */
  const readList = (list: unknown, single: unknown, label: string): SectionKey[] | string => {
    const out: SectionKey[] = [];
    const items = Array.isArray(list) ? list : single === undefined || single === null ? [] : [single];
    for (const v of items) {
      if (typeof v !== 'string') return `Klocek ${i + 1}: kategoria ${label} nie jest tekstem.`;
      const norm = normalizeSection(v);
      if (!norm) return `Klocek ${i + 1}: nieznana kategoria ${label} — „${v}".`;
      if (!out.includes(norm)) out.push(norm);
    }
    return out;
  };
  const a = readList((raw as Record<string, unknown>).sections, section, 'A');
  if (typeof a === 'string') return a;
  const bb = readList((raw as Record<string, unknown>).sectionsB, sectionB, 'B');
  if (typeof bb === 'string') return bb;

  // Obrót: tolerujemy brak (starsze pliki) i dociągamy do wielokrotności 45.
  const rawRot = (raw as Record<string, unknown>).rot;
  const rot = typeof rawRot === 'number' && Number.isFinite(rawRot)
    ? (((Math.round(rawRot / 45) * 45) % 360) + 360) % 360
    : 0;

  /**
   * Mieszczenie się w planie liczymy PO obrocie, tą samą funkcją co edytor.
   *
   * Wcześniej sprawdzaliśmy surowy prostokąt `x + w > gridW`, ignorując obrót.
   * Lodówka 2×1 obrócona o 90° przy prawej ścianie zajmuje jedną kratkę wszerz
   * i dwie wzdłuż — edytor pozwalał ją tam postawić, a import tego samego pliku
   * ją odrzucał. Dwie definicje słowa „mieści się" to była pułapka na własne
   * pliki, nie zabezpieczenie.
   */
  if (!footprintFits({ x: nx, y: ny, w: nw, h: nh, rot: rot as Angle }, gridW, gridH)) {
    return `Klocek ${i + 1} wystaje poza plan.`;
  }

  return {
    id: typeof id === 'string' && id ? id : `blk_${i}`,
    type: kind,
    rot: rot as MapBlock['rot'],
    x: nx,
    y: ny,
    w: nw,
    h: nh,
    sections: a,
    sectionsB: bb,
  };
}

export function parseStoreFile(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'To nie jest poprawny plik JSON.' };
  }
  if (!isObj(raw)) return { ok: false, error: 'Plik nie zawiera obiektu.' };
  if (raw.format !== FILE_FORMAT) {
    return { ok: false, error: 'To nie jest plik sklepu Alejki.' };
  }
  if (typeof raw.version !== 'number' || raw.version > FILE_VERSION) {
    return {
      ok: false,
      error: `Plik pochodzi z nowszej wersji aplikacji (format ${String(raw.version)}). Zaktualizuj Alejkę.`,
    };
  }
  if (!isObj(raw.store)) return { ok: false, error: 'Plik nie zawiera danych sklepu.' };

  const s = raw.store;
  const warnings: string[] = [];

  if (typeof s.name !== 'string' || !s.name.trim()) {
    return { ok: false, error: 'Sklep nie ma nazwy.' };
  }
  if (typeof s.chain !== 'string' || !(s.chain in CHAIN_BY_KEY)) {
    return { ok: false, error: `Nieznana sieć: „${String(s.chain)}".` };
  }

  if (typeof raw.catalogVersion === 'number' && raw.catalogVersion !== CATALOG_VERSION) {
    warnings.push(
      `Plik zapisano z katalogiem sekcji w wersji ${raw.catalogVersion}, a aplikacja ma ${CATALOG_VERSION}. Sprawdź, czy sekcje się zgadzają.`
    );
  }

  let map: StoreMap | null = null;
  if (s.map !== null && s.map !== undefined) {
    if (!isObj(s.map)) return { ok: false, error: 'Plan sklepu jest uszkodzony.' };
    const { gridW, gridH, blocks } = s.map;
    if (
      typeof gridW !== 'number' || typeof gridH !== 'number' ||
      !Number.isInteger(gridW) || !Number.isInteger(gridH) ||
      gridW < 2 || gridH < 2 || gridW > 200 || gridH > 200
    ) {
      return { ok: false, error: 'Plan ma nieprawidłowy rozmiar siatki.' };
    }
    if (!Array.isArray(blocks)) return { ok: false, error: 'Plan nie zawiera listy klocków.' };

    const parsed: MapBlock[] = [];
    const seenIds = new Set<string>();
    for (let i = 0; i < blocks.length; i++) {
      const b = parseBlock(blocks[i], gridW, gridH, i);
      if (typeof b === 'string') return { ok: false, error: b };
      if (seenIds.has(b.id)) b.id = `${b.id}_${i}`;
      seenIds.add(b.id);
      parsed.push(b);
    }
    map = { gridW, gridH, blocks: parsed };
  }

  const walkOrder: SectionKey[] = [];
  if (Array.isArray(s.walkOrder)) {
    for (const k of s.walkOrder) {
      const norm = typeof k === 'string' ? normalizeSection(k) : null;
      if (norm) walkOrder.push(norm);
      else warnings.push(`Pominięto nieznaną sekcję w marszrucie: „${String(k)}".`);
    }
  }

  return {
    ok: true,
    warnings,
    store: {
      name: s.name.trim(),
      chain: s.chain as ChainKey,
      map,
      walkOrder,
      mappedAt: map || walkOrder.length ? new Date().toISOString() : null,
    },
  };
}
