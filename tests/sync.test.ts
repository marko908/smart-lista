declare const process: { exit(code: number): never };

/**
 * Synchronizacja — testujemy to, co może skasować czyjeś dane.
 *
 * Reszta (zapytania do bazy) wymaga sieci i konta, więc sprawdza się ją ręcznie.
 * Tutaj jest logika, która decyduje CO wysłać i CO skasować — a jej błąd
 * kosztuje człowieka listy zakupów, nie komunikat o błędzie.
 */

import { ostempluj } from '../src/lib/storage';
import { EMPTY_STATE, type AppState, type ShoppingList } from '../src/lib/types';

let fail = 0;
function ok(label: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'OK  ' : 'BLAD'}  ${label}${extra ? '   ' + extra : ''}`);
}

function lista(id: string, nazwa: string, zdalneId: string | null = null): ShoppingList {
  return {
    id, name: nazwa, storeId: null, items: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    zmieniono: '2026-01-01T00:00:00.000Z',
    zdalneId,
  };
}

function stan(listy: ShoppingList[], nagrobki: AppState['nagrobki'] = []): AppState {
  return { ...EMPTY_STATE, lists: listy, nagrobki };
}

console.log('--- stempel czasu ---');
const a = stan([lista('l1', 'Zakupy'), lista('l2', 'Biedronka')]);
const bezZmian = ostempluj(a, stan([...a.lists]));
ok('dokument bez zmian nie dostaje nowego stempla',
   bezZmian.lists[0].zmieniono === a.lists[0].zmieniono);

const zmieniona = ostempluj(a, stan([{ ...a.lists[0], name: 'Inna nazwa' }, a.lists[1]]));
ok('zmieniony dokument dostaje nowy stempel',
   zmieniona.lists[0].zmieniono !== a.lists[0].zmieniono);
ok('sąsiad nie dostaje stempla bez powodu',
   zmieniona.lists[1].zmieniono === a.lists[1].zmieniono);

const nowa = ostempluj(a, stan([...a.lists, lista('l3', 'Nowa')]));
ok('nowy dokument dostaje stempel', typeof nowa.lists[2].zmieniono === 'string');

console.log('\n--- ślady po skasowanych ---');
const znana = stan([lista('l1', 'Zakupy', 'uuid-1'), lista('l2', 'Druga', 'uuid-2')]);
const poKasowaniu = ostempluj(znana, stan([znana.lists[1]]));
ok('skasowanie znanej bazie listy zostawia ślad',
   poKasowaniu.nagrobki.length === 1 && poKasowaniu.nagrobki[0].zdalneId === 'uuid-1',
   JSON.stringify(poKasowaniu.nagrobki));
ok('ślad wskazuje właściwą tabelę', poKasowaniu.nagrobki[0]?.tabela === 'listy');

const tylkoLokalna = stan([lista('l1', 'Nigdy niewysłana', null)]);
const poKasowaniuLokalnej = ostempluj(tylkoLokalna, stan([]));
ok('skasowanie listy nieznanej bazie NIE zostawia śladu',
   poKasowaniuLokalnej.nagrobki.length === 0,
   JSON.stringify(poKasowaniuLokalnej.nagrobki));

console.log('\n--- świeża instalacja nie kasuje konta ---');
// To jest scenariusz, ktory mogl kosztowac czlowieka wszystko: loguje sie na
// nowym telefonie, stan lokalny jest pusty. Pusty stan nie moze byc rozumiany
// jako "skasuj wszystko" — zniknięcie musi byc zadeklarowane wprost.
const swiezaInstalacja = ostempluj(EMPTY_STATE, EMPTY_STATE);
ok('pusty stan nie produkuje ani jednego śladu kasowania',
   swiezaInstalacja.nagrobki.length === 0);

console.log('\n--- ślady się kumulują, nie gubią ---');
const zeSladem = stan([lista('l1', 'A', 'uuid-1')], [{ zdalneId: 'stary', tabela: 'sklepy' }]);
const poDrugim = ostempluj(zeSladem, stan([], zeSladem.nagrobki));
ok('wcześniejszy ślad przeżywa kolejne kasowanie',
   poDrugim.nagrobki.length === 2, JSON.stringify(poDrugim.nagrobki.map((n) => n.zdalneId)));

console.log(fail === 0 ? '\nWSZYSTKO OK' : `\n${fail} BLEDOW`);
process.exit(fail === 0 ? 0 : 1);
