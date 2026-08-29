/**
 * Dopasowanie wpisanego tekstu do produktu z katalogu, a przez to do sekcji.
 *
 * Kolejność prób, od najpewniejszej do najluźniejszej:
 *   1. dokładne trafienie w nazwę lub alias
 *   2. trafienie po rdzeniach (odmiana: „mleka" → „mleko")
 *   3. przedrostek (użytkownik jeszcze pisze)
 *   4. odległość edycyjna ≤ 2 (literówki)
 *
 * Czego nie rozpozna, dostaje sekcję „inne" — świadomie, bez zgadywania.
 * Zgadywanie na tym etapie kosztuje więcej niż uczciwe „nie wiem",
 * bo użytkownik i tak może przypisać sekcję ręcznie jednym gestem.
 */

import { PRODUCTS, type Product } from '../data/products';
import type { SectionKey } from '../data/sections';
import { editDistance, normalize, stemmed, tokens } from './normalize';

type Entry = {
  product: Product;
  norm: string;
  stem: string;
  /** wszystkie warianty do dokładnego trafienia: nazwa + aliasy */
  exact: string[];
};

const INDEX: Entry[] = PRODUCTS.map((product) => {
  const norm = normalize(product.name);
  return {
    product,
    norm,
    stem: stemmed(product.name),
    exact: [norm, ...product.aliases.map(normalize)],
  };
});

const BY_EXACT = new Map<string, Product>();
for (const e of INDEX) {
  for (const key of e.exact) {
    if (!BY_EXACT.has(key)) BY_EXACT.set(key, e.product);
  }
}

const BY_STEM = new Map<string, Product>();
for (const e of INDEX) {
  if (!BY_STEM.has(e.stem)) BY_STEM.set(e.stem, e.product);
}

export type MatchQuality = 'dokładne' | 'odmiana' | 'przedrostek' | 'literówka' | 'brak';

export type MatchResult = {
  product: Product | null;
  section: SectionKey;
  quality: MatchQuality;
};

export function matchProduct(raw: string): MatchResult {
  const norm = normalize(raw);
  if (!norm) return { product: null, section: 'inne', quality: 'brak' };

  const exact = BY_EXACT.get(norm);
  if (exact) return { product: exact, section: exact.section, quality: 'dokładne' };

  const st = stemmed(raw);
  const byStem = BY_STEM.get(st);
  if (byStem) return { product: byStem, section: byStem.section, quality: 'odmiana' };

  // przedrostek — najkrótsza pasująca nazwa wygrywa, bo jest najbardziej ogólna
  if (norm.length >= 3) {
    let best: Entry | null = null;
    for (const e of INDEX) {
      if (e.norm.startsWith(norm) && (!best || e.norm.length < best.norm.length)) best = e;
    }
    if (best) return { product: best.product, section: best.product.section, quality: 'przedrostek' };
  }

  // literówka — tylko dla wpisów dość długich, żeby nie mylić krótkich słów
  if (norm.length >= 4) {
    const limit = norm.length <= 5 ? 1 : 2;
    let best: { e: Entry; d: number } | null = null;
    for (const e of INDEX) {
      const d = editDistance(norm, e.norm, limit);
      if (d <= limit && (!best || d < best.d)) best = { e, d };
    }
    if (best) return { product: best.e.product, section: best.e.product.section, quality: 'literówka' };
  }

  // wielowyrazowe: spróbuj po ostatnim rzeczowniku („duże jajka wiejskie" → „jajka")
  const tk = tokens(raw);
  if (tk.length > 1) {
    for (let i = tk.length - 1; i >= 0; i--) {
      const single = matchSingle(tk[i]);
      if (single) return { product: single, section: single.section, quality: 'odmiana' };
    }
  }

  return { product: null, section: 'inne', quality: 'brak' };
}

function matchSingle(token: string): Product | null {
  return BY_EXACT.get(token) ?? BY_STEM.get(stemOf(token)) ?? null;
}

function stemOf(token: string): string {
  return stemmed(token);
}

/** Podpowiedzi do pola wpisywania. */
export function suggest(raw: string, limit = 8): Product[] {
  const norm = normalize(raw);
  if (norm.length < 2) return [];

  const starts: Product[] = [];
  const contains: Product[] = [];

  for (const e of INDEX) {
    if (e.norm.startsWith(norm)) starts.push(e.product);
    else if (e.norm.includes(norm) || e.exact.some((x) => x.includes(norm))) contains.push(e.product);
    if (starts.length >= limit) break;
  }

  const seen = new Set<string>();
  return [...starts, ...contains]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, limit);
}
