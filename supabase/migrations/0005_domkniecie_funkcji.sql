-- Domknięcie funkcji pomocniczych
--
-- Znalezione przez doradcę bezpieczeństwa Supabase po uzyskaniu dostępu do
-- projektu przez MCP. Obie rzeczy są moje, z migracji 0001.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Funkcja od nowego użytkownika wystawiona jako endpoint HTTP
--
-- `obsluz_nowego_uzytkownika` jest funkcją WYZWALACZA, ale leży w schemacie
-- `public`, więc PostgREST wystawił ją pod /rest/v1/rpc/ — i to każdemu,
-- także niezalogowanemu. Jest przy tym SECURITY DEFINER, czyli działa
-- z uprawnieniami właściciela.
--
-- Wywołana z zewnątrz wywali się na braku `new`, bo poza wyzwalaczem ta zmienna
-- nie istnieje — ale wystawianie funkcji o podwyższonych uprawnieniach na
-- otwarty endpoint jest złym pomysłem niezależnie od tego, czy akurat da się ją
-- wykorzystać. Wyzwalacz woła ją po swojemu i odebranie praw mu nie przeszkadza.
revoke execute on function public.obsluz_nowego_uzytkownika() from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Brak przybitej ścieżki wyszukiwania
--
-- `dotknij_zmieniono` nie ma ustawionego `search_path`. Przy funkcji
-- wywoływanej z wyzwalacza znaczy to, że rozstrzygnięcie nazw zależy od
-- ustawienia sesji, która akurat robi zapis. W 0001 pamiętałem o tym przy
-- funkcji od profili, a przy tej nie.
create or replace function public.dotknij_zmieniono()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.zmieniono = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Zostaje do zrobienia w panelu, nie w SQL-u
--
-- Doradca zgłasza też wyłączoną ochronę przed wyciekłymi hasłami. Supabase
-- sprawdza wtedy hasła przy rejestracji względem bazy HaveIBeenPwned. Włącza
-- się to w panelu: Authentication → Policies → Password protection.
-- ────────────────────────────────────────────────────────────────────────────
