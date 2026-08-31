/**
 * Kto jest administratorem.
 *
 * Adres podaje się przez zmienną środowiskową, żeby nie siedział w kodzie —
 * ale trzeba mieć jasność, CO ta lista chroni: wyłącznie widoczność ekranu.
 *
 * Prawdziwe zabezpieczenie stoi w bazie, na regułach RLS: katalog sklepów
 * należy do konta administratora, a `zmienia swoje sklepy` przepuszcza wyłącznie
 * właściciela. Ktoś, kto podmieni sobie tę zmienną w przeglądarce, zobaczy
 * pusty ekran administracyjny i nic więcej — baza i tak odrzuci każdy zapis.
 *
 * Dlatego nie udajemy, że to jest kontrola dostępu. To jest chowanie guzika,
 * którego i tak nie da się użyć.
 */

import type { Session } from '@supabase/supabase-js';

const ADRESY = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((x: string) => x.trim().toLowerCase())
  .filter(Boolean);

export function czyAdmin(sesja: Session | null | undefined): boolean {
  const email = sesja?.user?.email?.toLowerCase();
  return Boolean(email && ADRESY.includes(email));
}

/** Czy w ogóle skonfigurowano administratora — do komunikatu diagnostycznego. */
export const adminSkonfigurowany = ADRESY.length > 0;
