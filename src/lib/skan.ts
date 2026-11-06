/**
 * Skan sklepu spacerem — z nagrania robimy szkic planu.
 *
 * Telefon wisi na klatce piersiowej i co sekundę robi zdjęcie. Obok zdjęć
 * zapisujemy licznik kroków i kurs z kompasu. Z tego składamy dwie rzeczy:
 *
 *   1. TRASĘ — gdzie stał człowiek przy każdej klatce. Kroki × długość kroku
 *      w kierunku z kompasu. Kompas w sklepie wariuje (metalowe regały,
 *      lodówki), więc kurs przyciągamy do czterech kierunków głównych sklepu:
 *      alejki są równoległe i prostopadłe, nikt nie chodzi po skosie.
 *   2. SZKIC PLANU — z etykiet klatek („po lewej mleko, po prawej jogurty")
 *      stawiamy klocki po obu stronach trasy. Szkic jest punktem wyjścia do
 *      poprawek w edytorze, nie gotowym planem.
 *
 * Rozpoznawanie kategorii na zdjęciach dzieje się poza tym plikiem (model
 * wizyjny). Tu jest tylko czysta geometria, bez Reacta i bez sieci —
 * żeby dało się ją przetestować i uruchomić z narzędzia na komputerze.
 */

import { BLOCK_BY_KEY, typeForSections } from '../data/blocks';
import { isSectionKey, type SectionKey } from '../data/sections';
import type { MapBlock, StoreMap } from './mapModel';

export const SKAN_FORMAT = 'alejka.skan';
export const SKAN_VERSION = 1;

/** Odczyt czujników. `kroki` rośnie od zera od początku nagrania. */
export type SkanProbka = { t: number; kroki: number; kurs: number | null };
export type SkanKlatka = { t: number; plik: string };

export type SkanSesja = {
  format: typeof SKAN_FORMAT;
  version: number;
  start: string;
  /** Metry na krok. Domyślnie 0,7 — przeciętny spacerowy krok dorosłego. */
  dlugoscKroku: number;
  probki: SkanProbka[];
  klatki: SkanKlatka[];
};

/** Co widać na klatce, po lewej i po prawej stronie alejki. */
export type Etykieta = { lewo: SectionKey[]; prawo: SectionKey[] };

/** Kierunek względem głównej osi sklepu: 0 = „przód", 1 = prawo, 2 = tył, 3 = lewo. */
export type Kierunek = 0 | 1 | 2 | 3;

export type PunktTrasy = { t: number; x: number; y: number; kier: Kierunek };

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

/**
 * Główna oś sklepu z kursów ważonych krokami.
 *
 * Mnożymy kąt przez 4, żeby kierunki różniące się o 90° stały się tym samym
 * kątem, uśredniamy wektorowo i dzielimy z powrotem. Wychodzi kąt, do którego
 * „pasują" wszystkie alejki naraz — niezależnie od tego, jak sklep jest
 * obrócony względem północy.
 */
export function osSklepu(probki: SkanProbka[]): number {
  let s = 0;
  let c = 0;
  for (let i = 1; i < probki.length; i++) {
    const kurs = probki[i].kurs;
    const dk = probki[i].kroki - probki[i - 1].kroki;
    if (kurs === null || dk <= 0) continue;
    const r = (kurs * Math.PI) / 180;
    s += dk * Math.sin(4 * r);
    c += dk * Math.cos(4 * r);
  }
  if (s === 0 && c === 0) return 0;
  const deg = ((Math.atan2(s, c) * 180) / Math.PI) / 4;
  return ((deg % 90) + 90) % 90;
}

function przyciagnij(kurs: number, os: number): Kierunek {
  const k = Math.round((((kurs - os) % 360) + 360) % 360 / 90) % 4;
  return k as Kierunek;
}

/**
 * Trasa: pozycja w metrach dla każdej próbki czujników.
 *
 * Krótkie zmiany kierunku (mniej niż `minKrokow` kroków) traktujemy jako
 * szum kompasu albo rozglądanie się i doklejamy do poprzedniego odcinka.
 */
export function trasa(sesja: SkanSesja, minKrokow = 3): PunktTrasy[] {
  const pr = sesja.probki;
  if (!pr.length) return [];
  const os = osSklepu(pr);

  // Kierunek na każdy odcinek między próbkami; brak kursu = poprzedni kierunek.
  const kier: Kierunek[] = [];
  let ostatni: Kierunek = 0;
  for (let i = 0; i < pr.length; i++) {
    const k = pr[i].kurs;
    if (k !== null) ostatni = przyciagnij(k, os);
    kier.push(ostatni);
  }

  // Wygładzanie: biegi krótsze niż minKrokow kroków przejmują kierunek poprzedniego biegu.
  const wyg = [...kier];
  let i = 1;
  while (i < pr.length) {
    let j = i;
    while (j + 1 < pr.length && kier[j + 1] === kier[i]) j++;
    const kroki = pr[j].kroki - pr[i - 1].kroki;
    if (kier[i] !== wyg[i - 1] && kroki < minKrokow) {
      for (let q = i; q <= j; q++) wyg[q] = wyg[i - 1];
    }
    i = j + 1;
  }

  const L = sesja.dlugoscKroku > 0 ? sesja.dlugoscKroku : 0.7;
  const out: PunktTrasy[] = [{ t: pr[0].t, x: 0, y: 0, kier: wyg[0] }];
  for (let q = 1; q < pr.length; q++) {
    const dk = Math.max(0, pr[q].kroki - pr[q - 1].kroki);
    const k = wyg[q];
    const p = out[q - 1];
    out.push({ t: pr[q].t, x: p.x + DX[k] * dk * L, y: p.y + DY[k] * dk * L, kier: k });
  }
  return out;
}

/**
 * Skleja dwa strumienie czujników w próbki.
 *
 * Kompas odzywa się często i równo. Krokomierz w iPhonie przeciwnie: oddaje
 * licznik paczkami co kilka sekund. Gdyby przypisać całą paczkę kroków do
 * kursu z chwili jej nadejścia, każdy zakręt między paczkami by przepadł.
 * Dlatego licznik kroków rozkładamy liniowo w czasie między odczytami
 * i podpinamy pod każdy odczyt kompasu.
 */
export function polaczCzujniki(
  kursy: { t: number; kurs: number }[],
  kroki: { t: number; kroki: number }[]
): SkanProbka[] {
  const kr = [{ t: 0, kroki: 0 }, ...kroki].sort((a, b) => a.t - b.t);
  const krokiW = (t: number) => {
    if (t >= kr[kr.length - 1].t) return kr[kr.length - 1].kroki;
    for (let i = 1; i < kr.length; i++) {
      if (t <= kr[i].t) {
        const a = kr[i - 1];
        const b = kr[i];
        const u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
        return a.kroki + (b.kroki - a.kroki) * u;
      }
    }
    return 0;
  };
  const out: SkanProbka[] = [...kursy]
    .sort((a, b) => a.t - b.t)
    .map((k) => ({ t: k.t, kroki: krokiW(k.t), kurs: k.kurs }));
  // Kroki po ostatnim odczycie kompasu też się liczą.
  const ost = kr[kr.length - 1];
  if (!out.length || ost.t > out[out.length - 1].t) {
    out.push({ t: ost.t, kroki: ost.kroki, kurs: out.length ? out[out.length - 1].kurs : null });
  }
  return out;
}

/** Pozycja w chwili t — interpolacja liniowa między próbkami. */
export function pozycjaW(tr: PunktTrasy[], t: number): PunktTrasy | null {
  if (!tr.length) return null;
  if (t <= tr[0].t) return tr[0];
  for (let i = 1; i < tr.length; i++) {
    if (t <= tr[i].t) {
      const a = tr[i - 1];
      const b = tr[i];
      const u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return { t, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, kier: b.kier };
    }
  }
  return tr[tr.length - 1];
}

type Komorka = { x: number; y: number };
type Odcinek = {
  /** Kratki regału w kolejności przejścia. */
  kratki: Komorka[];
  sekcje: SectionKey[];
};

/** Najczęstsze kategorie, najwyżej `ile`, w kolejności częstości. */
function najczestsze(listy: SectionKey[][], ile: number): SectionKey[] {
  const licz = new Map<SectionKey, number>();
  for (const l of listy) for (const s of l) licz.set(s, (licz.get(s) ?? 0) + 1);
  return [...licz.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ile)
    .map(([s]) => s);
}

/**
 * Szkic planu z trasy i etykiet klatek.
 *
 * Regał stoi półtora metra od środka alejki, po lewej albo prawej stronie
 * kierunku marszu. Kolejne klatki z tą samą główną kategorią sklejamy
 * w jeden klocek. Gdy regał z drugiej alejki trafia w te same kratki, to jest
 * ten sam regał oglądany z drugiej strony — dopisujemy kategorie jako stronę B.
 */
export function szkicPlanu(
  sesja: SkanSesja,
  etykiety: Record<string, Etykieta>,
  opcje: { odstep?: number; margines?: number } = {}
): { map: StoreMap; walkOrder: SectionKey[]; ostrzezenia: string[] } {
  const odstep = opcje.odstep ?? 1.5;
  const margines = opcje.margines ?? 2;
  const ostrzezenia: string[] = [];
  const tr = trasa(sesja);

  const walkOrder: SectionKey[] = [];
  const dodajDoKolejnosci = (s: SectionKey) => {
    if (!walkOrder.includes(s)) walkOrder.push(s);
  };

  // Odcinki per strona; nowy odcinek, gdy zmienia się kierunek albo główna kategoria.
  const odcinki: Odcinek[] = [];
  const biezacy: Record<'lewo' | 'prawo', { kier: number; glowna: SectionKey | null; o: Odcinek | null; listy: SectionKey[][] }> = {
    lewo: { kier: -1, glowna: null, o: null, listy: [] },
    prawo: { kier: -1, glowna: null, o: null, listy: [] },
  };
  const zamknij = (strona: 'lewo' | 'prawo') => {
    const b = biezacy[strona];
    if (b.o && b.o.kratki.length) {
      b.o.sekcje = najczestsze(b.listy, 2);
      odcinki.push(b.o);
    }
    b.o = null;
    b.listy = [];
    b.glowna = null;
  };

  let pominiete = 0;
  for (const k of sesja.klatki) {
    const e = etykiety[k.plik];
    const p = pozycjaW(tr, k.t);
    if (!p) continue;
    if (!e) {
      pominiete++;
      continue;
    }
    for (const strona of ['lewo', 'prawo'] as const) {
      const sekcje = e[strona].filter(isSectionKey);
      sekcje.forEach(dodajDoKolejnosci);
      const b = biezacy[strona];
      if (!sekcje.length) {
        zamknij(strona);
        continue;
      }
      if (b.kier !== p.kier || (b.glowna && !sekcje.includes(b.glowna))) zamknij(strona);
      b.kier = p.kier;
      if (!b.o) {
        b.o = { kratki: [], sekcje: [] };
        b.glowna = sekcje[0];
      }
      // Normalna w lewo od kierunku marszu to kierunek (kier + 3) % 4.
      const n = strona === 'lewo' ? (p.kier + 3) % 4 : (p.kier + 1) % 4;
      const kr = { x: Math.floor(p.x + DX[n] * odstep), y: Math.floor(p.y + DY[n] * odstep) };
      const ost = b.o.kratki[b.o.kratki.length - 1];
      if (!ost || ost.x !== kr.x || ost.y !== kr.y) b.o.kratki.push(kr);
      b.listy.push(sekcje);
    }
  }
  zamknij('lewo');
  zamknij('prawo');
  if (pominiete) ostrzezenia.push(`${pominiete} klatek bez etykiety pominięto.`);

  // Zakres planu: trasa + regały, z marginesem.
  const xs: number[] = tr.map((p) => Math.floor(p.x));
  const ys: number[] = tr.map((p) => Math.floor(p.y));
  for (const o of odcinki) for (const k of o.kratki) { xs.push(k.x); ys.push(k.y); }
  if (!xs.length) xs.push(0), ys.push(0);
  const x0 = Math.min(...xs) - margines;
  const y0 = Math.min(...ys) - margines;
  const gridW = Math.max(10, Math.max(...xs) - x0 + 1 + margines);
  const gridH = Math.max(10, Math.max(...ys) - y0 + 1 + margines);

  const zajete = new Map<string, MapBlock>();
  const klucz = (x: number, y: number) => `${x},${y}`;
  const blocks: MapBlock[] = [];
  let seq = 0;

  for (const o of odcinki) {
    // Odcinek wzdłuż jednej osi: prostokąt 1×n obejmujący jego kratki.
    const ox = o.kratki.map((k) => k.x - x0);
    const oy = o.kratki.map((k) => k.y - y0);
    let bx = Math.min(...ox), by = Math.min(...oy);
    let bw = Math.max(...ox) - bx + 1, bh = Math.max(...oy) - by + 1;
    // Rozjechane kratki (szum na granicy kratek) ściskamy do grubości 1.
    if (bw >= bh) { by = Math.round(oy.reduce((a, b) => a + b, 0) / oy.length); bh = 1; }
    else { bx = Math.round(ox.reduce((a, b) => a + b, 0) / ox.length); bw = 1; }

    const kratki: string[] = [];
    for (let x = bx; x < bx + bw; x++) for (let y = by; y < by + bh; y++) kratki.push(klucz(x, y));

    // Ten sam regał z drugiej strony? Wystarczy, że połowa kratek jest już zajęta.
    const trafione = kratki.map((k) => zajete.get(k)).filter((b): b is MapBlock => !!b);
    if (trafione.length * 2 >= kratki.length) {
      const cel = najczestszyBlok(trafione);
      for (const s of o.sekcje) if (!cel.sections.includes(s) && !cel.sectionsB.includes(s)) cel.sectionsB.push(s);
      // Dwustronny klocek o grubości 1 — „regał" wymaga dwóch kratek głębokości.
      if (cel.sectionsB.length) cel.type = 'klocek';
      continue;
    }
    if (trafione.length) continue; // częściowa kolizja: zostawiamy do poprawki w edytorze

    const blk: MapBlock = {
      id: `skan_${++seq}`,
      type: typeForSections(o.sekcje, [], 'klocek'),
      x: bx, y: by, w: bw, h: bh, rot: 0,
      sections: [...o.sekcje],
      sectionsB: [],
    };
    // Niektóre typy mają minimalny rozmiar większy niż 1 kratka — wtedy zwykły klocek.
    const [ma, mb] = BLOCK_BY_KEY[blk.type].min;
    if (Math.min(bw, bh) < Math.min(ma, mb) || Math.max(bw, bh) < Math.max(ma, mb)) blk.type = 'klocek';
    blocks.push(blk);
    for (const k of kratki) zajete.set(k, blk);
  }

  // Wejście na początku trasy, kasy na końcu.
  const start = tr[0] ?? { x: 0, y: 0 };
  const meta = tr[tr.length - 1] ?? start;
  const stala = (type: 'wejscie' | 'kasy', px: number, py: number): MapBlock => {
    const [w, h] = BLOCK_BY_KEY[type].size;
    const x = Math.min(Math.max(0, Math.floor(px) - x0 - Math.floor(w / 2)), gridW - w);
    const y = Math.min(Math.max(0, Math.floor(py) - y0 - Math.floor(h / 2)), gridH - h);
    return { id: `skan_${type}`, type, x, y, w, h, rot: 0, sections: [], sectionsB: [] };
  };
  blocks.unshift(stala('wejscie', start.x, start.y), stala('kasy', meta.x, meta.y));

  return { map: { gridW, gridH, blocks }, walkOrder, ostrzezenia };
}

function najczestszyBlok(bl: MapBlock[]): MapBlock {
  const licz = new Map<MapBlock, number>();
  for (const b of bl) licz.set(b, (licz.get(b) ?? 0) + 1);
  return [...licz.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Walidacja pliku sesji — plik przychodzi z telefonu, więc nie ufamy mu na słowo. */
export function parseSesja(text: string): { ok: true; sesja: SkanSesja } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'To nie jest plik JSON.' };
  }
  const r = raw as Partial<SkanSesja>;
  if (!r || r.format !== SKAN_FORMAT) return { ok: false, error: 'To nie jest plik skanu Alejki.' };
  if (!Array.isArray(r.probki) || !Array.isArray(r.klatki)) return { ok: false, error: 'Brak próbek albo klatek.' };
  const probki = r.probki.filter(
    (p): p is SkanProbka =>
      !!p && typeof p.t === 'number' && typeof p.kroki === 'number' && (p.kurs === null || typeof p.kurs === 'number')
  );
  const klatki = r.klatki.filter((k): k is SkanKlatka => !!k && typeof k.t === 'number' && typeof k.plik === 'string');
  return {
    ok: true,
    sesja: {
      format: SKAN_FORMAT,
      version: typeof r.version === 'number' ? r.version : SKAN_VERSION,
      start: typeof r.start === 'string' ? r.start : '',
      dlugoscKroku: typeof r.dlugoscKroku === 'number' && r.dlugoscKroku > 0 ? r.dlugoscKroku : 0.7,
      probki: probki.sort((a, b) => a.t - b.t),
      klatki: klatki.sort((a, b) => a.t - b.t),
    },
  };
}

/**
 * Własny licznik kroków z akcelerometru.
 *
 * Krokomierz iPhone'a oddaje kroki z opóźnieniem i paczkami, a przy kilku
 * krokach potrafi nie oddać nic. Telefon na klatce piersiowej podskakuje
 * przy każdym kroku, więc kroki widać wprost w przyspieszeniu: odejmujemy
 * wolno zmieniającą się grawitację i liczymy wyraźne szczyty, nie częściej
 * niż co `minOdstep` sekund (szybki marsz to ok. 2,5 kroku na sekundę).
 *
 * `mag` to długość wektora przyspieszenia w g (spoczynek ≈ 1).
 */
export function detektorKrokow(prog = 0.12, minOdstep = 0.3) {
  let g = 1;
  let gotowy = true;
  let ostatni = -Infinity;
  let kroki = 0;
  return (t: number, mag: number): number => {
    g = g * 0.95 + mag * 0.05;
    const v = mag - g;
    if (gotowy && v > prog && t - ostatni >= minOdstep) {
      kroki++;
      ostatni = t;
      gotowy = false;
    }
    if (v < 0) gotowy = true;
    return kroki;
  };
}
