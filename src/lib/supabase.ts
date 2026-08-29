/**
 * Połączenie z Supabase.
 *
 * Konto jest DODATKIEM, nie warunkiem działania. W sklepie nie ma zasięgu,
 * więc aplikacja musi ruszyć i policzyć trasę bez logowania i bez sieci.
 * Konto dokłada trzy rzeczy: plany przeżywają zmianę telefonu, listę widać
 * na dwóch urządzeniach, a mapy da się komuś udostępnić.
 *
 * Dlatego `supabase` może być `null` — gdy nie ma konfiguracji, cała warstwa
 * sieciowa po prostu nie istnieje, a reszta aplikacji działa jak dotąd.
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
