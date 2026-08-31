-- Współrzędne sklepu
--
-- Żeby pokazać człowiekowi tylko pobliskie sklepy, trzeba wiedzieć, gdzie one
-- stoją. Sam adres nie wystarczy — zamiana adresu na współrzędne wymaga
-- zewnętrznej usługi, a to koszt i zależność, której na tym etapie nie ma po co
-- brać. Administrator wpisuje współrzędne przy dodawaniu sklepu, najwygodniej
-- stojąc w środku i dotykając „Użyj mojej lokalizacji".
--
-- Zwykłe kolumny liczbowe, bez PostGIS: przy katalogu rzędu tysięcy sklepów
-- odległość liczy się na telefonie, bo i tak trzeba pobrać cały katalog do
-- pracy offline. Gdy katalog urośnie na tyle, że to przestanie być prawdą,
-- będzie czas na wyszukiwanie po stronie bazy.

alter table public.sklepy add column if not exists szerokosc double precision;
alter table public.sklepy add column if not exists dlugosc double precision;

comment on column public.sklepy.szerokosc is
  'Szerokość geograficzna. Puste = sklep nie bierze udziału w filtrowaniu po odległości.';
comment on column public.sklepy.dlugosc is
  'Długość geograficzna.';
