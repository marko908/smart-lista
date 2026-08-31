declare const process: { exit(code: number): never };

import { computeRoute, costForOrder } from '../src/lib/route';
import {
  areaM2,
  cellsOf,
  checkoutCells,
  clampSize,
  createDefaultMap,
  entranceCells,
  findSpot,
  fits,
  idx,
  overlaps,
  rasterize,
  sectionGroups,
  rotateBlock,
  validate,
  type MapBlock,
  type StoreMap,
} from '../src/lib/mapModel';
import { createBareMap, createStarterMap, starterSectionCount } from '../src/data/layouts';
import { rotateAround, sideNormal } from '../src/lib/geometry';
import { BLOCK_BY_KEY, PLACEABLE, normalizeType, typeForSections } from '../src/data/blocks';
import { normalizeSection, sectionCategory, sectionName, type SectionKey } from '../src/data/sections';
import { matchProduct } from '../src/lib/match';
import { parseEntry, splitEntries } from '../src/lib/normalize';

let fail = 0;
function ok(label: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'OK  ' : 'BLAD'}  ${label}${extra ? '   ' + extra : ''}`);
}

const b = (
  id: string,
  type: MapBlock['type'],
  x: number,
  y: number,
  w: number,
  h: number,
  section: SectionKey | null = null,
  sectionB: SectionKey | null = null,
  rot: MapBlock['rot'] = 0
): MapBlock => ({
  id, type, x, y, w, h, rot,
  sections: section ? [section] : [],
  sectionsB: sectionB ? [sectionB] : [],
});

// Sklep testowy 14x18: pas warzyw u gory, trzy regaly dwustronne,
// lodowka przy prawej scianie, wejscie na dole po lewej, kasy po prawej.
const map: StoreMap = {
  gridW: 14,
  gridH: 18,
  blocks: [
    b('e1', 'wejscie', 1, 17, 3, 1),
    b('k1', 'kasy', 9, 14, 2, 3),
    b('b0', 'stoisko', 1, 1, 12, 1, 'warzywa'),
    b('b1', 'regal', 3, 4, 1, 9, 'makarony', 'czekolady'),
    b('b2', 'regal', 6, 4, 1, 9, 'konserwy-warzywne', 'chipsy'),
    b('b3', 'regal', 9, 4, 1, 9, 'napoje-gazowane', 'pranie'),
    b('b4', 'lodowka', 12, 4, 1, 9, 'mleko'),
  ],
};

console.log('--- model ---');
ok('powierzchnia liczona', areaM2(map) === 14 * 18, `${areaM2(map)} m2`);
ok('wejscie ma 3 kratki startowe', entranceCells(map).length === 3);
ok('do kas da sie podejsc', checkoutCells(map).length > 0, `${checkoutCells(map).length} kratek`);

const walls = rasterize(map);
ok('wejscie NIE blokuje przejscia', walls[idx(2, 17, map.gridW)] === 0);
ok('kasy blokuja przejscie', walls[idx(9, 15, map.gridW)] === 1);

ok('kasy: krotszy bok >=2, dluzszy >=3', (() => {
  const [w, h] = clampSize('kasy', 1, 1);
  return Math.min(w, h) >= 2 && Math.max(w, h) >= 3;
})(), clampSize('kasy', 1, 1).join('x'));
// Regal JEDNOSTRONNY moze miec metr glebokosci; DWUSTRONNY nigdy — ma dwie strony.
ok('obrot regalu przysciennego nie zmienia powierzchni', (() => {
  const [w, h] = clampSize('regal-scienny', 6, 1);
  return w === 6 && h === 1;
})(), clampSize('regal-scienny', 6, 1).join('x'));
ok('regal dwustronny ma zawsze co najmniej dwie kratki glebokosci', (() => {
  const [w, h] = clampSize('regal', 6, 1);
  return Math.min(w, h) >= 2;
})(), clampSize('regal', 6, 1).join('x'));
// Wejscie schodzi do 1x1 jak reszta — bywaja bramy i pojedyncze drzwi.
ok('wejscie schodzi do 1x1', clampSize('wejscie', 1, 1).join('x') === '1x1', clampSize('wejscie', 1, 1).join('x'));

// Minimum trzymamy tylko tam, gdzie wynika z rzeczy. Male lodowki, krotkie lady
// i pojedyncze regaliki istnieja, a zawyzone minimum rozpychalo plan i psulo skale.
for (const typ of ['klocek', 'regal-scienny', 'lodowka', 'zamrazarka', 'lada', 'kosz', 'stoisko', 'sciana'] as const) {
  ok(`${typ} schodzi do 1x1`, clampSize(typ, 1, 1).join('x') === '1x1', clampSize(typ, 1, 1).join('x'));
}
// Kategoria zmienia typ klocka — i nie moze przy okazji rozdmuchac jego rozmiaru.
ok('kategoria nie rozdmuchuje klocka 1x1', (() => {
  const typ = typeForSections(['mleko'], [], 'klocek');
  return clampSize(typ, 1, 1).join('x') === '1x1';
})(), typeForSections(['mleko'], [], 'klocek') + ' ' + clampSize(typeForSections(['mleko'], [], 'klocek'), 1, 1).join('x'));
// Wyjatek zostaje jeden: druga strona alejki to fizycznie druga kratka glebokosci.
ok('druga kategoria pogrubia klocek do dwoch kratek', (() => {
  const typ = typeForSections(['mleko'], ['jaja'], 'klocek');
  return Math.min(...clampSize(typ, 1, 1)) >= 2;
})(), clampSize(typeForSections(['mleko'], ['jaja'], 'klocek'), 1, 1).join('x'));
console.log('');
console.log('--- rozroznianie podobnie nazwanych kategorii ---');
// Papier toaletowy, reczniki, chusteczki i serwetki to CZTERY rozne miejsca
// w regale. Wczesniej byla jedna kategoria „Papier i chusteczki" i „idz po
// papier" nie mowilo, po ktory.
const gdzie = (co: string) => matchProduct(co).section;
ok('papier toaletowy ma swoja kategorie', gdzie('papier toaletowy') === 'papier-toaletowy', gdzie('papier toaletowy'));
ok('papier kuchenny to reczniki', gdzie('papier kuchenny') === 'reczniki-papierowe', gdzie('papier kuchenny'));
ok('reczniki kuchenne to to samo co papier kuchenny', gdzie('ręczniki kuchenne') === 'reczniki-papierowe', gdzie('ręczniki kuchenne'));
ok('czysciwo tez tam trafia', gdzie('czyściwo') === 'reczniki-papierowe', gdzie('czyściwo'));
ok('chusteczki osobno', gdzie('chusteczki') === 'chusteczki', gdzie('chusteczki'));
ok('chusteczki higieniczne osobno', gdzie('chusteczki higieniczne') === 'chusteczki', gdzie('chusteczki higieniczne'));
ok('serwetki osobno', gdzie('serwetki') === 'serwetki', gdzie('serwetki'));
// Te dwa brzmia podobnie, a leza zupelnie gdzie indziej — pilnujemy, zeby
// rozbicie papieru ich nie przejelo.
ok('chusteczki nawilzane zostaja przy kosmetykach', gdzie('chusteczki nawilżane') === 'kapiel', gdzie('chusteczki nawilżane'));
ok('chusteczki dla niemowlat zostaja przy dzieciach', gdzie('chusteczki dla niemowląt') === 'akcesoria-dzieci', gdzie('chusteczki dla niemowląt'));
// Stare plany maja jeszcze klucz 'papier' — musza sie wczytac.
ok('stary klucz papier sie tlumaczy', normalizeSection('papier') === 'papier-toaletowy', String(normalizeSection('papier')));

console.log('');
console.log('--- rajstopy przy kosmetykach ---');
// W dyskontach rajstopy i skarpety wisza na stojaku przy kosmetykach,
// a nie przy poscieli i recznikach.
ok('rajstopy', gdzie('rajstopy') === 'rajstopy', gdzie('rajstopy'));
ok('skarpetki', gdzie('skarpetki') === 'rajstopy', gdzie('skarpetki'));
ok('ponczochy', gdzie('pończochy') === 'rajstopy', gdzie('pończochy'));
ok('poscel zostaje w tekstyliach', gdzie('pościel') === 'tekstylia', gdzie('pościel'));
ok('recznik zostaje w tekstyliach', gdzie('ręcznik') === 'tekstylia', gdzie('ręcznik'));


console.log('');
console.log('--- rozbijanie wpisu na pozycje ---');
// Podpowiedz w polu obiecuje „2 mleka, chleb, pomidory" — przecinek musi dzielic.
ok('przecinki dziela', splitEntries('mleko, chleb, pomidory').join('|') === 'mleko|chleb|pomidory',
   splitEntries('mleko, chleb, pomidory').join('|'));
ok('nowe linie tez dziela', splitEntries('mleko\nchleb').join('|') === 'mleko|chleb');
ok('srednik dzieli', splitEntries('mleko; chleb').join('|') === 'mleko|chleb');
ok('puste fragmenty wypadaja', splitEntries('mleko,, ,chleb').join('|') === 'mleko|chleb',
   splitEntries('mleko,, ,chleb').join('|'));
ok('pojedynczy wpis zostaje jeden', splitEntries('maslo ekstra').join('|') === 'maslo ekstra');
// Przecinek dziesietny NIE jest separatorem pozycji.
ok('ulamek zostaje jedna pozycja', splitEntries('1,5 kg maki').join('|') === '1,5 kg maki',
   splitEntries('1,5 kg maki').join('|'));
ok('ulamek posrod innych', splitEntries('chleb, 1,5 kg maki, mleko').join('|') === 'chleb|1,5 kg maki|mleko',
   splitEntries('chleb, 1,5 kg maki, mleko').join('|'));
ok('cyfra po przecinku to nadal nowa pozycja', splitEntries('chleb, 2 mleka').join('|') === 'chleb|2 mleka',
   splitEntries('chleb, 2 mleka').join('|'));
const ulamek = parseEntry(splitEntries('1,5 kg maki')[0]);
ok('ulamek trafia do ilosci', ulamek.ilosc === '1,5' && ulamek.miara === 'kg',
   `${ulamek.ilosc} / ${ulamek.miara} / ${ulamek.name}`);
const zlepek = parseEntry('3kg ziemniakow');
ok('liczba zlepiona z miara', zlepek.ilosc === '3' && zlepek.miara === 'kg' && zlepek.name === 'ziemniakow',
   `${zlepek.ilosc} / ${zlepek.miara} / ${zlepek.name}`);
const zTylu = parseEntry('mleko 2l');
ok('miara na koncu', zTylu.ilosc === '2' && zTylu.miara === 'l' && zTylu.name === 'mleko',
   `${zTylu.ilosc} / ${zTylu.miara} / ${zTylu.name}`);
const bezMiary = parseEntry('2 mleka');
ok('sama liczba tez jest iloscia', bezMiary.ilosc === '2' && !bezMiary.miara && bezMiary.name === 'mleka',
   `${bezMiary.ilosc} / ${bezMiary.miara} / ${bezMiary.name}`);
const gramy = parseEntry('500g sera');
ok('gramy', gramy.ilosc === '500' && gramy.miara === 'g', `${gramy.ilosc} / ${gramy.miara}`);
const mililitry = parseEntry('300ml smietany');
ok('mililitry', mililitry.ilosc === '300' && mililitry.miara === 'ml', `${mililitry.ilosc} / ${mililitry.miara}`);
const bezIlosci = parseEntry('chleb razowy');
ok('nazwa bez liczby zostaje cala', !bezIlosci.ilosc && bezIlosci.name === 'chleb razowy', bezIlosci.name);
const liczbaWNazwie = parseEntry('woda 33');
ok('liczba bez miary na koncu to nadal nazwa', !liczbaWNazwie.ilosc && liczbaWNazwie.name === 'woda 33',
   `${liczbaWNazwie.ilosc} / ${liczbaWNazwie.name}`);


console.log('');
console.log('--- worki kontra folie ---');
// Worki na smieci stoja przy chemii, folia aluminiowa przy akcesoriach
// kuchennych. Wczesniej byla jedna kategoria „Worki i folie".
ok('worki na smieci', gdzie('worki na śmieci') === 'worki-smieci', gdzie('worki na śmieci'));
ok('worki 60l', gdzie('worki 60l') === 'worki-smieci', gdzie('worki 60l'));
ok('folia aluminiowa', gdzie('folia aluminiowa') === 'folie-kuchenne', gdzie('folia aluminiowa'));
ok('papier do pieczenia', gdzie('papier do pieczenia') === 'folie-kuchenne', gdzie('papier do pieczenia'));
ok('worki do zamrazania ida z foliami, nie ze smieciami',
   gdzie('worki do zamrażania') === 'folie-kuchenne', gdzie('worki do zamrażania'));
ok('stary klucz worki-folie sie tlumaczy',
   normalizeSection('worki-folie') === 'worki-smieci', String(normalizeSection('worki-folie')));

console.log('');
console.log('--- domyslne rozmiary z palety ---');
// Sciane i klocek stawia sie jako jedna kratke i rozciaga do potrzeby.
ok('klocek staje jako 1x1', BLOCK_BY_KEY['klocek'].size.join('x') === '1x1');
ok('sciana staje jako 1x1', BLOCK_BY_KEY['sciana'].size.join('x') === '1x1', BLOCK_BY_KEY['sciana'].size.join('x'));


console.log('');
console.log('--- lodowka grillowa ---');
// Osobna lodowka z asortymentem grillowym. Kluczowe: samo „karkowka" ma zostac
// przy miesie swiezym — dopiero „na grilla" albo „marynowana" przesuwa produkt.
ok('kielbaski na grilla', gdzie('kiełbaski na grilla') === 'grill', gdzie('kiełbaski na grilla'));
ok('karkowka marynowana', gdzie('karkówka marynowana') === 'grill', gdzie('karkówka marynowana'));
ok('szaszlyki', gdzie('szaszłyki') === 'grill', gdzie('szaszłyki'));
ok('ser na grilla', gdzie('ser na grilla') === 'grill', gdzie('ser na grilla'));
ok('halloumi', gdzie('halloumi') === 'grill', gdzie('halloumi'));
// Oscypek i camembert leza przy serach caly rok — lodowka grillowa ich nie przejmuje.
ok('oscypek zostaje przy serach', gdzie('oscypek') === 'sery-plesniowe', gdzie('oscypek'));
ok('camembert zostaje przy serach', gdzie('camembert') === 'sery-plesniowe', gdzie('camembert'));
ok('sama karkowka zostaje przy miesie swiezym', gdzie('karkówka') === 'mieso-swieze', gdzie('karkówka'));
ok('sam boczek zostaje przy wedlinach', gdzie('boczek') === 'wedliny', gdzie('boczek'));
// Mieso na grilla i akcesoria do grilla to dwa rozne konce sklepu.
ok('wegiel drzewny to akcesoria', gdzie('węgiel drzewny') === 'grill-akcesoria', gdzie('węgiel drzewny'));
ok('podpalka to akcesoria', gdzie('podpałka') === 'grill-akcesoria', gdzie('podpałka'));
ok('tacki aluminiowe to akcesoria', gdzie('tacki aluminiowe') === 'grill-akcesoria', gdzie('tacki aluminiowe'));
ok('kielbaski zostaja przy miesie', gdzie('kiełbaski na grilla') === 'grill', gdzie('kiełbaski na grilla'));
ok('akcesoria do grilla robia kosz, nie lodowke',
   typeForSections(['grill-akcesoria'], [], 'klocek') === 'kosz',
   typeForSections(['grill-akcesoria'], [], 'klocek'));
ok('grill robi lodowke',
   typeForSections(['grill'], [], 'klocek') === 'lodowka',
   typeForSections(['grill'], [], 'klocek'));


console.log('');
console.log('--- strefa Parkside ---');
ok('parkside trafia w narzedzia', gdzie('parkside') === 'narzedzia', gdzie('parkside'));
for (const co of ['wiertarka', 'wkrętarka', 'młotek', 'śrubokręt', 'kombinerki', 'poziomica', 'rękawice robocze', 'papier ścierny', 'taśma izolacyjna', 'latarka']) {
  ok(`${co} trafia w narzedzia`, gdzie(co) === 'narzedzia', gdzie(co));
}

console.log('');
console.log('--- strefy rotacyjne ---');
// Rotujaca czesc lodowki: co tydzien co innego, ale to wciaz lodowka.
ok('oferta czasowa w lodowce robi lodowke',
   typeForSections(['oferta-czasowa-lodowka'], [], 'klocek') === 'lodowka',
   typeForSections(['oferta-czasowa-lodowka'], [], 'klocek'));
// Wymieszane kosze z przecenami: dostep ze wszystkich stron, wiec kosz.
ok('kosze promocyjne robia kosz',
   typeForSections(['kosze-promocyjne'], [], 'klocek') === 'kosz',
   typeForSections(['kosze-promocyjne'], [], 'klocek'));
ok('oferta czasowa na polce zostaje zwyklym regalem',
   typeForSections(['oferta-czasowa-polka'], [], 'klocek') === 'regal-scienny',
   typeForSections(['oferta-czasowa-polka'], [], 'klocek'));
ok('kuchnia grecka trafia w rotacyjna lodowke', gdzie('kuchnia grecka') === 'oferta-czasowa-lodowka', gdzie('kuchnia grecka'));



console.log('\n--- scalone kasy ---');
ok('kasy samoobslugowe mapuja sie na kasy', normalizeType('kasy-samo') === 'kasy');
ok('stara chlodnia mapuje sie na lodowke', normalizeType('chlodnia') === 'lodowka');
ok('kompletnie obcy typ odrzucony', normalizeType('teleporter') === null);

console.log('\n--- typ klocka wynika z kategorii ---');
// Nie wybiera sie typu z gory: stawia sie klocek i przypisuje kategorie,
// a lodowka, lada czy regal dwustronny wychodzi z tego sama.
ok('pusty klocek zostaje klockiem', typeForSections([], [], 'klocek') === 'klocek');
ok('mleko robi lodowke', typeForSections(['mleko'], [], 'klocek') === 'lodowka');
ok('jogurty tez robia lodowke', typeForSections(['jogurty'], [], 'klocek') === 'lodowka');
ok('mrozone warzywa robia zamrazarke', typeForSections(['mrozone-warzywa'], [], 'klocek') === 'zamrazarka');
ok('lody tez robia zamrazarke', typeForSections(['lody'], [], 'klocek') === 'zamrazarka');
ok('warzywa robia stoisko', typeForSections(['warzywa'], [], 'klocek') === 'stoisko');
ok('owoce tez robia stoisko', typeForSections(['owoce'], [], 'klocek') === 'stoisko');
ok('wedliny robia lade', typeForSections(['wedliny-lada'], [], 'klocek') === 'lada');
ok('czekolady robia regal jednostronny', typeForSections(['czekolady'], [], 'klocek') === 'regal-scienny');
ok('druga kategoria robi regal dwustronny',
   typeForSections(['mleko'], ['czekolady'], 'lodowka') === 'regal',
   typeForSections(['mleko'], ['czekolady'], 'lodowka'));
ok('zdjecie kategorii wraca do pustego klocka',
   typeForSections([], [], 'lodowka') === 'klocek');
ok('sciana zostaje sciana', typeForSections([], [], 'sciana') === 'sciana');
ok('kasy zostaja kasami', typeForSections([], [], 'kasy') === 'kasy');
ok('wejscie zostaje wejsciem', typeForSections([], [], 'wejscie') === 'wejscie');
ok('kilka kategorii na klocku nie psuje typu',
   typeForSections(['sushi', 'masla'], [], 'klocek') === 'lodowka',
   typeForSections(['sushi', 'masla'], [], 'klocek'));
// W palecie zostaja tylko te klocki, ktorych z kategorii wyprowadzic sie nie da.
// Reszta bierze sie z przypisanej kategorii, wiec wybieranie typu z gory nie ma sensu.
ok('paleta nie proponuje typow wynikajacych z kategorii',
   !PLACEABLE.some((x) => ['regal', 'regal-scienny', 'lodowka', 'zamrazarka', 'lada', 'stoisko', 'kosz'].includes(x.key)),
   PLACEABLE.map((x) => x.key).join(', '));
ok('w palecie sa wejscie i kasy',
   PLACEABLE.some((x) => x.key === 'wejscie') && PLACEABLE.some((x) => x.key === 'kasy'),
   PLACEABLE.map((x) => x.key).join(', '));

console.log('\n--- obracanie co 45 stopni ---');
const reg = map.blocks.find((x) => x.id === 'b1')!;
ok('start bez obrotu', reg.rot === 0);
ok('jeden krok to 45 stopni', rotateBlock(reg).rot === 45);
ok('osiem krokow wraca do zera', (() => {
  let cur = reg;
  for (let i = 0; i < 8; i++) cur = rotateBlock(cur);
  return cur.rot === 0;
})());
ok('obrot w druga strone', rotateBlock(reg, -1).rot === 315);

// Punkt odniesienia to PIERWSZA kratka, wiec dlugi regal zatacza spory luk.
// Przy krawedzi planu czesc odcisku wypada poza siatke i to jest poprawne —
// od wsuniecia go z powrotem jest findSpot. Powierzchnie mierzymy tam,
// gdzie klocek ma dosc miejsca dookola.
const wolny: StoreMap = { gridW: 30, gridH: 30, blocks: [] };
const probka = b('p', 'regal', 15, 10, 1, 9);
const pion = cellsOf(wolny, probka).length;
const lezacy = cellsOf(wolny, { ...probka, rot: 90 }).length;
ok('obrot o 90 nie gubi powierzchni', pion === lezacy, `${pion} vs ${lezacy}`);
ok('przy krawedzi planu odcisk sie przycina',
   cellsOf(map, { ...reg, rot: 90 }).length < cellsOf(map, reg).length,
   'i od tego jest findSpot');

const skos = cellsOf(map, { ...reg, rot: 45 });
ok('skos daje ciagly odcisk', skos.length >= pion, `${skos.length} kratek przy ${pion} w pionie`);

// Punkt odniesienia to pierwsza kratka klocka — po obrocie ma w odcisku zostac
ok('pierwsza kratka zostaje po obrocie o 90',
   cellsOf(map, { ...reg, rot: 90 }).includes(reg.y * map.gridW + reg.x));
ok('pierwsza kratka zostaje po obrocie o 45',
   cellsOf(map, { ...reg, rot: 45 }).includes(reg.y * map.gridW + reg.x));

console.log('\n--- uchwyty bokow (matematyka rozciagania) ---');
// Kierunek "na zewnatrz" danej sciany, po uwzglednieniu obrotu klocka.
// Od tego zalezy, czy ciagniecie myszka wydluza czy skraca.
const bliskie = (a: number, b2: number) => Math.abs(a - b2) < 0.001;
const n0 = sideNormal('S', 0);
ok('bez obrotu: dol to (0,1)', bliskie(n0.nx, 0) && bliskie(n0.ny, 1));
const e0 = sideNormal('E', 0);
ok('bez obrotu: prawo to (1,0)', bliskie(e0.nx, 1) && bliskie(e0.ny, 0));
const n90 = sideNormal('S', 90);
ok('po 90 stopniach dol staje sie lewo', bliskie(n90.nx, -1) && bliskie(n90.ny, 0),
   `(${n90.nx.toFixed(2)}, ${n90.ny.toFixed(2)})`);
const e45 = sideNormal('E', 45);
ok('po 45 stopniach prawo to skos',
   bliskie(e45.nx, Math.SQRT1_2) && bliskie(e45.ny, Math.SQRT1_2),
   `(${e45.nx.toFixed(2)}, ${e45.ny.toFixed(2)})`);
ok('przeciwlegle sciany maja przeciwne kierunki', (() => {
  const a = sideNormal('N', 135);
  const s2 = sideNormal('S', 135);
  return bliskie(a.nx, -s2.nx) && bliskie(a.ny, -s2.ny);
})());

// Uchwyt musi trzymac sie rogu klocka takze po obrocie
const rogPoObrocie = rotateAround(11, 8, 10.5, 8.5, 90);
ok('rog klocka obraca sie wokol pierwszej kratki',
   bliskie(rogPoObrocie.x, 11) && bliskie(rogPoObrocie.y, 9),
   `(${rogPoObrocie.x}, ${rogPoObrocie.y})`);
ok('bez obrotu punkt zostaje na miejscu', (() => {
  const p = rotateAround(3, 7, 1, 1, 0);
  return p.x === 3 && p.y === 7;
})());

console.log('\n--- gotowy uklad startowy ---');
const starter = createStarterMap();
const sv = validate(starter);
ok('gotowy uklad przechodzi walidacje', sv.ok, sv.errors.join(' | '));
ok('nie ma ostrzezen o pustych regalach', sv.warnings.length === 0, sv.warnings.join(' | '));
console.log(`  ${starter.gridW}x${starter.gridH} kratek, ${starter.blocks.length} klockow, ${starterSectionCount()} sekcji`);

// Zadne dwa klocki nie moga sie nakladac — inaczej plan jest sprzeczny
let kolizja = false;
for (let i = 0; i < starter.blocks.length && !kolizja; i++) {
  const mine = new Set(cellsOf(starter, starter.blocks[i]));
  for (let j = i + 1; j < starter.blocks.length; j++) {
    if (cellsOf(starter, starter.blocks[j]).some((c) => mine.has(c))) {
      kolizja = true;
      console.log(`  kolizja: ${starter.blocks[i].id} z ${starter.blocks[j].id}`);
      break;
    }
  }
}
ok('zadne klocki sie nie nakladaja', !kolizja);
ok('wszystkie klocki miesza sie w planie', starter.blocks.every((x) => fits(starter, x)));

// I najwazniejsze: da sie po tym przejsc trasa
const wszystkie = [...sectionGroups(starter).keys()];
const t1 = Date.now();
const rStart = computeRoute(starter, wszystkie);
const msStart = Date.now() - t1;
ok('trasa przez caly sklep sie liczy', !!rStart);
if (rStart) {
  ok('kazda sekcja jest osiagalna', rStart.unreachable.length === 0, rStart.unreachable.join(', '));
  ok('liczy sie szybko', msStart < 800, `${msStart} ms`);
  console.log(`  trasa przez ${rStart.order.length} sekcji: ${rStart.cost} m, dokladna: ${rStart.exact}`);
  const naiwna = costForOrder(starter, wszystkie);
  console.log(`  po kolei bez liczenia: ${naiwna} m`);
  ok('liczona trasa nie jest dluzsza', naiwna !== null && rStart.cost <= naiwna);
}

ok('pusty wariant ma tylko wejscie i kasy', createBareMap().blocks.length === 2);

console.log('\n--- duplikowanie klocka (Alt + przeciagniecie) ---');
// Kopia dostaje NOWE id, wiec findSpot nie ignoruje oryginalu i musi ja odsunac.
// Gdyby ignorowal, kopia stanelaby dokladnie na oryginale i plan bylby sprzeczny.
const doKopii = starter.blocks.find((x) => x.type === 'regal')!;
const kopia = { ...doKopii, id: 'kopia_1' };
const miejsce = findSpot(starter, kopia, 3);
ok('kopia dostaje miejsce', miejsce !== null);
if (miejsce) {
  ok('kopia nie stoi na oryginale',
     !(miejsce.x === doKopii.x && miejsce.y === doKopii.y),
     `oryginal @${doKopii.x},${doKopii.y} kopia @${miejsce.x},${miejsce.y}`);
  ok('kopia zachowuje typ, rozmiar i sekcje',
     miejsce.type === doKopii.type && miejsce.w === doKopii.w && miejsce.h === doKopii.h &&
     miejsce.sections.join() === doKopii.sections.join() && miejsce.sectionsB.join() === doKopii.sectionsB.join());
  const zKopia: StoreMap = { ...starter, blocks: [...starter.blocks, miejsce] };
  ok('plan z kopia nadal bez kolizji', !overlaps(zKopia, miejsce, miejsce.id));
  ok('plan z kopia nadal przechodzi walidacje', validate(zKopia).ok,
     validate(zKopia).errors.join(' | '));
}

console.log('\n--- wiele kategorii na jednym klocku ---');
// Regal potrafi miec sushi na srodkowej polce i maslo na dolnej. Z punktu widzenia
// trasy leza w TYM SAMYM miejscu: stoisz raz i siegasz po jedno i drugie.
const polki: StoreMap = {
  gridW: 12,
  gridH: 12,
  blocks: [
    b('e', 'wejscie', 0, 11, 3, 1),
    b('k', 'kasy', 9, 8, 2, 3),
    {
      id: 'polkowy', type: 'lodowka', x: 4, y: 3, w: 1, h: 4, rot: 0,
      sections: ['sushi', 'masla', 'jogurty'], sectionsB: [],
    },
  ],
};
const grupy = sectionGroups(polki);
ok('wszystkie trzy kategorie sa na planie',
   (['sushi', 'masla', 'jogurty'] as SectionKey[]).every((k) => grupy.has(k)));
ok('i wszystkie maja te same kratki dostepu',
   grupy.get('sushi')!.join() === grupy.get('masla')!.join() &&
   grupy.get('masla')!.join() === grupy.get('jogurty')!.join());

const rPolki = computeRoute(polki, ['sushi', 'masla', 'jogurty']);
ok('trasa przez trzy kategorie sie liczy', !!rPolki);
if (rPolki) {
  ok('zadna nie wypadla', rPolki.unreachable.length === 0);
  const jedna = computeRoute(polki, ['sushi']);
  console.log('  trzy polki jednego regalu:', rPolki.cost, 'm | sama jedna:', jedna?.cost, 'm');
  ok('trzy kategorie w jednym miejscu nie wydluzaja trasy',
     !!jedna && rPolki.cost === jedna.cost,
     `${rPolki.cost} vs ${jedna?.cost}`);
}

// Dwie strony to co innego: tam faktycznie stoi sie gdzie indziej
const dwiestrony: StoreMap = {
  gridW: 12,
  gridH: 12,
  blocks: [
    b('e', 'wejscie', 0, 11, 3, 1),
    b('k', 'kasy', 9, 8, 2, 3),
    {
      id: 'dwustr', type: 'regal', x: 4, y: 3, w: 2, h: 4, rot: 0,
      sections: ['makarony'], sectionsB: ['czekolady'],
    },
  ],
};
const g2 = sectionGroups(dwiestrony);
ok('dwie strony maja ROZNE kratki dostepu',
   g2.get('makarony')!.join() !== g2.get('czekolady')!.join());

console.log('\n--- przeciaganie przez przeszkody ---');
// Klocek ma przechodzic przez inne w trakcie ciagniecia, a porzadek robi sie
// po puszczeniu. Tu sprawdzamy sam finał: klocek postawiony NA innym musi
// dostac najblizsze wolne miejsce, a nie zostac w nakladce.
const ciasny: StoreMap = {
  gridW: 12,
  gridH: 12,
  blocks: [
    b('e', 'wejscie', 0, 11, 3, 1),
    b('k', 'kasy', 9, 8, 2, 3),
    b('stoi', 'regal-scienny', 4, 4, 1, 3, 'makarony'),
    b('ciagniety', 'klocek', 8, 2, 1, 1),
  ],
};
const nadInnym = { ...ciasny.blocks.find((x) => x.id === 'ciagniety')!, x: 4, y: 5 };
ok('klocek faktycznie naklada sie po przeciagnieciu',
   overlaps({ ...ciasny, blocks: ciasny.blocks.map((x) => (x.id === 'ciagniety' ? nadInnym : x)) },
            nadInnym, 'ciagniety'));
const rozwiazane = findSpot(
  { ...ciasny, blocks: ciasny.blocks.map((x) => (x.id === 'ciagniety' ? nadInnym : x)) },
  nadInnym,
  4
);
ok('po puszczeniu dostaje wolne miejsce obok', rozwiazane !== null,
   rozwiazane ? `@${rozwiazane.x},${rozwiazane.y}` : 'brak');
if (rozwiazane) {
  ok('i to miejsce jest blisko', Math.abs(rozwiazane.x - 4) <= 4 && Math.abs(rozwiazane.y - 5) <= 4);
}
ok('nowy klocek ma jedna kratke', BLOCK_BY_KEY['klocek'].size.join('x') === '1x1');

console.log('\n--- nowe sekcje: sushi i przekaski miesne ---');
ok('sushi jest osobna sekcja', sectionName('sushi') === 'Sushi');
ok('kabanosy maja wlasna sekcje',
   sectionName('przekaski-miesne') === 'Kabanosy i przekąski mięsne');
ok('przekaski miesne to sucha polka, wiec regal',
   typeForSections(['przekaski-miesne'], [], 'klocek') === 'regal-scienny');
ok('sushi to chlodnia', typeForSections(['sushi'], [], 'klocek') === 'lodowka');

console.log('\n--- kategorie kolorow ---');
// Uwaga: kategoria KOLORU to co innego niz klucz sekcji. Jogurty, mleko i sery
// to osobne sekcje, ale na planie maja ten sam kolor — bo stoja w tej samej chlodni.
ok('warzywa maja kolor swiezych', sectionCategory('warzywa') === 'swieze');
ok('mleko ma kolor nabialu', sectionCategory('mleko') === 'nabial');
ok('jogurty maja ten sam kolor co mleko',
   sectionCategory('jogurty') === sectionCategory('mleko'));
ok('sery zolte tez', sectionCategory('sery-zolte') === 'nabial');
ok('mrozone warzywa maja kolor mrozonych', sectionCategory('mrozone-warzywa') === 'mrozone');
ok('pranie ma kolor chemii', sectionCategory('pranie') === 'chemia');
ok('makarony i maki maja kolor suchych',
   sectionCategory('makarony') === 'suche' && sectionCategory('maki') === 'suche');

console.log('\n--- walidacja ---');
const v = validate(map);
ok('plan przechodzi walidacje', v.ok, v.errors.join(' | '));
ok('brak wejscia = blad',
   !validate({ ...map, blocks: map.blocks.filter((x) => x.type !== 'wejscie') }).ok);

const boxedIn: StoreMap = {
  ...map,
  blocks: [
    ...map.blocks,
    b('x1', 'sciana', 0, 5, 1, 1),
    b('x2', 'sciana', 0, 7, 1, 1),
    b('x3', 'sciana', 1, 6, 1, 1),
    b('x4', 'regal', 0, 6, 1, 1, 'ryby-swieze'),
  ],
};
ok('regal bez dostepu = blad', !validate(boxedIn).ok);
ok('domyslny plan jest poprawny', validate(createDefaultMap()).errors.length === 0,
   validate(createDefaultMap()).errors.join(' | '));

console.log('\n--- kolizje na odciskach ---');
const luzno: StoreMap = {
  gridW: 12,
  gridH: 12,
  blocks: [b('e', 'wejscie', 0, 11, 3, 1), b('k', 'kasy', 9, 8, 2, 3), b('r', 'regal', 5, 3, 1, 4)],
};
const rl = luzno.blocks.find((x) => x.id === 'r')!;
ok('obrocony klocek dostaje miejsce', findSpot(luzno, rotateBlock(rl)) !== null);
ok('findSpot nie oszukuje przy braku miejsca', findSpot(
  { gridW: 3, gridH: 3, blocks: [
    b('r', 'regal', 0, 0, 1, 2),
    b('s1', 'sciana', 1, 0, 1, 3),
    b('s2', 'sciana', 2, 0, 1, 3),
    b('s3', 'sciana', 0, 2, 1, 1),
  ] },
  { ...b('r', 'regal', 0, 0, 1, 2), rot: 90 },
  0
) === null);

console.log('\n--- trasa ---');
const needed: SectionKey[] = ['mleko', 'warzywa', 'czekolady', 'pranie'];
const r = computeRoute(map, needed);
ok('trasa policzona', r !== null);

if (r) {
  console.log('  kolejnosc:', r.order.map(sectionName).join(' -> '));
  console.log('  dlugosc:', r.cost, 'm | dokladna:', r.exact);
  ok('wszystkie sekcje w trasie', r.order.length === needed.length, `${r.order.length}/${needed.length}`);
  ok('rozwiazanie dokladne', r.exact);

  let contiguous = true;
  let throughWall = false;
  for (let i = 0; i < r.path.length; i++) {
    if (walls[r.path[i]]) throughWall = true;
    if (i === 0) continue;
    const p = r.path[i - 1];
    const q = r.path[i];
    const px = p % map.gridW, py = (p - px) / map.gridW;
    const qx = q % map.gridW, qy = (q - qx) / map.gridW;
    if (Math.abs(px - qx) + Math.abs(py - qy) !== 1) contiguous = false;
  }
  ok('sciezka ciagla', contiguous);
  ok('sciezka omija sciany', !throughWall);
  ok('start na kratce wejscia', entranceCells(map).includes(r.path[0]));
  ok('koniec przy kasach', checkoutCells(map).includes(r.path[r.path.length - 1]));

  const naive: SectionKey[] = ['czekolady', 'mleko', 'warzywa', 'pranie'];
  const naiveCost = costForOrder(map, naive);
  console.log('  wpisane:', naiveCost, 'm  vs  trasa:', r.cost, 'm');
  ok('trasa nie dluzsza niz kolejnosc wpisywania', naiveCost !== null && r.cost <= naiveCost);
  ok('koszt zgadza sie ze sciezka', costForOrder(map, r.order) === r.cost,
     `${costForOrder(map, r.order)} vs ${r.cost}`);
}

console.log('\n--- przypadki brzegowe ---');
const r2 = computeRoute(map, ['mleko', 'lody']);
ok('lody trafily do nieosiagalnych', !!r2 && r2.unreachable.includes('lody'));
ok('bez kas trasa = null',
   computeRoute({ ...map, blocks: map.blocks.filter((x) => x.type !== 'kasy') }, ['mleko']) === null);

console.log('\n--- realna skala Lidla (pomiar z Google Maps) ---');
// 1679 m2, bok 50 m -> mniej wiecej 50x34
const duzy: StoreMap = { gridW: 50, gridH: 34, blocks: createDefaultMap().blocks };
ok('siatka 50x34 to ok. 1700 m2', Math.abs(areaM2(duzy) - 1700) < 30, `${areaM2(duzy)} m2`);
const t0 = Date.now();
const rDuzy = computeRoute(
  { ...duzy, blocks: [
    b('e', 'wejscie', 2, 33, 3, 1),
    b('k', 'kasy', 20, 29, 2, 4),
    b('r1', 'regal', 8, 5, 1, 20, 'mleko', 'czekolady'),
    b('r2', 'regal', 14, 5, 1, 20, 'napoje-gazowane', 'chipsy'),
    b('r3', 'regal', 30, 5, 1, 20, 'pranie', 'konserwy-warzywne'),
    b('r4', 'stoisko', 3, 2, 20, 2, 'warzywa'),
  ] },
  ['mleko', 'czekolady', 'napoje-gazowane', 'chipsy', 'pranie', 'konserwy-warzywne', 'warzywa']
);
const ms = Date.now() - t0;
ok('duzy sklep liczy sie poprawnie', !!rDuzy && rDuzy.order.length === 7, `${rDuzy?.order.length}/7`);
ok('i robi to szybko', ms < 500, `${ms} ms`);
console.log('  trasa:', rDuzy?.cost, 'm przez', rDuzy?.order.length, 'sekcji');

console.log(fail === 0 ? '\nWSZYSTKO OK' : `\n${fail} BLEDOW`);
process.exit(fail === 0 ? 0 : 1);
