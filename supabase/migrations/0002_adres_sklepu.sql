-- Adres sklepu
--
-- Człowiek ma w zasięgu kilka Biedronek i bez ulicy nie odróżni ich na liście.
-- Plan sklepu jest przypisany do konkretnego budynku, nie do szyldu — więc bez
-- adresu nie da się powiedzieć, którego planu dotyczy.
--
-- UWAGA: dopóki ta migracja nie zostanie wykonana, aplikacja trzyma ulicę
-- i miasto WYŁĄCZNIE na urządzeniu. Synchronizacja ich nie odsyła, bo wysłanie
-- nieistniejących kolumn wywaliłoby całą wymianę z bazą. Po wykonaniu trzeba
-- dopisać `ulica` i `miasto` do zapytań w src/lib/sync.ts — inaczej adres
-- zniknie przy zmianie telefonu.

alter table public.sklepy add column if not exists ulica text;
alter table public.sklepy add column if not exists miasto text;

comment on column public.sklepy.ulica is
  'Ulica z numerem. Odróżnia dwa sklepy tej samej sieci w jednym mieście.';
comment on column public.sklepy.miasto is
  'Miasto. Razem z ulicą mówi, którego budynku dotyczy plan.';
