-- Alejka — schemat początkowy
--
-- ZASADA: telefon jest źródłem prawdy, baza jest miejscem synchronizacji.
-- W sklepie nie ma zasięgu, więc aplikacja musi działać bez logowania i bez
-- sieci. Konto dokłada trzy rzeczy: plany przeżywają zmianę telefonu, listę
-- widać na dwóch urządzeniach, a mapy da się udostępnić innym ludziom.
--
-- Dlatego plan sklepu i pozycje listy trzymamy jako JSONB, jednym kawałkiem.
-- Rozbicie ich na tabele relacyjne dałoby ładniejsze zapytania, ale zmusiłoby
-- do scalania zmian na poziomie pojedynczej pozycji — a przy jednym właścicielu
-- i pracy offline wystarczy „wygrywa nowsza wersja całego dokumentu".

-- ---------------------------------------------------------------- profile

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nazwa text,
  utworzono timestamptz not null default now()
);

comment on table public.profiles is
  'Dane konta poza tym, co trzyma auth.users. Powstaje automatycznie przy rejestracji.';

alter table public.profiles enable row level security;

create policy "widzi swój profil"
  on public.profiles for select using (auth.uid() = id);

create policy "zmienia swój profil"
  on public.profiles for update using (auth.uid() = id);

-- Profil zakłada się sam przy rejestracji. Bez tego aplikacja musiałaby
-- pamiętać, żeby to zrobić — a zapomni dokładnie raz, u pierwszego użytkownika.
create function public.obsluz_nowego_uzytkownika()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nazwa)
  values (new.id, new.raw_user_meta_data ->> 'nazwa');
  return new;
end;
$$;

create trigger na_nowego_uzytkownika
  after insert on auth.users
  for each row execute function public.obsluz_nowego_uzytkownika();

-- ---------------------------------------------------------------- sklepy

create table public.sklepy (
  id uuid primary key default gen_random_uuid(),
  wlasciciel uuid not null references auth.users on delete cascade,
  nazwa text not null check (length(trim(nazwa)) between 1 and 120),
  siec text not null,
  -- Pełny plan w formacie z pliku .alejka.json: gridW, gridH, blocks.
  plan jsonb,
  -- Marszruta zapasowa, gdy planu nie ma.
  marszruta jsonb not null default '[]'::jsonb,
  -- Wersja katalogu sekcji, na której plan powstał. Pozwala ostrzec, że mapa
  -- pochodzi sprzed rozbicia kategorii i część sekcji może się nie zgadzać.
  wersja_katalogu integer,
  -- Mapa udostępniona innym. Docelowo to jest waluta tego projektu:
  -- kto zmapuje sklep, dostaje dostęp na zawsze.
  publiczny boolean not null default false,
  utworzono timestamptz not null default now(),
  zmieniono timestamptz not null default now()
);

create index sklepy_wlasciciel_idx on public.sklepy (wlasciciel);
create index sklepy_publiczne_idx on public.sklepy (publiczny) where publiczny;

alter table public.sklepy enable row level security;

create policy "widzi swoje sklepy"
  on public.sklepy for select using (auth.uid() = wlasciciel);

-- Mapy oznaczone jako publiczne czyta każdy zalogowany — to jest mechanizm
-- dzielenia się planami. Pisać po nich może dalej tylko autor.
create policy "widzi sklepy publiczne"
  on public.sklepy for select to authenticated using (publiczny);

create policy "dodaje swoje sklepy"
  on public.sklepy for insert with check (auth.uid() = wlasciciel);

create policy "zmienia swoje sklepy"
  on public.sklepy for update using (auth.uid() = wlasciciel)
  with check (auth.uid() = wlasciciel);

create policy "usuwa swoje sklepy"
  on public.sklepy for delete using (auth.uid() = wlasciciel);

-- ---------------------------------------------------------------- listy

create table public.listy (
  id uuid primary key default gen_random_uuid(),
  wlasciciel uuid not null references auth.users on delete cascade,
  nazwa text not null check (length(trim(nazwa)) between 1 and 120),
  -- Skasowanie sklepu nie może zabrać listy zakupów. Zostaje bez sklepu.
  sklep_id uuid references public.sklepy on delete set null,
  -- Pozycje jednym dokumentem: text, qty, section, checked, sectionLocked.
  pozycje jsonb not null default '[]'::jsonb,
  utworzono timestamptz not null default now(),
  zmieniono timestamptz not null default now()
);

create index listy_wlasciciel_idx on public.listy (wlasciciel);

alter table public.listy enable row level security;

create policy "widzi swoje listy"
  on public.listy for select using (auth.uid() = wlasciciel);

create policy "dodaje swoje listy"
  on public.listy for insert with check (auth.uid() = wlasciciel);

create policy "zmienia swoje listy"
  on public.listy for update using (auth.uid() = wlasciciel)
  with check (auth.uid() = wlasciciel);

create policy "usuwa swoje listy"
  on public.listy for delete using (auth.uid() = wlasciciel);

-- ---------------------------------------------------- znacznik czasu zmiany

-- Synchronizacja rozstrzyga konflikty po `zmieniono`, więc nie może zależeć
-- od tego, czy klient pamiętał go ustawić.
create function public.dotknij_zmieniono()
returns trigger
language plpgsql
as $$
begin
  new.zmieniono = now();
  return new;
end;
$$;

create trigger sklepy_zmieniono
  before update on public.sklepy
  for each row execute function public.dotknij_zmieniono();

create trigger listy_zmieniono
  before update on public.listy
  for each row execute function public.dotknij_zmieniono();
