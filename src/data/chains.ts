/**
 * Sieci handlowe i typowa kolejność sekcji.
 *
 * Podkładka na zimny start: dopóki nikt nie zmapował konkretnego sklepu, lista
 * i tak jest sortowana według typowego układu. Nie jest to idealne, ale wyraźnie
 * lepsze od kolejności wpisywania i działa od pierwszego dnia w całej Polsce.
 *
 * Kolejność bierzemy wprost z katalogu sekcji — jest tam wypisana w takiej
 * kolejności, w jakiej mija się działy w typowym sklepie. Osobne listy na sieć
 * były tylko czterema kopiami tego samego, które rozjeżdżały się przy każdej
 * zmianie katalogu.
 */

import { CATALOG_ORDER, type SectionKey } from './sections';

export type ChainKey =
  | 'lidl' | 'biedronka' | 'kaufland' | 'aldi' | 'dino'
  | 'auchan' | 'carrefour' | 'netto' | 'stokrotka' | 'zabka' | 'inny';

export type Chain = { key: ChainKey; name: string };

export const CHAINS: Chain[] = [
  { key: 'lidl', name: 'Lidl' },
  { key: 'biedronka', name: 'Biedronka' },
  { key: 'kaufland', name: 'Kaufland' },
  { key: 'aldi', name: 'Aldi' },
  { key: 'dino', name: 'Dino' },
  { key: 'auchan', name: 'Auchan' },
  { key: 'carrefour', name: 'Carrefour' },
  { key: 'netto', name: 'Netto' },
  { key: 'stokrotka', name: 'Stokrotka' },
  { key: 'zabka', name: 'Żabka' },
  { key: 'inny', name: 'Inny sklep' },
];

export const CHAIN_BY_KEY: Record<ChainKey, Chain> = Object.fromEntries(
  CHAINS.map((c) => [c.key, c])
) as Record<ChainKey, Chain>;

/** Przesuwa sekcję na wskazane miejsce, zachowując resztę kolejności. */
function moveBefore(order: SectionKey[], what: SectionKey, before: SectionKey): SectionKey[] {
  const out = order.filter((k) => k !== what);
  const at = out.indexOf(before);
  if (at < 0) return [...out, what];
  out.splice(at, 0, what);
  return out;
}

/**
 * Typowa kolejność sekcji dla sieci.
 *
 * Różnice między sieciami są drobne i sprowadzają się do kilku przesunięć —
 * w Lidlu i Aldi aleja środkowa wpada w połowie drogi, a nie na końcu.
 */
export function chainOrder(chain: ChainKey): SectionKey[] {
  if (chain === 'lidl' || chain === 'aldi') {
    return moveBefore(CATALOG_ORDER, 'aleja-srodkowa', 'woda');
  }
  return CATALOG_ORDER;
}

export function chainName(chain: ChainKey): string {
  return CHAIN_BY_KEY[chain]?.name ?? 'Sklep';
}
