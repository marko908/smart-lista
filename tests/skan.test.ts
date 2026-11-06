declare const process: { exit(code: number): never };

import { detektorKrokow, osSklepu, parseSesja, polaczCzujniki, szkicPlanu, trasa, type Etykieta, type SkanSesja } from '../src/lib/skan';
import { parseStoreFile, serializeStore } from '../src/lib/mapFile';
import type { SectionKey } from '../src/data/sections';

let fail = 0;
function ok(label: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'OK  ' : 'BLAD'}  ${label}${extra ? '   ' + extra : ''}`);
}

// Powtarzalny „losowy" szum kompasu.
let ziarno = 7;
function los() {
  ziarno = (ziarno * 1103515245 + 12345) % 2147483648;
  return ziarno / 2147483648;
}

/**
 * Wąż przez trzy alejki: 10 m w górę, 3 m w prawo, 10 m w dół, 3 m w prawo, 10 m w górę.
 * Sklep obrócony o 37° względem północy, kompas szumi ±20°, krok 0,7 m, próbka co sekundę.
 */
const OBROT = 37;
const nogi: [number, number][] = [[0, 10], [90, 3], [180, 10], [90, 3], [0, 10]];
const sesja: SkanSesja = {
  format: 'alejka.skan',
  version: 1,
  start: '2026-11-05T12:00:00Z',
  dlugoscKroku: 0.7,
  probki: [{ t: 0, kroki: 0, kurs: OBROT }],
  klatki: [],
};
const etykiety: Record<string, Etykieta> = {};
const alejki: [SectionKey[], SectionKey[]][] = [
  [['warzywa'], ['pieczywo-swieze']],
  [[], []],
  [['mleko'], ['jogurty']],
  [[], []],
  [['makarony'], ['czekolady']],
];
let t = 0;
let kroki = 0;
nogi.forEach(([kier, metry], n) => {
  const ileKrokow = Math.round(metry / 0.7);
  for (let s = 0; s < ileKrokow; s++) {
    t += 1;
    kroki += 1;
    sesja.probki.push({ t, kroki, kurs: (OBROT + kier + (los() * 40 - 20) + 360) % 360 });
    const plik = `f${t}.jpg`;
    sesja.klatki.push({ t, plik });
    etykiety[plik] = { lewo: alejki[n][0], prawo: alejki[n][1] };
  }
});

console.log('--- os i trasa ---');
const os = osSklepu(sesja.probki);
ok('os sklepu ~37°', Math.abs(os - OBROT) < 6, os.toFixed(1));

const tr = trasa(sesja);
const kon = tr[tr.length - 1];
ok('koniec trasy ~6 m w prawo', Math.abs(kon.x - 6) < 1.5, kon.x.toFixed(2));
ok('koniec trasy ~10 m w górę', Math.abs(kon.y + 10) < 1.5, kon.y.toFixed(2));
ok('trasa tylko po osiach', tr.every((p, i) => i === 0 || p.x === tr[i - 1].x || p.y === tr[i - 1].y));

console.log('--- szkic planu ---');
const { map, walkOrder, ostrzezenia } = szkicPlanu(sesja, etykiety);
ok('kolejność przejścia', walkOrder.join(',') === 'warzywa,pieczywo-swieze,mleko,jogurty,makarony,czekolady', walkOrder.join(','));
ok('wejście i kasy są', map.blocks.some((b) => b.type === 'wejscie') && map.blocks.some((b) => b.type === 'kasy'));
ok('brak ostrzeżeń', ostrzezenia.length === 0, ostrzezenia.join(' '));
const zSekcja = map.blocks.filter((b) => b.sections.length);
ok('są regały z kategoriami', zSekcja.length >= 4, String(zSekcja.length));
// Alejki co 3 m, regały 1,5 m od środka: prawa strona alejki 1 to lewa strona alejki 2.
const dwustronny = map.blocks.find((b) => b.sectionsB.length > 0);
ok('wspólny regał między alejkami jest dwustronny', !!dwustronny, dwustronny ? `${dwustronny.sections}|${dwustronny.sectionsB}` : '');

const plik = serializeStore({
  id: 'x', name: 'Skan testowy', chain: 'lidl', createdAt: '', mappedAt: '', walkOrder, map,
} as never);
const wczyt = parseStoreFile(plik);
ok('szkic wczytuje się jak zwykły plik sklepu', wczyt.ok, wczyt.ok ? '' : wczyt.error);

console.log('--- zgubione przejścia między alejkami ---');
{
  // Ten sam wąż, ale kroków w bok nie ma (przerwa w nagraniu przy zawracaniu).
  const bezBoku: SkanSesja = {
    ...sesja,
    probki: (() => {
      const out = [{ t: 0, kroki: 0, kurs: OBROT as number | null }];
      let tt = 0;
      let kk = 0;
      for (const [kier, metry] of nogi) {
        const n = Math.round(metry / 0.7);
        for (let s = 0; s < n; s++) {
          tt += 1;
          if (kier !== 90) kk += 1;
          out.push({ t: tt, kroki: kk, kurs: (OBROT + kier + 360) % 360 });
        }
      }
      return out;
    })(),
  };
  const bez = trasa(bezBoku);
  ok('bez dopowiadania alejki leżą na sobie', Math.abs(bez[bez.length - 1].x) < 0.5, bez[bez.length - 1].x.toFixed(1));
  const z = trasa(bezBoku, 3, 3);
  const kz = z[z.length - 1];
  ok('z rozstawem 3 m alejki rozsunięte o 2×3 m', Math.abs(kz.x - 6) < 0.5 && Math.abs(kz.y + 10) < 1.5, `${kz.x.toFixed(1)},${kz.y.toFixed(1)}`);
  ok('dopowiadanie po osiach', z.every((p, i) => i === 0 || p.x === z[i - 1].x || p.y === z[i - 1].y));
  const zDobrej = trasa(sesja, 3, 3);
  ok('dobra trasa bez dopowiadania', zDobrej.length === sesja.probki.length);
}

console.log('--- krokomierz paczkami ---');
// 10 s w górę, 10 s w prawo, 1 krok/s; krokomierz odzywa się co 5 s.
const kursy = Array.from({ length: 21 }, (_, i) => ({ t: i, kurs: i < 10 ? 0 : 90 }));
const paczki = [5, 10, 15, 20].map((t) => ({ t, kroki: t }));
const pr = polaczCzujniki(kursy, paczki);
const tr2 = trasa({ ...sesja, probki: pr, dlugoscKroku: 1 });
const k2 = tr2[tr2.length - 1];
ok('zakręt między paczkami nie ginie', Math.abs(k2.x - 10) < 1.1 && Math.abs(k2.y + 10) < 1.1, `${k2.x.toFixed(1)},${k2.y.toFixed(1)}`);

console.log('--- detektor kroków ---');
{
  // 10 s marszu: 2 kroki/s, podskok 0,25 g, do tego drobny szum; potem 5 s stania.
  const det = detektorKrokow();
  let n = 0;
  for (let i = 0; i < 15 * 50; i++) {
    const t = i / 50;
    const ruch = t < 10 ? 0.25 * Math.sin(2 * Math.PI * 2 * t) : 0;
    n = det(t, 1 + ruch + (los() - 0.5) * 0.04);
  }
  ok('detektor liczy ~20 kroków', Math.abs(n - 20) <= 2, String(n));
}

console.log('--- plik sesji ---');
ok('zły plik odrzucony', !parseSesja('{"format":"inny"}').ok);
const p = parseSesja(JSON.stringify(sesja));
ok('dobry plik przyjęty', p.ok && p.sesja.klatki.length === sesja.klatki.length);

if (fail) {
  console.log(`\n${fail} błędów`);
  process.exit(1);
}
console.log('\nwszystko OK');
