declare const process: { exit(code: number): never };

import { fileNameFor, parseStoreFile, serializeStore } from '../src/lib/mapFile';
import type { Store } from '../src/lib/types';
import { suggestGrid, suggestGridFromArea } from '../src/lib/scale';
import { migrateStore } from '../src/lib/storage';
import { BLOCK_BY_KEY } from '../src/data/blocks';
import { blocksInRect, removable, type MapBlock, type StoreMap } from '../src/lib/mapModel';

let fail = 0;
function ok(label: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'OK  ' : 'BLAD'}  ${label}${extra ? '   ' + extra : ''}`);
}
function rejects(label: string, text: string, fragment?: string) {
  const r = parseStoreFile(text);
  const good = !r.ok && (!fragment || r.error.includes(fragment));
  ok(label, good, r.ok ? 'przeszlo, a nie powinno' : r.error);
}

const store: Store = {
  id: 's1',
  name: 'Lidl Poznańska',
  chain: 'lidl',
  createdAt: '2026-08-26T10:00:00.000Z',
  mappedAt: '2026-08-26T10:00:00.000Z',
  walkOrder: ['warzywa', 'mleko'],
  map: {
    gridW: 14,
    gridH: 18,
    blocks: [
      { id: 'e1', type: 'wejscie', x: 1, y: 17, w: 3, h: 1, rot: 0, sections: [], sectionsB: [] },
      { id: 'k1', type: 'kasy', x: 9, y: 14, w: 2, h: 3, rot: 0, sections: [], sectionsB: [] },
      { id: 'b1', type: 'regal', x: 3, y: 4, w: 1, h: 9, rot: 0, sections: ['makarony'], sectionsB: ['czekolady'] },
    ],
  },
};

console.log('--- zapis i odczyt ---');
const text = serializeStore(store);
const back = parseStoreFile(text);
ok('plik daje sie odczytac', back.ok, back.ok ? '' : back.error);

if (back.ok) {
  ok('nazwa zachowana', back.store.name === 'Lidl Poznańska');
  ok('siec zachowana', back.store.chain === 'lidl');
  ok('liczba klockow sie zgadza', back.store.map?.blocks.length === 3);
  ok('marszruta zachowana', back.store.walkOrder.join() === 'warzywa,mleko');
  ok('bez ostrzezen', back.warnings.length === 0, back.warnings.join(' | '));
  const b1 = back.store.map?.blocks.find((b) => b.id === 'b1');
  ok('obie strony regalu zachowane',
     b1?.sections.join() === 'makarony' && b1?.sectionsB.join() === 'czekolady');
  ok('rozmiar siatki zachowany',
     back.store.map?.gridW === 14 && back.store.map?.gridH === 18);
}

console.log('\n--- nazwa pliku ---');
ok('slug bez ogonkow i spacji', fileNameFor(store) === 'lidl-poznanska.alejka.json',
   fileNameFor(store));
ok('pusta nazwa spada na siec',
   fileNameFor({ name: '!!!', chain: 'biedronka' }) === 'biedronka.alejka.json',
   fileNameFor({ name: '!!!', chain: 'biedronka' }));

console.log('\n--- odrzucanie smieci ---');
rejects('nie-JSON', 'to nie jest json', 'JSON');
rejects('JSON, ale nie obiekt', '[1,2,3]', 'obiekt');
rejects('obcy format', JSON.stringify({ format: 'cos.innego' }), 'Alejki');
rejects('nowsza wersja formatu',
        JSON.stringify({ format: 'alejka.store', version: 99, store: {} }), 'nowszej wersji');
rejects('brak sklepu', JSON.stringify({ format: 'alejka.store', version: 1 }), 'danych sklepu');

const wrap = (s: unknown) => JSON.stringify({ format: 'alejka.store', version: 1, store: s });
rejects('sklep bez nazwy', wrap({ chain: 'lidl' }), 'nazwy');
rejects('nieznana siec', wrap({ name: 'X', chain: 'zabkaXYZ' }), 'Nieznana sieć');

const withMap = (m: unknown) => wrap({ name: 'X', chain: 'lidl', map: m, walkOrder: [] });
rejects('zla siatka', withMap({ gridW: 0, gridH: 0, blocks: [] }), 'rozmiar siatki');
rejects('brak listy klockow', withMap({ gridW: 10, gridH: 10 }), 'listy klocków');
rejects('nieznany typ klocka',
        withMap({ gridW: 10, gridH: 10, blocks: [{ type: 'teleporter', x: 0, y: 0, w: 1, h: 1 }] }),
        'nieznany typ');
rejects('klocek poza planem',
        withMap({ gridW: 10, gridH: 10, blocks: [{ type: 'regal', x: 9, y: 0, w: 5, h: 1 }] }),
        'wystaje poza plan');
rejects('ulamkowe wspolrzedne',
        withMap({ gridW: 10, gridH: 10, blocks: [{ type: 'regal', x: 1.5, y: 0, w: 1, h: 1 }] }),
        'całkowitą');
rejects('nieznana sekcja',
        withMap({ gridW: 10, gridH: 10, blocks: [{ type: 'regal', x: 0, y: 0, w: 1, h: 1, rot: 0, section: 'pizzeria' }] }),
        'nieznana kategoria');
console.log('');
console.log('--- obrocony klocek przy scianie ---');
// Edytor liczy mieszczenie sie PO obrocie, import liczyl surowy prostokat.
// Skutek: wlasny plik z lodowka 2x1 obrocona o 90 stopni przy prawej scianie
// nie dawal sie wczytac, mimo ze w edytorze stanela bez problemu.
const przyScianie = (rot: number) => JSON.stringify({
  format: 'alejka.store', version: 1,
  store: { name: 'X', chain: 'lidl', walkOrder: [], map: { gridW: 28, gridH: 40, blocks: [
    { id: 'e', type: 'wejscie', x: 1, y: 39, w: 3, h: 1, rot: 0, sections: [], sectionsB: [] },
    { id: 'k', type: 'kasy', x: 7, y: 35, w: 21, h: 5, rot: 0, sections: [], sectionsB: [] },
    { id: 'l', type: 'lodowka', x: 27, y: 1, w: 2, h: 1, rot, sections: ['jogurty'], sectionsB: [] },
  ] } },
});
const obrocony = parseStoreFile(przyScianie(90));
ok('lodowka 2x1 obrocona o 90 stopni przy prawej scianie przechodzi',
   obrocony.ok, obrocony.ok ? '' : obrocony.error);
// Ten sam klocek BEZ obrotu naprawde wystaje i ma zostac odrzucony.
rejects('ten sam klocek bez obrotu jednak wystaje', przyScianie(0), 'wystaje poza plan');



console.log('\n--- ostrzezenia, ale wczytuje ---');
const innaWersja = JSON.stringify({
  format: 'alejka.store', version: 1, catalogVersion: 99,
  store: { name: 'X', chain: 'lidl', map: null, walkOrder: ['mleko', 'nieistniejaca'] },
});
const w = parseStoreFile(innaWersja);
ok('wczytuje mimo innej wersji katalogu', w.ok);
if (w.ok) {
  ok('ostrzega o wersji katalogu', w.warnings.some((x) => x.includes('katalogiem')));
  ok('pomija nieznana sekcje w marszrucie', w.store.walkOrder.join() === 'mleko');
  ok('ostrzega o pominietej sekcji', w.warnings.some((x) => x.includes('Pominięto')));
}

console.log('\n--- sklep bez planu ---');
const bezPlanu = parseStoreFile(
  JSON.stringify({ format: 'alejka.store', version: 1, store: { name: 'Y', chain: 'dino', map: null, walkOrder: [] } })
);
ok('sklep bez planu jest poprawny', bezPlanu.ok);
if (bezPlanu.ok) ok('mappedAt puste bez danych', bezPlanu.store.mappedAt === null);

console.log('\n--- migracja starego zapisu ---');
// Zapis sprzed scalenia kas: typ 'kasy-samo' juz nie istnieje, brakuje tez 'rot'.
// Bez migracji BLOCK_BY_KEY['kasy-samo'] jest undefined i aplikacja sie wywala.
const stary = {
  id: 's1',
  name: 'Lidl Stary Zapis',
  chain: 'lidl',
  walkOrder: [],
  mappedAt: null,
  createdAt: '2026-08-26T10:00:00.000Z',
  map: {
    gridW: 18,
    gridH: 26,
    blocks: [
      { id: 'e', type: 'wejscie', x: 1, y: 25, w: 3, h: 1, sections: [], sectionsB: [] },
      { id: 'k', type: 'kasy', x: 8, y: 21, w: 2, h: 4, sections: [], sectionsB: [] },
      { id: 'ks', type: 'kasy-samo', x: 13, y: 22, w: 3, h: 3, sections: [], sectionsB: [] },
      { id: 'c', type: 'chlodnia', x: 2, y: 4, w: 1, h: 5, sections: ['mleko'], sectionsB: [] },
      { id: 'zly', type: 'teleporter', x: 0, y: 0, w: 1, h: 1, sections: [], sectionsB: [] },
    ],
  },
};

const zmigrowany = migrateStore(stary);
ok('stary sklep daje sie zmigrowac', zmigrowany !== null);
if (zmigrowany && zmigrowany.map) {
  const typy = zmigrowany.map.blocks.map((x) => x.type);
  console.log('  typy po migracji:', typy.join(', '));
  ok('kasy samoobslugowe stały sie kasami', typy.filter((x) => x === 'kasy').length === 2);
  ok('stara chlodnia stala sie lodowka', typy.includes('lodowka'));
  ok('nieznany typ wyrzucony', !typy.some((x) => String(x) === 'teleporter'));
  ok('kazdy klocek ma obrot', zmigrowany.map.blocks.every((x) => typeof x.rot === 'number'));
  ok('sekcje zachowane',
     zmigrowany.map.blocks.find((x) => x.id === 'c')?.sections.join() === 'mleko');
  ok('siatka zachowana', zmigrowany.map.gridW === 18 && zmigrowany.map.gridH === 26);
  // To jest dokladnie ten odczyt, ktory sie wywalal na liscie sklepow
  ok('odczyt definicji typu juz nie wybucha',
     zmigrowany.map.blocks.every((x) => BLOCK_BY_KEY[x.type] !== undefined));
}
ok('sklep bez planu przechodzi migracje',
   migrateStore({ id: 'x', name: 'Y', chain: 'dino', map: null, walkOrder: [], mappedAt: null, createdAt: '' })?.map === null);
ok('smiec zamiast sklepu odrzucony', migrateStore({ nonsens: true }) === null);

console.log('');
console.log('--- kasowanie wejsc i kas ---');
// Trasa musi miec start i mete, wiec jedno wejscie i jedne kasy zostaja.
// Ale sklep miewa po kilka jednych i drugich — te nadmiarowe musza dac sie usunac.
const blk = (id: string, type: MapBlock['type'], x: number, y: number): MapBlock => ({
  id, type, x, y, w: 3, h: 3, rot: 0, sections: [], sectionsB: [],
});
const plan = (blocks: MapBlock[]): StoreMap => ({ gridW: 20, gridH: 20, blocks });

const jedno = plan([blk('w1', 'wejscie', 0, 17), blk('k1', 'kasy', 10, 14), blk('r1', 'regal', 5, 5)]);
ok('jedynego wejscia nie da sie usunac', removable(jedno, ['w1']).length === 0);
ok('jedynych kas nie da sie usunac', removable(jedno, ['k1']).length === 0);
ok('zwykly regal usuwalny zawsze', removable(jedno, ['r1']).map((b) => b.id).join() === 'r1');
ok('zaznaczenie wszystkiego zostawia wejscie i kasy',
   removable(jedno, ['w1', 'k1', 'r1']).map((b) => b.id).join() === 'r1');

const dwa = plan([
  blk('w1', 'wejscie', 0, 17), blk('w2', 'wejscie', 16, 17),
  blk('k1', 'kasy', 6, 14), blk('k2', 'kasy', 12, 14),
]);
ok('drugie wejscie da sie usunac', removable(dwa, ['w2']).map((b) => b.id).join() === 'w2');
ok('drugie kasy daja sie usunac', removable(dwa, ['k2']).map((b) => b.id).join() === 'k2');
// Kazde z osobna wyglada na usuwalne — razem zabralyby planowi start.
ok('z dwoch wejsc usuwa tylko jedno', removable(dwa, ['w1', 'w2']).length === 1);
ok('Ctrl+A na planie z dwoma wejsciami zostawia po jednym',
   removable(dwa, ['w1', 'w2', 'k1', 'k2']).length === 2);
ok('nieznane id nic nie robi', removable(dwa, ['nie-ma-takiego']).length === 0);


console.log('');
console.log('--- ramka zaznaczenia ---');
// Ramka bierze wszystko, czego dotknie — obejmowanie klocka w calosci
// brzmi porzadniej, ale zmusza do celowania wokol dlugich regalow.
const polka = (id: string, x: number, y: number, w: number, h: number): MapBlock => ({
  id, type: 'regal', x, y, w, h, rot: 0, sections: [], sectionsB: [],
});
const sala = plan([polka('a', 2, 2, 2, 6), polka('b', 8, 2, 2, 6), polka('c', 14, 14, 2, 2)]);
const ids = (r: MapBlock[]) => r.map((b) => b.id).sort().join();

ok('ramka wokol jednego bierze jeden', ids(blocksInRect(sala, 1, 1, 5, 9)) === 'a');
ok('ramka przez dwa bierze dwa', ids(blocksInRect(sala, 1, 1, 11, 9)) === 'a,b');
ok('musniecie rogiem tez liczy', ids(blocksInRect(sala, 0, 0, 3, 3)) === 'a');
ok('ramka obok nie bierze nic', blocksInRect(sala, 4, 9, 7, 12).length === 0);
ok('ramka ciagnieta w gore i w lewo dziala tak samo',
   ids(blocksInRect(sala, 11, 9, 1, 1)) === 'a,b');
ok('ramka przez cala sale bierze wszystko', blocksInRect(sala, 0, 0, 20, 20).length === 3);
ok('zerowa ramka nic nie bierze', blocksInRect(sala, 3, 3, 3, 3).length === 0);


console.log('\n--- skala z pomiaru Google Maps ---');
// Lidl Rybnik Zorska: 1679.82 m2 CALEGO budynku (z magazynem i socjalnym),
// dluzszy bok 50 m. Mapuje sie tylko sale sprzedazy.
const lidl = suggestGrid(1679.82, 50);
ok('siatka z pomiaru powstaje', lidl !== null);
if (lidl) {
  console.log(`  1679 m2 budynku, bok 50 m  ->  siatka ${lidl.gridW}x${lidl.gridH}`);
  console.log(`  sala sprzedazy ~${lidl.salesAreaM2} m2, zaplecze ~${lidl.backAreaM2} m2`);
  ok('dluzszy bok zachowany', lidl.gridW === 50);
  ok('sala sprzedazy w rozsadnym zakresie',
     lidl.salesAreaM2 > 900 && lidl.salesAreaM2 < 1400, `${lidl.salesAreaM2} m2`);
  ok('zaplecze to jakies 30 procent',
     lidl.backAreaM2 > 400 && lidl.backAreaM2 < 700, `${lidl.backAreaM2} m2`);
}
ok('wiekszy procent zaplecza daje mniejsza sale',
   (suggestGrid(1679.82, 50, 45)?.salesAreaM2 ?? 9999) < (lidl?.salesAreaM2 ?? 0));
ok('zero procent zaplecza to prawie caly budynek',
   Math.abs((suggestGrid(1679.82, 50, 0)?.salesAreaM2 ?? 0) - 1679) < 60,
   String(suggestGrid(1679.82, 50, 0)?.salesAreaM2));
ok('sama powierzchnia tez wystarcza', suggestGridFromArea(1679.82) !== null);
ok('bzdurne dane odrzucone',
   suggestGrid(0, 50) === null && suggestGrid(1679, 0) === null && suggestGrid(NaN, 50) === null);

console.log(fail === 0 ? '\nWSZYSTKO OK' : `\n${fail} BLEDOW`);
process.exit(fail === 0 ? 0 : 1);
