/**
 * Gotowe układy sklepu do edycji.
 *
 * Puste płótno to najgorszy start: człowiek nie wie, od czego zacząć, i rezygnuje.
 * Dużo łatwiej jest POPRAWIAĆ niż TWORZYĆ — dlatego nowy sklep dostaje od razu
 * rozsądny układ typowego dyskontu, a mapowanie sprowadza się do przesunięcia
 * regałów tam, gdzie faktycznie stoją, i poprawienia sekcji.
 *
 * Skala: 40×28 kratek to około 1120 m², czyli sala sprzedaży zmierzonego Lidla
 * po odjęciu magazynu i zaplecza.
 */

import type { BlockType } from './blocks';
import type { SectionKey } from './sections';
import type { MapBlock, StoreMap } from '../lib/mapModel';

type Spec = [
  type: BlockType,
  x: number,
  y: number,
  w: number,
  h: number,
  section?: SectionKey | null,
  sectionB?: SectionKey | null,
];

/**
 * Typowy dyskont: świeże przy wejściu, alejki przez środek, lodówki przy ścianach,
 * mroźnie przed kasami. Regały dwustronne mają różne sekcje po obu stronach —
 * to właśnie ta informacja odróżnia dobrą trasę od średniej.
 */
const DISCOUNT_SPEC: Spec[] = [
  // stałe punkty
  ['wejscie', 2, 27, 3, 1],
  ['kasy', 24, 23, 3, 5],

  // pas świeżych wzdłuż górnej ściany
  ['stoisko', 2, 1, 12, 2, 'warzywa'],
  ['lada', 16, 1, 6, 2, 'piekarnia'],
  ['regal-scienny', 24, 1, 12, 2, 'pieczywo-pakowane'],

  // lewa ściana
  ['regal-scienny', 0, 5, 2, 12, 'napoje-gazowane'],
  ['regal-scienny', 0, 18, 2, 4, 'woda'],

  // alejki przez środek, regały dwustronne
  ['regal', 5, 5, 2, 14, 'makarony', 'czekolady'],
  ['regal', 10, 5, 2, 14, 'konserwy-warzywne', 'chipsy'],
  ['regal', 15, 5, 2, 14, 'przyprawy', 'oleje'],
  ['regal', 20, 5, 2, 14, 'platki', 'kawa'],
  ['regal', 25, 5, 2, 14, 'pranie', 'czyszczenie'],
  ['regal', 30, 5, 2, 14, 'kapiel', 'pielegnacja-twarzy'],

  // lady obsługowe przy prawej stronie
  ['lada', 34, 5, 4, 2, 'wedliny-lada'],
  ['lodowka', 34, 9, 4, 2, 'mieso-swieze'],
  ['lodowka', 34, 13, 4, 2, 'ryby-swieze'],

  // prawa ściana — chłodnie
  ['lodowka', 38, 5, 2, 10, 'mleko'],
  ['regal-scienny', 38, 16, 2, 3, 'jaja'],

  // mroźnie i aleja środkowa przed kasami
  ['zamrazarka', 6, 20, 4, 2, 'mrozone-warzywa'],
  ['zamrazarka', 12, 20, 3, 2, 'lody'],
  ['stoisko', 18, 20, 6, 2, 'aleja-srodkowa'],
];

let counter = 0;
function mk(spec: Spec): MapBlock {
  const [type, x, y, w, h, section, sectionB] = spec;
  counter += 1;
  return {
    id: `${type}_${counter}`,
    type,
    x,
    y,
    w,
    h,
    rot: 0,
    sections: section ? [section] : [],
    sectionsB: sectionB ? [sectionB] : [],
  };
}

/** Gotowy układ typowego dyskontu — punkt wyjścia do poprawiania. */
export function createStarterMap(): StoreMap {
  return { gridW: 40, gridH: 28, blocks: DISCOUNT_SPEC.map(mk) };
}

/** Same wejście i kasy — dla kogoś, kto woli zacząć od zera. */
export function createBareMap(): StoreMap {
  return {
    gridW: 40,
    gridH: 28,
    blocks: [mk(['wejscie', 2, 27, 3, 1]), mk(['kasy', 24, 23, 3, 5])],
  };
}

/** Ile sekcji obsadza gotowy układ — do pokazania w interfejsie. */
export function starterSectionCount(): number {
  const set = new Set<SectionKey>();
  for (const [, , , , , a, b] of DISCOUNT_SPEC) {
    if (a) set.add(a);
    if (b) set.add(b);
  }
  return set.size;
}
