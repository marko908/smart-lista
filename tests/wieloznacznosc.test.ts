declare const process: { exit(code: number): never };

import { kluczWyboru, statystyka, wieloznacznosc, zawez } from '../src/lib/wieloznacznosc';
import type { SectionKey } from '../src/data/sections';

let fail = 0;
function ok(label: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'OK  ' : 'BLAD'}  ${label}${extra ? '   ' + extra : ''}`);
}

console.log('--- skala problemu ---');
const st = statystyka();
console.log(`  glow frazy: ${st.glow}, wieloznacznych: ${st.wieloznacznych}, twardych: ${st.twardych}`);
ok('katalog ma sensowna liczbe glow', st.glow > 300, String(st.glow));
ok('twardych jest mniej niz wszystkich wieloznacznych',
   st.twardych < st.wieloznacznych, `${st.twardych} < ${st.wieloznacznych}`);
ok('twarde to maly ulamek katalogu',
   st.twardych / st.glow < 0.15, `${(100 * st.twardych / st.glow).toFixed(1)}%`);

console.log('\n--- slowa, o ktore TRZEBA pytac ---');
for (const slowo of ['plyn', 'papier', 'sos', 'pasta']) {
  const w = wieloznacznosc(slowo);
  ok(`„${slowo}" rozpoznane jako twardo wieloznaczne`, w !== null && w.twarda,
     w ? w.sekcje.join(', ') : 'brak');
}

const plyn = wieloznacznosc('plyn');
ok('„plyn" prowadzi do wielu sekcji', (plyn?.sekcje.length ?? 0) >= 4, String(plyn?.sekcje.length));
ok('kazda sekcja „plynu" ma przyklady z katalogu',
   plyn !== null && plyn.sekcje.every((s) => (plyn.przyklady[s] ?? []).length > 0));

console.log('\n--- slowa, ktore rozstrzygaja sie SAME ---');
for (const slowo of ['mleko', 'woda', 'ogorki', 'papryka']) {
  const w = wieloznacznosc(slowo);
  ok(`„${slowo}" ma znaczenie kanoniczne, wiec nie pytamy`, w !== null && !w.twarda,
     w ? `domyslnie ${w.sekcje[0]}` : 'brak');
}
ok('„mleko" domyslnie trafia do mleka', wieloznacznosc('mleko')?.sekcje[0] === 'mleko');
ok('„woda" domyslnie trafia do wody', wieloznacznosc('woda')?.sekcje[0] === 'woda');

console.log('\n--- frazy dokladne nie sa wieloznaczne ---');
for (const fraza of ['plyn do prania', 'papier toaletowy', 'jogurt naturalny', 'sos czosnkowy']) {
  ok(`„${fraza}" nie budzi watpliwosci`, wieloznacznosc(fraza) === null);
}

console.log('\n--- odmiana trafia tam, gdzie mianownik ---');
ok('„plynu" to ten sam problem co „plyn"', wieloznacznosc('plynu')?.glowa === 'plyn',
   String(wieloznacznosc('plynu')?.glowa));
ok('klucz zapamietania nie zalezy od odmiany',
   kluczWyboru('s1', 'plynu') === kluczWyboru('s1', 'plyn'));
ok('klucz zalezy od sklepu', kluczWyboru('s1', 'plyn') !== kluczWyboru('s2', 'plyn'));
ok('brak sklepu tez ma swoj klucz', kluczWyboru(null, 'plyn').startsWith('brak|'));

console.log('\n--- zawezenie do planu sklepu ---');
const w = wieloznacznosc('plyn')!;
ok('bez planu nie ma czego zawezac', zawez(w, null).length === w.sekcje.length);

// Sklep, ktory ma tylko jedna z sekcji kandydujacych — pytanie znika.
const jedna = new Set<SectionKey>([w.sekcje[0], 'warzywa', 'mleko']);
ok('sklep z jedna sekcja rozstrzyga sam', zawez(w, jedna).length === 1, zawez(w, jedna).join(', '));

// Sklep z dwiema — pytanie zostaje, ale krotsze.
const dwie = new Set<SectionKey>([w.sekcje[0], w.sekcje[1], 'warzywa']);
ok('sklep z dwiema sekcjami skraca pytanie',
   zawez(w, dwie).length === 2, zawez(w, dwie).join(', '));
ok('zawezenie jest wezsze niz pelna lista', zawez(w, dwie).length < w.sekcje.length);

// Sklep, ktory nie ma zadnej — wtedy zawezenie nie ma nic do powiedzenia.
const zadna = new Set<SectionKey>(['warzywa', 'owoce']);
ok('sklep bez zadnej z sekcji pokazuje pelna liste',
   zawez(w, zadna).length === w.sekcje.length);

console.log('\n--- rzeczy spoza katalogu ---');
ok('nieznane slowo nie jest wieloznaczne', wieloznacznosc('wihajster') === null);
ok('pusty tekst nie wywala', wieloznacznosc('') === null);
ok('same spacje nie wywalaja', wieloznacznosc('   ') === null);

console.log(fail === 0 ? '\nWSZYSTKO OK' : `\n${fail} BLEDOW`);
process.exit(fail === 0 ? 0 : 1);
