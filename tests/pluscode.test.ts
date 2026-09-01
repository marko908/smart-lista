declare const process: { exit(code: number): never };

/**
 * Plus Code i odległości.
 *
 * Kod wpisuje administrator, a błąd w dekodowaniu przesunąłby sklep o
 * kilometry i zepsuł całe „pokaż najbliższe" — po cichu, bo współrzędne
 * wyglądają wiarygodnie niezależnie od tego, czy są prawdziwe.
 */

import { naWspolrzedne, zPary, zPlusCode, wygladaNaPlusCode } from '../src/lib/pluscode';
import { odleglosc, opisOdleglosci } from '../src/lib/odleglosc';

let fail = 0;
function ok(label: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'OK  ' : 'BLAD'}  ${label}${extra ? '   ' + extra : ''}`);
}

console.log('--- rozpoznawanie ---');
ok('pelny kod rozpoznany', wygladaNaPlusCode('9F2RJHV9+FP'));
ok('skrocony kod rozpoznany', wygladaNaPlusCode('3HV9+FP'));
ok('kod z miastem rozpoznany', wygladaNaPlusCode('3HV9+FP Rybnik'));
ok('zwykly tekst odrzucony', !wygladaNaPlusCode('Rybnik'));
ok('para liczb to nie plus code', !wygladaNaPlusCode('50.09, 18.54'));

console.log('\n--- kod pelny ---');
// 8FVC2222+22 to udokumentowany przyklad ze specyfikacji Open Location Code.
const wzorzec = zPlusCode('8FVC2222+22');
ok('przyklad ze specyfikacji trafia gdzie trzeba',
   wzorzec !== null &&
   Math.abs(wzorzec.szerokosc - 47.0000625) < 0.0002 &&
   Math.abs(wzorzec.dlugosc - 8.0000625) < 0.0002,
   wzorzec ? `${wzorzec.szerokosc.toFixed(5)}, ${wzorzec.dlugosc.toFixed(5)}` : 'null');

const pelny = zPlusCode('9F2RJHV9+FP');
ok('kod z poludniowej Polski lezy w Polsce',
   pelny !== null && pelny.szerokosc > 48 && pelny.szerokosc < 55 &&
   pelny.dlugosc > 14 && pelny.dlugosc < 25,
   pelny ? `${pelny.szerokosc.toFixed(4)}, ${pelny.dlugosc.toFixed(4)}` : 'null');

console.log('\n--- kod skrocony ---');
const rybnik = { szerokosc: 50.0971, dlugosc: 18.5416 };
ok('bez punktu odniesienia nie zgadujemy', zPlusCode('3HV9+FP') === null);
const skrocony = zPlusCode('3HV9+FP Rybnik', rybnik);
ok('z odniesieniem wypada blisko niego',
   skrocony !== null && odleglosc(rybnik, skrocony) < 25,
   skrocony ? `${odleglosc(rybnik, skrocony).toFixed(1)} km` : 'null');

console.log('\n--- para liczb ---');
const para = zPary('50.0971, 18.5416');
ok('kropka dziesietna', para?.szerokosc === 50.0971 && para?.dlugosc === 18.5416);
const paraPrzecinek = zPary('50,0971 18,5416');
ok('przecinek dziesietny ze spacja',
   paraPrzecinek?.szerokosc === 50.0971 && paraPrzecinek?.dlugosc === 18.5416,
   JSON.stringify(paraPrzecinek));
ok('bzdury odrzucone', zPary('abc') === null && zPary('50.1') === null);
ok('poza zakresem odrzucone', zPary('120.0, 18.5') === null);
ok('wspolne wejscie bierze pare', naWspolrzedne('50.09, 18.54')?.szerokosc === 50.09);
ok('wspolne wejscie bierze kod', naWspolrzedne('8FVC2222+22') !== null);

console.log('\n--- opis odleglosci ---');
// Ponizej kilometra zaokraglamy do 50 m: dokladniejsza liczba udawalaby
// precyzje, ktorej namiar z telefonu nie ma.
ok('420 m -> 400 m', opisOdleglosci(0.42) === '400 m', opisOdleglosci(0.42));
ok('436 m -> 450 m', opisOdleglosci(0.436) === '450 m', opisOdleglosci(0.436));
ok('30 m -> 50 m', opisOdleglosci(0.03) === '50 m', opisOdleglosci(0.03));
ok('powyzej kilometra jedno miejsce', opisOdleglosci(2.44) === '2,4 km', opisOdleglosci(2.44));
ok('dalekie tez z jednym miejscem', opisOdleglosci(18.37) === '18,4 km', opisOdleglosci(18.37));

console.log(fail === 0 ? '\nWSZYSTKO OK' : `\n${fail} BLEDOW`);
process.exit(fail === 0 ? 0 : 1);
