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
import type { Session } from '@supabase/supabase-js';
import { supabase, kontaWlaczone } from './supabase';

export type StanKonta = {
  /** null = niezalogowany, undefined = jeszcze nie wiadomo. */
  sesja: Session | null | undefined;
  wlaczone: boolean;
  email: string | null;
};

export function useKonto(): StanKonta {
  const [sesja, setSesja] = useState<Session | null | undefined>(
    kontaWlaczone ? undefined : null
  );

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSesja(data.session));
    const { data } = supabase.auth.onAuthStateChange((_zdarzenie, nowa) => setSesja(nowa));
    return () => data.subscription.unsubscribe();
  }, []);

  return {
    sesja,
    wlaczone: kontaWlaczone,
    email: sesja?.user?.email ?? null,
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
  await supabase?.auth.signOut();
}

export async function przypomnijHaslo(email: string): Promise<Wynik> {
  if (!supabase) return BRAK_KONFIGURACJI;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return error ? { ok: false, blad: poLudzku(error.message) } : { ok: true };
}
