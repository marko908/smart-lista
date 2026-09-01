/**
 * Plus Code (Open Location Code) — zamiana na współrzędne.
 *
 * Administrator dodaje sklepy siedząc w domu, a nie stojąc w nich, więc
 * łapanie położenia z telefonu jest mu bezużyteczne. Za to Plus Code da się
 * skopiować z map jednym dotknięciem: „3HV9+FP Rybnik".
 *
 * Cały rachunek robimy NA MIEJSCU. Open Location Code to czysta arytmetyka na
 * siatce, nie usługa — nie ma po co pytać nikogo o zdanie ani płacić za
 * geokodowanie.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KODY SKRÓCONE POTRZEBUJĄ PUNKTU ODNIESIENIA
 *
 * Pełny kod („9F2RJHV9+FP") niesie całe położenie. Skrócony („3HV9+FP") ma
 * obcięte cztery pierwsze znaki i sam z siebie pasuje do wielu miejsc na
 * świecie — dopiero okolica rozstrzyga, o które chodzi. Nazwa miasta obok kodu
 * jest dla człowieka, nie dla maszyny: rozwiązanie jej wymagałoby usługi
 * geokodującej.
 *
 * Dlatego kod skrócony przyjmujemy tylko z podanym punktem odniesienia —
 * u nas jest nim ostatni sklep ze współrzędnymi. Kto dodaje sklepy w jednym
 * mieście, dostaje to za darmo; kto skacze po kraju, wkleja kod pełny.
 * ────────────────────────────────────────────────────────────────────────────
 */

const ALFABET = '23456789CFGHJMPQRVWX';
const SEPARATOR = '+';
const POZYCJA_SEPARATORA = 8;
const WYPELNIACZ = '0';
/** Ile stopni obejmuje pierwsza para znaków. */
const PIERWSZA_ROZDZIELCZOSC = 20;
const SIATKA_WIERSZE = 4;
const SIATKA_KOLUMNY = 5;
const DLUGOSC_PAR = 10;

export type Wspolrzedne = { szerokosc: number; dlugosc: number };

/**
 * Sam kod, bez nazwy miejscowości.
 *
 * Mapy Google podają go razem z okolicą: „3HV9+FP Rybnik". Nazwa jest dla
 * człowieka — maszynie mówi tyle co nic, bo rozwiązanie jej wymagałoby usługi
 * geokodującej. Bierzemy człon z plusem i resztę zostawiamy.
 */
function czysty(kod: string): string {
  const czlony = kod.trim().toUpperCase().split(/[\s,]+/);
  return (czlony.find((c) => c.includes(SEPARATOR)) ?? czlony[0] ?? '').trim();
}

/** Czy to w ogóle wygląda na Plus Code — pełny albo skrócony. */
export function wygladaNaPlusCode(tekst: string): boolean {
  const k = czysty(tekst);
  const i = k.indexOf(SEPARATOR);
  if (i < 0 || i > POZYCJA_SEPARATORA || i % 2 !== 0) return false;
  const znaki = k.replace(SEPARATOR, '').replace(new RegExp(WYPELNIACZ, 'g'), '');
  return znaki.length > 0 && [...znaki].every((z) => ALFABET.includes(z));
}

function czyPelny(kod: string): boolean {
  return kod.indexOf(SEPARATOR) === POZYCJA_SEPARATORA;
}

/** Środek obszaru opisanego pełnym kodem. */
function dekodujPelny(kod: string): Wspolrzedne {
  const znaki = kod.replace(SEPARATOR, '').replace(new RegExp(WYPELNIACZ + '+$'), '');

  let szerokosc = -90;
  let dlugosc = -180;
  let krokSzer = PIERWSZA_ROZDZIELCZOSC;
  let krokDl = PIERWSZA_ROZDZIELCZOSC;

  const par = Math.min(znaki.length, DLUGOSC_PAR);
  for (let i = 0; i < par; i += 2) {
    szerokosc += ALFABET.indexOf(znaki[i]) * krokSzer;
    dlugosc += ALFABET.indexOf(znaki[i + 1]) * krokDl;
    if (i + 2 < par) {
      krokSzer /= PIERWSZA_ROZDZIELCZOSC;
      krokDl /= PIERWSZA_ROZDZIELCZOSC;
    }
  }

  // Doprecyzowanie siatką 4×5 — znaki po dziesiątym.
  let siatkaSzer = krokSzer;
  let siatkaDl = krokDl;
  for (let i = DLUGOSC_PAR; i < znaki.length; i++) {
    siatkaSzer /= SIATKA_WIERSZE;
    siatkaDl /= SIATKA_KOLUMNY;
    const n = ALFABET.indexOf(znaki[i]);
    szerokosc += Math.floor(n / SIATKA_KOLUMNY) * siatkaSzer;
    dlugosc += (n % SIATKA_KOLUMNY) * siatkaDl;
    krokSzer = siatkaSzer;
    krokDl = siatkaDl;
  }

  // Zwracamy ŚRODEK pola, nie jego róg — inaczej każdy sklep siedziałby
  // systematycznie na południowy zachód od swojego prawdziwego miejsca.
  return { szerokosc: szerokosc + krokSzer / 2, dlugosc: dlugosc + krokDl / 2 };
}

/** Kod pełny dla punktu — potrzebny, żeby odtworzyć przedrostek kodu skróconego. */
function zakoduj(p: Wspolrzedne, dlugoscKodu = 10): string {
  let szer = Math.min(90, Math.max(-90, p.szerokosc)) + 90;
  let dl = ((p.dlugosc + 180) % 360 + 360) % 360;
  let kod = '';
  let krokSzer = PIERWSZA_ROZDZIELCZOSC;
  let krokDl = PIERWSZA_ROZDZIELCZOSC;

  for (let i = 0; i < dlugoscKodu; i += 2) {
    const a = Math.floor(szer / krokSzer);
    const b = Math.floor(dl / krokDl);
    kod += ALFABET[Math.min(a, ALFABET.length - 1)] + ALFABET[Math.min(b, ALFABET.length - 1)];
    szer -= Math.min(a, ALFABET.length - 1) * krokSzer;
    dl -= Math.min(b, ALFABET.length - 1) * krokDl;
    krokSzer /= PIERWSZA_ROZDZIELCZOSC;
    krokDl /= PIERWSZA_ROZDZIELCZOSC;
  }
  return kod.slice(0, POZYCJA_SEPARATORA) + SEPARATOR + kod.slice(POZYCJA_SEPARATORA);
}

/**
 * Zamiana Plus Code na współrzędne.
 *
 * `null`, gdy kod jest skrócony, a nie ma punktu odniesienia — bo wtedy
 * odpowiedź byłaby zgadywaniem, a zgadnięte położenie sklepu jest gorsze
 * niż jego brak.
 */
export function zPlusCode(tekst: string, odniesienie?: Wspolrzedne | null): Wspolrzedne | null {
  const kod = czysty(tekst);
  if (!wygladaNaPlusCode(kod)) return null;
  if (czyPelny(kod)) return dekodujPelny(kod);

  if (!odniesienie) return null;

  // Odtworzenie przedrostka z okolicy punktu odniesienia.
  const brakuje = POZYCJA_SEPARATORA - kod.indexOf(SEPARATOR);
  const zasieg = Math.pow(PIERWSZA_ROZDZIELCZOSC, 2 - brakuje / 2);
  const polowa = zasieg / 2;

  const przedrostek = zakoduj(odniesienie).replace(SEPARATOR, '').slice(0, brakuje);
  const p = dekodujPelny(przedrostek + kod);

  // Kod skrócony pasuje do wielu pól; wybieramy to najbliżej odniesienia.
  let szerokosc = p.szerokosc;
  let dlugosc = p.dlugosc;
  if (odniesienie.szerokosc - szerokosc > polowa && szerokosc + zasieg <= 90) szerokosc += zasieg;
  else if (szerokosc - odniesienie.szerokosc > polowa && szerokosc - zasieg >= -90) szerokosc -= zasieg;
  if (odniesienie.dlugosc - dlugosc > polowa) dlugosc += zasieg;
  else if (dlugosc - odniesienie.dlugosc > polowa) dlugosc -= zasieg;

  return { szerokosc, dlugosc };
}

/** „50.0968, 18.5412" albo „50,0968 18,5412" — para liczb wpisana z palca. */
export function zPary(tekst: string): Wspolrzedne | null {
  // Przecinek bywa i separatorem pary, i przecinkiem dziesiętnym. Rozstrzyga
  // to, ile liczb da się wyciągnąć — a nie sam znak.
  const liczby = tekst.match(/-?\d+(?:[.,]\d+)?/g);
  if (!liczby || liczby.length !== 2) return null;
  const [a, b] = liczby.map((x) => Number(x.replace(',', '.')));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { szerokosc: a, dlugosc: b };
}

/** Wpisane cokolwiek → współrzędne. Najpierw para liczb, potem Plus Code. */
export function naWspolrzedne(
  tekst: string,
  odniesienie?: Wspolrzedne | null
): Wspolrzedne | null {
  const t = tekst.trim();
  if (!t) return null;
  return zPary(t) ?? zPlusCode(t, odniesienie);
}
