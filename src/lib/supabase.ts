/**
 * Połączenie z Supabase.
 *
 * Konto jest WARUNKIEM wejścia do aplikacji — bramka stoi w `_layout.tsx`.
 * Ale NIE jest warunkiem działania: w sklepie nie ma zasięgu, więc raz
 * zalogowany człowiek liczy trasę i odhacza zakupy całkowicie offline.
 * Bramka pyta o to, czy ktoś się tu kiedykolwiek zalogował, a nie o to, czy
 * właśnie teraz da się to potwierdzić w sieci.
 *
 * `supabase` może być `null` — gdy nie ma konfiguracji, cała warstwa sieciowa
 * nie istnieje i bramka się nie pojawia. Bez tego pomyłka we wdrożeniu
 * (zapomniane zmienne środowiskowe) zamieniłaby aplikację w martwy ekran
 * logowania, przez który nie da się przejść.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Klucz publikowalny (`sb_publishable_...`).
 *
 * Następca dawnego klucza `anon` — jest przeznaczony do zaszycia w aplikacji
 * i respektuje reguły RLS. Nie mylić z kluczem tajnym (`sb_secret_...`), który
 * RLS OMIJA i nie ma prawa znaleźć się po stronie klienta.
 *
 * Starą nazwę zmiennej czytamy nadal, żeby nie zepsuć istniejących plików .env.
 */
const KLUCZ =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Czy w ogóle jest gdzie trzymać sesję.
 *
 * `web.output: "static"` sprawia, że expo-router renderuje trasy z góry
 * w Node — a tam nie ma `window`. Magazyn przeglądarki wywalał wtedy cały
 * serwer deweloperski przy starcie. Podczas takiego renderowania sesji i tak
 * nie ma sensu odczytywać: nie ma zalogowanego człowieka, jest generator HTML.
 */
const wPrzegladarce = typeof window !== 'undefined';

/**
 * Sesja trzymana bezpiecznie na telefonie, zwyczajnie w przeglądarce.
 *
 * `expo-secure-store` używa pęku kluczy iOS i keystore Androida, ale na webie
 * nie istnieje. Tam zostaje magazyn przeglądarki — token i tak jest widoczny
 * dla kodu strony, więc udawanie bezpieczeństwa niczego by nie dało.
 *
 * Uwaga: SecureStore ma limit 2048 bajtów na wartość. Sesja Supabase mieści
 * się w nim z zapasem, ale gdyby kiedyś przestała, trzeba ją będzie dzielić.
 */
const magazyn = {
  getItem: (klucz: string) => {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(klucz);
    return wPrzegladarce ? AsyncStorage.getItem(klucz) : Promise.resolve(null);
  },
  setItem: (klucz: string, wartosc: string) => {
    if (Platform.OS !== 'web') return SecureStore.setItemAsync(klucz, wartosc);
    return wPrzegladarce ? AsyncStorage.setItem(klucz, wartosc) : Promise.resolve();
  },
  removeItem: (klucz: string) => {
    if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(klucz);
    return wPrzegladarce ? AsyncStorage.removeItem(klucz) : Promise.resolve();
  },
};

/**
 * Z czym człowiek wrócił z maila.
 *
 * Link aktywacyjny odsyła na stronę główną z danymi w KOTWICY adresu:
 * `#access_token=…&type=signup`. Tak działa domyślny tryb `implicit`,
 * którego nie zmieniamy.
 *
 * ODCZYT MUSI SIĘ WYDARZYĆ TERAZ, PRZED `createClient`. Klient Supabase sam
 * czyta tę kotwicę i natychmiast ją kasuje z adresu, żeby token nie został
 * w historii przeglądarki. To słuszne, ale znaczy tyle, że kto przyjdzie po
 * nim, nie zastanie już niczego — a wtedy nie da się odróżnić świeżo
 * potwierdzonego konta od zwyczajnego wejścia na stronę.
 */
export type Powrot =
  | { rodzaj: 'rejestracja' }
  | { rodzaj: 'odzyskiwanie' }
  | { rodzaj: 'blad'; opis: string };

function poLudzkuOBledzie(kod: string, opis: string): string {
  if (kod === 'otp_expired') return 'Link wygasł — te maile są ważne krótko.';
  if (kod === 'access_denied') return 'Link został już użyty albo unieważniony.';
  return opis.replace(/\+/g, ' ') || 'Link nie zadziałał.';
}

function odczytajPowrot(): Powrot | null {
  if (!wPrzegladarce || typeof window.location?.hash !== 'string') return null;
  const kotwica = window.location.hash.replace(/^#/, '');
  if (!kotwica) return null;
  const p = new URLSearchParams(kotwica);

  const blad = p.get('error') ?? p.get('error_code');
  if (blad) {
    return {
      rodzaj: 'blad',
      opis: poLudzkuOBledzie(p.get('error_code') ?? '', p.get('error_description') ?? ''),
    };
  }
  if (!p.get('access_token')) return null;

  const typ = p.get('type');
  if (typ === 'signup' || typ === 'email_change') return { rodzaj: 'rejestracja' };
  if (typ === 'recovery') return { rodzaj: 'odzyskiwanie' };
  return null;
}

export const powrotZLinku: Powrot | null = odczytajPowrot();

export const supabase: SupabaseClient | null =
  URL && KLUCZ
    ? createClient(URL, KLUCZ, {
        auth: {
          storage: magazyn,
          autoRefreshToken: true,
          persistSession: true,
          // Wykrywanie sesji z adresu URL ma sens tylko w przeglądarce —
          // tam wraca link potwierdzający albo logowanie przez dostawcę.
          detectSessionInUrl: Platform.OS === 'web' && wPrzegladarce,
        },
      })
    : null;

/** Czy w ogóle da się zalogować. Bez konfiguracji ekran konta się nie pokazuje. */
export const kontaWlaczone = supabase !== null;
