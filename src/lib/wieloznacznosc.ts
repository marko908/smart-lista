/**
 * Frazy, które prowadzą do kilku regałów naraz.
 *
 * Człowiek pisze listę w biegu i pisze krótko: „płyn", „papier", „sos". Każde
 * z tych słów to w sklepie zupełnie inne miejsce — „płyn" bywa przy praniu,
 * przy zmywarce, przy naczyniach i w łazience. Zgadnięcie jednego z nich
 * i milczenie jest gorsze niż przyznanie się, że nie wiadomo: człowiek
 * dowiaduje się o pomyłce dopiero przy półce, a wtedy trasa jest już policzona.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TRZY RZECZY, KTÓRE TU DECYDUJĄ
 *
 * 1. Rozstrzygamy SEKCJĘ, nie produkt. „Jogurt" pasuje do dwustu jogurtów, ale
 *    wszystkie leżą w tym samym miejscu — więc nie ma o co pytać. Pytanie ma
 *    sens dopiero, gdy fraza rozpina się na kilka sekcji. To samo w sobie
 *    redukuje problem o rząd wielkości.
 *
 * 2. Tabela WYLICZA SIĘ z katalogu, nie jest pisana ręcznie. Gdyby była
 *    ręczna, rozjechałaby się z katalogiem przy pierwszym większym imporcie —
 *    a katalog ma rosnąć do tysięcy pozycji.
 *
 * 3. Liczy się tylko gołe słowo. „Płyn do prania" jest jednoznaczny i nikt nie
 *    powinien być o niego pytany; niejednoznaczny jest sam „płyn".
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Zawężanie do konkretnego sklepu robi `zawez()` — patrz komentarz tam, bo to
 * jest miejsce, w którym ta aplikacja ma przewagę nad zwykłą listą zakupów.
 */

import { PRODUCTS } from '../data/products';
import type { SectionKey } from '../data/sections';
import { normalize, stem, tokens } from './normalize';

export type Wieloznacznosc = {
  /** Gołe słowo, po którym rozpoznaliśmy problem — klucz do zapamiętania wyboru. */
  glowa: string;
  /** Sekcje, do których fraza może prowadzić. Zawsze co najmniej dwie. */
  sekcje: SectionKey[];
  /** Po kilka nazw z katalogu na sekcję — żeby wybór nie był zgadywanką. */
  przyklady: Record<string, string[]>;
  /**
   * Czy gołe słowo NIE ma własnej pozycji w katalogu.
   *
   * „Mleko" ma — jest osobną pozycją przypisaną do sekcji `mleko` — więc mimo
   * że głowa „mleko" prowadzi też do napojów roślinnych i do pieczenia,
   * domyślna odpowiedź jest oczywista i nie zawracamy nikomu głowy.
   * „Płyn" nie ma i dopiero tu trzeba pytać.
   */
  twarda: boolean;
};

/** Pierwszy wyraz frazy — po polsku rzeczownik zwykle stoi z przodu. */
function glowaFrazy(nazwa: string): string {
  return normalize(nazwa).split(' ')[0] ?? '';
}

type Wpis = { sekcje: Map<SectionKey, string[]>; kanoniczna: SectionKey | null };

/**
 * Indeks głów fraz. Budowany raz, przy starcie — tak samo jak indeks dopasowań
 * w `match.ts`, i tak samo tanio: jedno przejście po katalogu.
 */
const WEDLUG_GLOWY = new Map<string, Wpis>();
/** Rdzeń głowy → głowa. Żeby „płynu" i „płyny" trafiały tam, gdzie „płyn". */
const RDZEN_DO_GLOWY = new Map<string, string>();

for (const p of PRODUCTS) {
  const norm = normalize(p.name);
  const glowa = glowaFrazy(p.name);
  if (!glowa) continue;

  let wpis = WEDLUG_GLOWY.get(glowa);
  if (!wpis) {
    wpis = { sekcje: new Map(), kanoniczna: null };
    WEDLUG_GLOWY.set(glowa, wpis);
  }

  const lista = wpis.sekcje.get(p.section);
  if (lista) lista.push(p.name);
  else wpis.sekcje.set(p.section, [p.name]);

  // Jednowyrazowa nazwa to kanoniczne znaczenie tego słowa („mleko", „woda").
  if (norm === glowa && wpis.kanoniczna === null) wpis.kanoniczna = p.section;

  if (!RDZEN_DO_GLOWY.has(stem(glowa))) RDZEN_DO_GLOWY.set(stem(glowa), glowa);
}

// Aliasy też ustanawiają znaczenie kanoniczne: „pyry" to ziemniaki i nic więcej.
for (const p of PRODUCTS) {
  for (const alias of p.aliases) {
    const a = normalize(alias);
    if (!a || a.includes(' ')) continue;
    const wpis = WEDLUG_GLOWY.get(a);
    if (wpis && wpis.kanoniczna === null) wpis.kanoniczna = p.section;
  }
}

/**
 * Czy ta fraza jest wieloznaczna. `null`, gdy nie ma o co pytać.
 *
 * Warunek „jeden wyraz" jest tu istotny: dokładniejszy wpis sam się rozstrzyga
 * i pytanie o niego byłoby wyłącznie irytujące.
 */
export function wieloznacznosc(fraza: string): Wieloznacznosc | null {
  const tk = tokens(fraza);
  if (tk.length !== 1) return null;

  const slowo = tk[0];
  const glowa = WEDLUG_GLOWY.has(slowo) ? slowo : RDZEN_DO_GLOWY.get(stem(slowo));
  if (!glowa) return null;

  const wpis = WEDLUG_GLOWY.get(glowa);
  if (!wpis || wpis.sekcje.size < 2) return null;

  // Najpierw sekcja z największą liczbą pozycji w katalogu. To tanie przybliżenie
  // „najczęstszego znaczenia" — dopóki nie mamy danych o tym, co ludzie naprawdę
  // kupują, liczba wariantów w katalogu jest najlepszym dostępnym sygnałem.
  const sekcje = [...wpis.sekcje.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([s]) => s);

  // Znaczenie kanoniczne zawsze na przód — jeśli „mleko" jest osobną pozycją,
  // to ono jest domyślną odpowiedzią, choćby wariantów kokosowych było więcej.
  if (wpis.kanoniczna) {
    const i = sekcje.indexOf(wpis.kanoniczna);
    if (i > 0) {
      sekcje.splice(i, 1);
      sekcje.unshift(wpis.kanoniczna);
    }
  }

  const przyklady: Record<string, string[]> = {};
  for (const [sekcja, nazwy] of wpis.sekcje) przyklady[sekcja] = nazwy.slice(0, 3);

  return { glowa, sekcje, przyklady, twarda: wpis.kanoniczna === null };
}

/**
 * Zawężenie do sekcji, które ten konkretny sklep w ogóle ma.
 *
 * Tu ta aplikacja ma przewagę nad zwykłą listą zakupów: wie, jak wygląda sklep.
 * Jeśli w planie Lidla nie ma regału z produktami proteinowymi, to skyr może
 * leżeć wyłącznie przy jogurtach i nie ma o co pytać. Żaden sklep nie ma
 * wszystkich stu czterdziestu dziewięciu sekcji, więc większość
 * niejednoznaczności znika, gdy tylko wiadomo, dokąd człowiek idzie.
 *
 * Ta sama fraza bywa więc jednoznaczna w Biedronce i wieloznaczna w Kauflandzie.
 * To nie jest niekonsekwencja, tylko sedno rzeczy.
 *
 * Gdy sklepu nie ma (`dostepne === null`), nie ma czego zawężać — zostają
 * wszystkie sekcje.
 */
export function zawez(
  w: Wieloznacznosc,
  dostepne: ReadonlySet<SectionKey> | null
): SectionKey[] {
  if (!dostepne) return w.sekcje;
  const wspolne = w.sekcje.filter((s) => dostepne.has(s));
  // Gdy plan nie zawiera ŻADNEJ z sekcji kandydujących, zawężenie nie ma nic
  // do powiedzenia — lepiej pokazać pełen zestaw niż pustkę.
  return wspolne.length > 0 ? wspolne : w.sekcje;
}

/**
 * Klucz zapamiętanego wyboru.
 *
 * Wybór wisi na sklepie, bo „płyn" w drogerii i „płyn" w markecie to co innego.
 * Bez sklepu zapamiętujemy globalnie — lepsze to niż pytanie w kółko.
 */
export function kluczWyboru(storeId: string | null, fraza: string): string {
  const tk = tokens(fraza);
  const slowo = tk.length === 1 ? (RDZEN_DO_GLOWY.get(stem(tk[0])) ?? tk[0]) : normalize(fraza);
  return `${storeId ?? 'brak'}|${slowo}`;
}

/** Ile fraz w katalogu jest twardo wieloznacznych — do testów i diagnostyki. */
export function statystyka(): { glow: number; wieloznacznych: number; twardych: number } {
  let wieloznacznych = 0;
  let twardych = 0;
  for (const wpis of WEDLUG_GLOWY.values()) {
    if (wpis.sekcje.size < 2) continue;
    wieloznacznych++;
    if (wpis.kanoniczna === null) twardych++;
  }
  return { glow: WEDLUG_GLOWY.size, wieloznacznych, twardych };
}
