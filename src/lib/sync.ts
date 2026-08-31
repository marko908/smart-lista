/**
 * Synchronizacja z kontem.
 *
 * ZASADA: telefon jest źródłem prawdy, baza jest miejscem spotkania. W sklepie
 * nie ma zasięgu, więc nic tutaj nie może być warunkiem działania aplikacji.
 * Każda funkcja kończy się cicho, gdy nie ma sieci albo konta — i to jest
 * zachowanie poprawne, nie awaria.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KOLEJNOŚĆ MA ZNACZENIE: NAJPIERW POBIERZ, POTEM WYŚLIJ
 *
 * Gdyby było odwrotnie, świeża instalacja z pustym stanem skasowałaby konto.
 * Człowiek loguje się na nowym telefonie, aplikacja widzi zero list, wysyła
 * „mam zero list" i po jego dwóch latach zakupów nie ma śladu.
 *
 * Dlatego kasowanie NIGDY nie wynika z nieobecności dokumentu. Zniknięcie musi
 * być zadeklarowane wprost — przez nagrobek zostawiony przy usuwaniu.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Konflikty rozstrzyga `zmieniono`: wygrywa nowsza wersja CAŁEGO dokumentu.
 * Scalanie po pojedynczej pozycji listy dałoby ładniejszy wynik przy dwóch
 * osobach piszących naraz, ale tu jest jeden właściciel na dwóch urządzeniach
 * i taka złożoność nie ma za co się zwrócić.
 */

import { supabase } from './supabase';
import { migrateStore, newId } from './storage';
import type { AppState, Nagrobek, ShoppingList, Store } from './types';

export type StanSynchronizacji =
  | { stan: 'wylaczona' }
  | { stan: 'bezczynna'; ostatnio: string | null }
  | { stan: 'pracuje' }
  | { stan: 'blad'; powod: string };

/** Nowsza z dwóch dat ISO. Brak daty przegrywa z każdą datą. */
function nowsza(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a) return false;
  if (!b) return true;
  return a > b;
}

type WierszListy = {
  id: string;
  nazwa: string;
  sklep_id: string | null;
  pozycje: unknown;
  zmieniono: string;
  utworzono: string;
};

type WierszSklepu = {
  id: string;
  nazwa: string;
  siec: string;
  plan: unknown;
  marszruta: unknown;
  zmieniono: string;
  utworzono: string;
};

/**
 * Pełna synchronizacja: pobranie, scalenie, odesłanie.
 *
 * Zwraca nowy stan albo `null`, gdy nie było czego robić (brak konta, brak
 * sieci). `null` nie jest błędem — aplikacja ma wtedy działać tak jak zwykle.
 */
export async function synchronizuj(stan: AppState): Promise<AppState | null> {
  if (!supabase) return null;

  const { data: sesja } = await supabase.auth.getSession();
  const wlasciciel = sesja.session?.user?.id;
  if (!wlasciciel) return null;

  // ── 1. Nagrobki najpierw, żeby pobranie nie wskrzesiło tego, co skasowane ──
  const zostaleNagrobki = await pochowaj(stan.nagrobki);

  // ── 2. Pobranie ──
  const [odpSklepy, odpListy] = await Promise.all([
    supabase.from('sklepy').select('*').eq('wlasciciel', wlasciciel),
    supabase.from('listy').select('*').eq('wlasciciel', wlasciciel),
  ]);
  if (odpSklepy.error) throw new Error(odpSklepy.error.message);
  if (odpListy.error) throw new Error(odpListy.error.message);

  const pochowane = new Set(stan.nagrobki.map((n) => n.zdalneId));
  const zdalneSklepy = (odpSklepy.data ?? []).filter((r) => !pochowane.has(r.id)) as WierszSklepu[];
  const zdalneListy = (odpListy.data ?? []).filter((r) => !pochowane.has(r.id)) as WierszListy[];

  const sklepy = scalSklepy(stan.stores, zdalneSklepy);
  const listy = scalListy(stan.lists, zdalneListy);

  // ── 3. Odesłanie tego, co lokalnie nowsze albo jeszcze nieznane bazie ──
  const poSklepach = await wyslijSklepy(sklepy, wlasciciel, zdalneSklepy);
  const poListach = await wyslijListy(listy, wlasciciel, zdalneListy, poSklepach);

  return { ...stan, stores: poSklepach, lists: poListach, nagrobki: zostaleNagrobki };
}

/** Kasowanie w bazie tego, co człowiek skasował na telefonie. */
async function pochowaj(nagrobki: Nagrobek[]): Promise<Nagrobek[]> {
  if (!supabase || nagrobki.length === 0) return nagrobki;
  const zostaja: Nagrobek[] = [];
  for (const tabela of ['listy', 'sklepy'] as const) {
    const ids = nagrobki.filter((n) => n.tabela === tabela).map((n) => n.zdalneId);
    if (!ids.length) continue;
    const { error } = await supabase.from(tabela).delete().in('id', ids);
    // Nieudane kasowanie zostawiamy na następny raz. Ślad jest tani,
    // a lista, która wraca po skasowaniu, jest bardzo drażniąca.
    if (error) zostaja.push(...nagrobki.filter((n) => n.tabela === tabela));
  }
  return zostaja;
}

function scalSklepy(lokalne: Store[], zdalne: WierszSklepu[]): Store[] {
  const wynik = [...lokalne];
  const wgZdalnego = new Map(lokalne.map((s) => [s.zdalneId, s] as const));

  for (const r of zdalne) {
    const nasz = wgZdalnego.get(r.id);
    if (!nasz) {
      wynik.push(zeSklepu(r));
      continue;
    }
    if (nowsza(r.zmieniono, nasz.zmieniono)) {
      const i = wynik.indexOf(nasz);
      wynik[i] = { ...zeSklepu(r), id: nasz.id };
    }
  }
  return wynik;
}

function zeSklepu(r: WierszSklepu): Store {
  const surowy = {
    id: newId('store'),
    name: r.nazwa,
    chain: r.siec,
    map: r.plan ?? null,
    walkOrder: Array.isArray(r.marszruta) ? r.marszruta : [],
    mappedAt: r.plan ? r.zmieniono : null,
    createdAt: r.utworzono,
  };
  // Plan przechodzi przez tę samą migrację co zapis lokalny — baza może
  // trzymać dokument zapisany starszą wersją modelu klocków.
  const sklep = (migrateStore(surowy) ?? (surowy as unknown as Store)) as Store;
  return { ...sklep, zmieniono: r.zmieniono, zdalneId: r.id };
}

function scalListy(lokalne: ShoppingList[], zdalne: WierszListy[]): ShoppingList[] {
  const wynik = [...lokalne];
  const wgZdalnego = new Map(lokalne.map((l) => [l.zdalneId, l] as const));

  for (const r of zdalne) {
    const nasza = wgZdalnego.get(r.id);
    if (!nasza) {
      wynik.push(zListy(r, null));
      continue;
    }
    if (nowsza(r.zmieniono, nasza.zmieniono)) {
      const i = wynik.indexOf(nasza);
      wynik[i] = { ...zListy(r, nasza.storeId), id: nasza.id };
    }
  }
  return wynik;
}

function zListy(r: WierszListy, storeId: string | null): ShoppingList {
  return {
    id: newId('list'),
    name: r.nazwa,
    storeId,
    items: Array.isArray(r.pozycje) ? (r.pozycje as ShoppingList['items']) : [],
    createdAt: r.utworzono,
    zmieniono: r.zmieniono,
    zdalneId: r.id,
  };
}

async function wyslijSklepy(
  sklepy: Store[],
  wlasciciel: string,
  zdalne: WierszSklepu[]
): Promise<Store[]> {
  if (!supabase) return sklepy;
  const wgId = new Map(zdalne.map((r) => [r.id, r] as const));
  const wynik: Store[] = [];

  for (const s of sklepy) {
    const zdalny = s.zdalneId ? wgId.get(s.zdalneId) : undefined;
    if (zdalny && !nowsza(s.zmieniono, zdalny.zmieniono)) {
      wynik.push(s);
      continue;
    }
    const wiersz = {
      wlasciciel,
      nazwa: s.name,
      siec: s.chain,
      plan: s.map,
      marszruta: s.walkOrder,
    };
    const { data, error } = s.zdalneId
      ? await supabase.from('sklepy').update(wiersz).eq('id', s.zdalneId).select('id, zmieniono').single()
      : await supabase.from('sklepy').insert(wiersz).select('id, zmieniono').single();
    if (error || !data) {
      wynik.push(s);
      continue;
    }
    wynik.push({ ...s, zdalneId: data.id, zmieniono: data.zmieniono });
  }
  return wynik;
}

async function wyslijListy(
  listy: ShoppingList[],
  wlasciciel: string,
  zdalne: WierszListy[],
  sklepy: Store[]
): Promise<ShoppingList[]> {
  if (!supabase) return listy;
  const wgId = new Map(zdalne.map((r) => [r.id, r] as const));
  // Lista wskazuje sklep lokalnym identyfikatorem; baza chce zdalnego.
  const zdalnySklep = new Map(sklepy.map((s) => [s.id, s.zdalneId ?? null] as const));
  const wynik: ShoppingList[] = [];

  for (const l of listy) {
    const zdalna = l.zdalneId ? wgId.get(l.zdalneId) : undefined;
    if (zdalna && !nowsza(l.zmieniono, zdalna.zmieniono)) {
      wynik.push(l);
      continue;
    }
    const wiersz = {
      wlasciciel,
      nazwa: l.name,
      sklep_id: l.storeId ? zdalnySklep.get(l.storeId) ?? null : null,
      pozycje: l.items,
    };
    const { data, error } = l.zdalneId
      ? await supabase.from('listy').update(wiersz).eq('id', l.zdalneId).select('id, zmieniono').single()
      : await supabase.from('listy').insert(wiersz).select('id, zmieniono').single();
    if (error || !data) {
      wynik.push(l);
      continue;
    }
    wynik.push({ ...l, zdalneId: data.id, zmieniono: data.zmieniono });
  }
  return wynik;
}
