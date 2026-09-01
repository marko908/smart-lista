-- Katalog sklepów zamknięty na klucz
--
-- ────────────────────────────────────────────────────────────────────────────
-- CO BYŁO NIE TAK
--
-- Polityki z 0001 powstały, gdy sklep należał do użytkownika i tylko on go
-- widział. Potem katalog stał się WSPÓLNY, a polityki zostały stare. Efekt:
--
--   „dodaje swoje sklepy"  — insert with check (auth.uid() = wlasciciel)
--   „widzi sklepy publiczne" — select to authenticated using (publiczny)
--
-- Każdy zarejestrowany mógł wstawić wiersz z `publiczny = true` i wrzucić do
-- katalogu, który widzą wszyscy, cokolwiek chciał. Panel administratora chowa
-- guzik, ale API jest otwarte — wystarczyło jedno zapytanie z własnym tokenem.
--
-- Listy i profile były i są szczelne: tam warunkiem jest `auth.uid() = wlasciciel`
-- bez żadnej furtki.
-- ────────────────────────────────────────────────────────────────────────────

-- Rola w profilu. Domyślnie zwykły użytkownik — administratora nadaje się ręcznie,
-- bo nadawanie go automatycznie czemukolwiek jest dokładnie tym błędem, który
-- ta migracja naprawia.
alter table public.profiles
  add column if not exists rola text not null default 'uzytkownik'
  check (rola in ('uzytkownik', 'admin'));

comment on column public.profiles.rola is
  'admin może pisać po wspólnym katalogu sklepów. Nadawane ręcznie.';

/**
 * Czy bieżący użytkownik jest administratorem.
 *
 * `security definer` jest tu konieczny: funkcja czyta profil, a polityki na
 * profilach przepuszczają tylko własny wiersz — bez tego zapytanie zapętliłoby
 * się na własnych regułach. `search_path` przybity na sztywno, żeby nikt nie
 * podstawił własnej tabeli `profiles` przez ustawienie ścieżki.
 */
create or replace function public.czy_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rola = 'admin'
  );
$$;

-- Sama funkcja nie musi być wystawiona niezalogowanym. Zalogowanym zostaje,
-- bo to ONI ją wołają — polityki RLS liczą się z uprawnieniami pytającego,
-- więc odebranie im prawa wykonania zablokowałoby cały mechanizm. Zwraca
-- wyłącznie prawdę o samym pytającym, więc nic przez nią nie wycieka.
revoke execute on function public.czy_admin() from public, anon;

-- Pisanie po katalogu wyłącznie dla administratora.
drop policy if exists "dodaje swoje sklepy" on public.sklepy;
drop policy if exists "zmienia swoje sklepy" on public.sklepy;
drop policy if exists "usuwa swoje sklepy" on public.sklepy;

create policy "admin dodaje sklepy"
  on public.sklepy for insert to authenticated
  with check (public.czy_admin() and auth.uid() = wlasciciel);

create policy "admin zmienia sklepy"
  on public.sklepy for update to authenticated
  using (public.czy_admin() and auth.uid() = wlasciciel)
  with check (public.czy_admin() and auth.uid() = wlasciciel);

create policy "admin usuwa sklepy"
  on public.sklepy for delete to authenticated
  using (public.czy_admin() and auth.uid() = wlasciciel);

-- Rola nie może być polem, które użytkownik sam sobie ustawi.
--
-- Polityka „zmienia swój profil" pozwala nadpisać KAŻDĄ kolumnę własnego
-- wiersza — więc po dodaniu `rola` pozwoliłaby mianować się administratorem.
-- Rozstrzygamy to uprawnieniami KOLUMNOWYMI, a nie warunkiem w polityce:
-- warunek musiałby porównywać nową wartość ze starą, co w trakcie UPDATE jest
-- subtelne i łatwe do pomylenia. Odebranie prawa zapisu do kolumny nie zostawia
-- miejsca na interpretację.
revoke update on public.profiles from authenticated;
grant update (nazwa) on public.profiles to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- WYKONANE 2026-09-01 na projekcie „Smart lista", razem z nadaniem roli
-- administratora koncie Marka. Sprawdzone podszyciem się pod zwykłego
-- użytkownika: próba wstawienia sklepu odbija się o politykę.
--
-- Nadanie roli kolejnej osobie:
--   update public.profiles set rola = 'admin'
--   where id = (select id from auth.users where email = 'ADRES');
-- ────────────────────────────────────────────────────────────────────────────
