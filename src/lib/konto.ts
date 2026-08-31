/**
 * Konto użytkownika.
 *
 * Wszystko tutaj jest opcjonalne. Gdy Supabase nie jest skonfigurowany,
 * `useKonto` zwraca stan „wyłączone" i żaden ekran się nie psuje — aplikacja
 * działa lokalnie tak jak przedtem.
 *
 * Komunikaty błędów tłumaczymy na polski i na ludzki. Supabase mówi
 * „Invalid login credentials", co dla człowieka nie znaczy nic poza tym,
 * że coś jest nie tak.
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase, kontaWlaczone } from './supabase';

/**
 * Ślad po tym, że ten człowiek kiedykolwiek się tu zalogował.
 *
 * Bramka przed aplikacją pyta o TO, a nie o ważną sesję — i to jest różnica
 * między aplikacją użyteczną a bezużyteczną. W Biedronce nie ma zasięgu.
 * Gdyby wejście zależało od odświeżenia tokenu w sieci, człowiek z wygasłą
 * sesją zostałby odcięty od własnej listy dokładnie wtedy, kiedy jej potrzebuje:
 * stojąc przed półką.
 *
 * Znacznik znika dopiero przy świadomym wylogowaniu.
 */
const KLUCZ_LOGOWANIA = 'alejka:bylo-logowanie';

async function zapamietajLogowanie() {
  try { await AsyncStorage.setItem(KLUCZ_LOGOWANIA, '1'); } catch { /* wygoda, nie kontrakt */ }
}

async function zapomnijLogowanie() {
  try { await AsyncStorage.removeItem(KLUCZ_LOGOWANIA); } catch { /* jw. */ }
}

export type StanKonta = {
  /** null = niezalogowany, undefined = jeszcze nie wiadomo. */
  sesja: Session | null | undefined;
  wlaczone: boolean;
  email: string | null;
  /**
   * Czy na tym urządzeniu ktoś już się logował. `undefined` dopóki nie
   * odczytamy tego z pamięci. Bramka używa tego zamiast ważności sesji.
   */
  kiedykolwiek: boolean | undefined;
};

export function useKonto(): StanKonta {
  const [sesja, setSesja] = useState<Session | null | undefined>(
    kontaWlaczone ? undefined : null
  );
  const [kiedykolwiek, setKiedykolwiek] = useState<boolean | undefined>(
    kontaWlaczone ? undefined : false
  );

  useEffect(() => {
    if (!supabase) return;

    AsyncStorage.getItem(KLUCZ_LOGOWANIA)
      .then((v) => setKiedykolwiek(v === '1'))
      .catch(() => setKiedykolwiek(false));

    supabase.auth.getSession().then(({ data }) => {
      setSesja(data.session);
      if (data.session) {
        setKiedykolwiek(true);
        void zapamietajLogowanie();
      }
    });
    const { data } = supabase.auth.onAuthStateChange((zdarzenie, nowa) => {
      setSesja(nowa);
      if (nowa) {
        setKiedykolwiek(true);
        void zapamietajLogowanie();
      } else if (zdarzenie === 'SIGNED_OUT') {
        setKiedykolwiek(false);
        void zapomnijLogowanie();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return {
    sesja,
    wlaczone: kontaWlaczone,
    email: sesja?.user?.email ?? null,
    kiedykolwiek,
  };
}

/**
 * Tłumaczenie komunikatów Supabase.
 *
 * Lista jest krótka i celowo niepełna — pokrywa to, co człowiek zobaczy
 * najczęściej. Reszta idzie oryginałem, bo zmyślony komunikat po polsku
 * byłby gorszy od angielskiego, który da się wkleić w wyszukiwarkę.
 */
function poLudzku(wiadomosc: string): string {
  const m = wiadomosc.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Nie ten adres albo nie to hasło.';
  if (m.includes('email not confirmed')) return 'Najpierw potwierdź adres — sprawdź skrzynkę.';
  if (m.includes('user already registered')) return 'Na ten adres jest już konto. Zaloguj się.';
  if (m.includes('password should be at least')) return 'Hasło musi mieć co najmniej 6 znaków.';
  if (m.includes('unable to validate email')) return 'To nie wygląda na adres e-mail.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Za dużo prób. Spróbuj za chwilę.';
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Brak połączenia. Aplikacja działa dalej bez konta.';
  }
  return wiadomosc;
}

export type Wynik = { ok: true } | { ok: false; blad: string };

const BRAK_KONFIGURACJI: Wynik = {
  ok: false,
  blad: 'Konta nie są skonfigurowane w tej wersji aplikacji.',
};

export async function zaloguj(email: string, haslo: string): Promise<Wynik> {
  if (!supabase) return BRAK_KONFIGURACJI;
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: haslo,
  });
  return error ? { ok: false, blad: poLudzku(error.message) } : { ok: true };
}

export async function zarejestruj(email: string, haslo: string): Promise<Wynik> {
  if (!supabase) return BRAK_KONFIGURACJI;
  const { error } = await supabase.auth.signUp({ email: email.trim(), password: haslo });
  return error ? { ok: false, blad: poLudzku(error.message) } : { ok: true };
}

export async function wyloguj(): Promise<void> {
  await zapomnijLogowanie();
  await supabase?.auth.signOut();
}

export async function przypomnijHaslo(email: string): Promise<Wynik> {
  if (!supabase) return BRAK_KONFIGURACJI;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return error ? { ok: false, blad: poLudzku(error.message) } : { ok: true };
}
