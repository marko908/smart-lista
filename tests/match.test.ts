declare const process: { exit(code: number): never };

/**
 * Dopasowanie: poprawnosc i KOSZT.
 *
 * Koszt jest tu rownie wazny jak wynik. `matchProduct` i `suggest` biegna przy
 * KAZDYM nacisnieciu klawisza, a katalog ma rosnac do tysiecy pozycji. Budzet
 * ponizej jest strazakiem: jesli ktos wroci do liniowego przelotu po calym
 * indeksie, ten test zapali sie, zanim zrobi to telefon uzytkownika.
 */

import { matchProduct, suggest } from '../src/lib/match';
import { PRODUCTS } from '../src/data/products';

let fail = 0;
function ok(label: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'OK  ' : 'BLAD'}  ${label}${extra ? '   ' + extra : ''}`);
}

console.log(`pozycji w katalogu: ${PRODUCTS.length}`);

console.log('\n--- poprawnosc ---');
ok('dokladne trafienie', matchProduct('mleko').section === 'mleko');
ok('odmiana', matchProduct('mleka').section === 'mleko');
ok('literowka', matchProduct('chlebek').product !== null, matchProduct('chlebek').section);
ok('przedrostek', matchProduct('pomido').section === 'warzywa', matchProduct('pomido').section);
ok('nieznane idzie do inne', matchProduct('wihajster').section === 'inne');
ok('pusty tekst nie wywala', matchProduct('').section === 'inne');
ok('wielowyrazowe po rzeczowniku', matchProduct('duze jajka wiejskie').section === 'jaja',
   matchProduct('duze jajka wiejskie').section);

console.log('\n--- podpowiedzi ---');
ok('podpowiedzi po przedrostku', suggest('mle', 8).length > 0);
ok('podpowiedzi respektuja limit', suggest('a', 5).length <= 5);
ok('za krotkie zapytanie nic nie daje', suggest('m', 8).length === 0);

console.log('\n--- koszt ---');
// Typowe pisanie: czlowiek dopisuje litery, wiec kazdy przedrostek to osobne
// zapytanie. Bierzemy takze slowa NIEZNANE, bo to one uruchamiaja najdrozsza
// galaz - liczenie odleglosci edycyjnej.
const WPISY = ['mleko', 'chleb', 'pomidory', 'jogurt naturalny', 'ser zolty',
               'wihajster', 'zzzxxq', 'maslo oslone', 'papryka czerwona', 'platki owsiane'];
const zapytania: string[] = [];
for (const w of WPISY) {
  for (let i = 2; i <= w.length; i++) zapytania.push(w.slice(0, i));
}

const start = Date.now();
for (const q of zapytania) { matchProduct(q); suggest(q, 8); }
const czas = Date.now() - start;
const naKlawisz = czas / zapytania.length;

console.log(`  ${zapytania.length} zapytan w ${czas} ms  ->  ${naKlawisz.toFixed(2)} ms na klawisz`);
// 2 ms na klawisz to gorna granica tego, co na telefonie jest jeszcze niewidoczne.
ok('koszt jednego klawisza miesci sie w budzecie', naKlawisz < 2,
   `${naKlawisz.toFixed(2)} ms`);

console.log(fail === 0 ? '\nWSZYSTKO OK' : `\n${fail} BLEDOW`);
process.exit(fail === 0 ? 0 : 1);
