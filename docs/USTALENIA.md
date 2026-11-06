# Ustalenia produktowe i UX (Alejka v2)

Ten plik zbiera decyzje Marko z przeglądu makiet. Każda nowa decyzja trafia tutaj, a przy budowaniu aplikacji ten plik jest listą wymagań do wdrożenia.

- Makiety (jedno klikalne płótno): https://claude.ai/artifact/Tig6gU98Eu39qRyhiMtZXj
- Przegląd ekran po ekranie: https://claude.ai/artifact/EX9MnZi7sRr8UGWbyNRMUP
- Plan v2: https://claude.ai/artifact/NB22NzNfidwAKHJmQ7h6nL
- Źródła makiet z logiką (do podglądu zachowania przy budowie): `design/makiety-v2/`

## Kody ekranów i stanów

Kody odpowiadają tytułom plansz na płótnie. Stan zapisujemy po kropce, np. `N2.karta`.

| Kod | Ekran | Stany |
|---|---|---|
| S0 | Start: pierwsze uruchomienie | |
| S1 | Start: Twoje listy | |
| L1 | Lista | `L1.ilość`, `L1.promocja`, `L1.sklepy`, `L1.umknęło` |
| L2 | Lista: nowa, pusta | |
| L3 | Lista: MVP bez cen | |
| L4 | Lista: panel ilości (= `L1.ilość`) | |
| N1 | Nowa lista: pusto | |
| N2 | Nowa lista: wybór sklepu | `N2.wybór`, `N2.karta` |
| N3 | Nowa lista: lista dla sklepu | `N3.lista`, `N3.ilość` |
| N4 | Nowa lista: kolejny sklep (= N2) | |
| N5 | Nowa lista: dwa sklepy | `N5.lista`, `N5.dymek`, `N5.ilość` |
| N6 | Nowa lista: gotowe | `N6.lista`, `N6.odsłonięte`, `N6.cofnij` |
| Z1 | Zakupy w sklepie | `Z1.sklep`, `Z1.trwa`, `Z1.cała`, `Z1.zmiana`, `Z1.przejście` |
| Z2 | Mapa sklepu | `Z2.produkt`, `Z2.trasa`, `Z2.wskaż` |
| Z3 | Zakupy: koniec | `Z3.podsumowanie`, `Z3.przypomnij` |
| PA0 | Skaner paragonu | `PA0.celowanie`, `PA0.skan`, `PA0.gotowe` |
| PA1 | Paragon odczytany | |
| PA2 | Paragony (zakładka) | `PA2.miesiąc`, `PA2.poprzedni` |
| PR1 | Promocje | `PR1.idealne`, `PR1.inne`, `PR1.pytanie` |

---

## 0. Zasady ogólne UI

1. **Nic nie przeskakuje.** Żaden klikalny element nie może przesuwać innych elementów widoku. Karty, dymki (toasty), podpowiedzi i panele pojawiają się jako nakładki (`position: absolute`, arkusz z dołu) albo w miejscu zarezerwowanym z góry. Zaznaczenie zmienia tylko kolor lub obramowanie, a nie kolejność ani wysokość elementów. (Wyjątek: sama treść, którą użytkownik zmienił, np. dodany lub usunięty produkt. Usuwanie animujemy zwinięciem, bez skoku.)
2. **Styl „Targ”, paleta granatowa.** Biel, DM Sans, duże zaokrąglenia, okrągłe checkboxy, przyciski w kształcie pigułek. Kolory trzymamy jako tokeny motywu w jednym miejscu (`--akcent #1d5f8a`, `--akcent-ciemny #164a6b`, `--akcent-jasny #e3eff7`, `--tusz #121c24`, `--wyciszony #5d6b75`, `--linia`, `--chip`, `--ramka`), żeby kolor dało się łatwo wymienić.
3. **Bez tłumaczenia.** Aplikacja nie uczy instrukcjami („wpisuj po przecinku”). Zachowanie ma być oczywiste samo w sobie.
4. **Teksty neutralne płciowo** (np. „Nic Ci nie umknęło?”, a nie „Czy nie zapomniałeś?”).
5. Stałe akcje są na dole, w zasięgu kciuka.

## 1. Start (S0, S1)

- Aplikacja otwiera się na liście list („Twoje listy”), a nie na ostatniej liście.
- Najbliższa lista jest pokazana jako duża karta z postępem, niżej pozostałe. Przycisk „Nowa lista” jest zawsze na dole.
- Pierwsze uruchomienie: bez rejestracji i samouczka. Jedno zdanie, przykład listy i jeden przycisk. Onboarding projektujemy później.

## 2. Tworzenie listy (N1 → N6)

1. **N1 · Pusto.** Jedyna akcja to „Nowa lista”.
2. **N2 · Wybór sklepu** (styl InPost):
   - Pole adresu, przycisk „moja lokalizacja”, filtr sieci (chipy).
   - Mapa z pinezkami, pod nią lista sklepów od najbliższego.
   - Na górze „Najczęściej wybierasz”: 2 sklepy, które **ten użytkownik** wybiera najczęściej (z jego historii). Jedno stuknięcie od razu tworzy listę. Nowy użytkownik tej sekcji nie widzi.
   - „Mamy mapę sklepu” przy sklepach, dla których trasa będzie dokładna.
   - **Karta sklepu:** stuknięcie pinezki lub wiersza zaznacza sklep (wiersz tylko zmienia tło) i w miejscu mapy (ten sam stały obszar, płynne przejście) pokazuje kartę sklepu:
     - zdjęcie wejścia do sklepu (żeby sprawdzić, czy to ten sklep; źródło: Google Places Photos, później zdjęcia od użytkowników),
     - nazwę, adres i czas dojścia pieszo,
     - godziny („Otwarte do 22:00” / „Zamknięte, od 7:00”),
     - „Mapa alejek”, jeśli ją mamy,
     - „Wybierasz często”, jeśli sklep jest w historii użytkownika,
     - przycisk „Pokaż mapę” (wraca do pinezek, zaznaczenie zostaje).
     Karta nie zasłania listy sklepów i niczego nie przesuwa. Ponowne stuknięcie wiersza odznacza sklep. Dolny przycisk: „Wybierz {sieć} · {adres}”.
3. **N3 · Lista dla sklepu.** Na dole zawsze dwa przyciski: „Kolejny sklep” i „Zakończ”. „Zakończ” jest nieaktywny, dopóki lista jest pusta.
4. **N4 · Kolejny sklep.** Ten sam wybór sklepu, bez sklepów już dodanych. Wraca do tej samej listy.
5. **N5 · Lista na kilka sklepów.** Patrz punkt 4.
6. **N6 · Zakończ.** Prowadzi na Start z gotową listą na górze i przyciskiem „Zacznij zakupy”. Nazwę listy zmienia się na górze listy (domyślnie „Zakupy na sobotę”).

## 3. Dodawanie produktów i ilości

- **Enter dodaje** produkt i od razu można pisać dalej (działa też plusik). Przecinki i średniki rozdzielają produkty po cichu, bez instrukcji.
- Podgląd rozpoznania pod polem („↵ Ziemniaki · 2 kg · Warzywa i owoce”) ma stałą wysokość, żeby nie przesuwał listy.
- **Inteligentne ilości:**
  - Na wagę: liczba ≥ 50 oznacza gramy, mniejsza kilogramy („ziemniaki 500” = 500 g, „3 ziemniaki” = 3 kg). Rozpoznajemy też kg, dag/deko i g.
  - Sztuki („ogórek” = 1 szt.) i butelki („woda 6” = 6 butelek).
  - Pojemność (ml/l) zostaje na razie częścią nazwy („cola 2l”). Otwarte pytanie: czy ml/l mają być osobną jednostką.
  - Domyślna jednostka i ilość wynikają z katalogu produktów.
- **Panel ilości:** przy każdym produkcie jest chip z ilością („2 kg ▾”). Stuknięcie wysuwa arkusz z dołu (tło przyciemnione i rozmyte) z:
  - dużą ilością oraz przyciskami − i +,
  - szybkimi wartościami, zawsze 4 w jednym rzędzie (kg: 250 g / 500 g / 1 kg / 2 kg; szt.: 1 / 2 / 4 / 6; butelki: 1 / 2 / 6 / 12), żeby zmiana jednostki nie zmieniała wysokości panelu,
  - przełącznikiem jednostki **Sztuki / Na wagę / Butelki**,
  - „Kupuję w” (tylko na liście z kilkoma sklepami, patrz punkt 4),
  - szacowaną ceną, przyciskiem „Usuń” i „Gotowe”.
- **Jednostka zapamiętywana per użytkownik i per produkt.** Gdy użytkownik ręcznie zmieni jednostkę (np. mąka albo cukier w kg zamiast sztuk), zapisujemy preferencję `(użytkownik, produkt) → jednostka`. Przy kolejnym dodaniu tego produktu stosujemy ją automatycznie, a liczbę przeliczamy według nowej jednostki („mąka 500” = 500 g). Jednostka wpisana wprost („mąka 3 szt”) wygrywa z preferencją. W panelu pod przełącznikiem widać: „Zmiana jednostki zostanie zapamiętana dla tego produktu”, a po zmianie: „Zapamiętane: mąka zawsze na wagę”.
  - Implementacja: tabela np. `user_unit_prefs(user_id, product_id, unit, updated_at)` w Supabase, plus kopia lokalna offline. Klucz produktu to id z katalogu (dla wpisów spoza katalogu: znormalizowana nazwa).
- Lista sama układa się według działów sklepu (według mapy sklepu, jeśli ją mamy, inaczej według typowego układu).

## 4. Kilka sklepów na jednej liście

- **Domyślnie lista jest na jeden sklep.** Kolejne sklepy to świadoma opcja: przycisk „Kolejny sklep” albo pytanie przy promocji z innego sklepu („Do tej listy, jako 2. sklep” / „Nowa lista na {sklep}”).
- Lista dzieli się na części, po jednej na sklep, a każda ma swoją trasę. **Kolejności sklepów nie ustalamy** przy tworzeniu listy.
- **Aktywny sklep jest podświetlony.** Część aktywnego sklepu ma jasnogranatowe tło i obramowanie oraz znacznik „tu dodajesz”. Pozostałe mają znacznik „dodawaj tutaj”. Stuknięcie nagłówka sklepu zmienia aktywny sklep. Pole wpisywania pokazuje „Dodaj do: {sklep}”. Podświetlenie nie zmienia wymiarów elementów.
- **Przenoszenie produktu między sklepami:**
  - W panelu ilości przełącznik „Kupuję w: Lidl / Biedronka” przenosi produkt od razu.
  - Po dodaniu produktu na liście z kilkoma sklepami pojawia się dymek-nakładka „Masło · dodane do: Lidl” z przyciskiem „Przenieś do Biedronka” (przy 3+ sklepach: „Zmień sklep”, który otwiera panel). Dymek nie przesuwa listy.

## 5. Lista list: przesuwanie kart (N6 i S1)

- Każdą kartę listy można przesunąć w bok:
  - **w prawo** odsłania z lewej przycisk **„Udostępnij”** (link do listy dla domowników),
  - **w lewo** odsłania z prawej przycisk **„Usuń”**.
- **Dwa kroki:** pierwsze przesunięcie (powyżej ok. 56 px) zatrzymuje kartę przesuniętą o ok. 104 px, a przycisk „wychyla się” zza karty (rośnie i pojawia się razem z ruchem palca). Akcję wykonuje dopiero **ponowne przesunięcie w tę samą stronę** albo **stuknięcie odsłoniętego przycisku**.
- Przesunięcie w przeciwną stronę, stuknięcie karty albo rozpoczęcie przesuwania innej karty zamyka odsłonięty przycisk. Za krótki ruch wraca kartę na miejsce.
- Usunięcie: karta wyjeżdża w lewo i płynnie się zwija. Dymek „Usunięto listę „…”” z przyciskiem „Cofnij”.
- Pod listami jest jedna linijka podpowiedzi o przesuwaniu (do rozważenia, czy pokazywać ją tylko na początku).

## 6. Tryb zakupów (Z1)

- **Widok „Po kolei”:** lista wszystkich działów bieżącego sklepu w kolejności trasy. Zrobione i kolejne działy są zwiniętymi paskami (numer lub ✓, nazwa, „1 z 2”), aktualny dział jest rozwinięty (duża nazwa, „Teraz · krok 2 z 4”, gdzie leży, produkty). Na końcu pasek „Kasa”.
- **Animacje:** odhaczenie = kółko wypełnia się z „pyknięciem” i pulsem, ptaszek się rysuje, tekst szarzeje i przekreśla się od lewej. Po odhaczeniu ostatniego produktu działu jest ok. 0,65 s zwłoki (czas na cofnięcie pomyłki), potem dział płynnie zwija się do paska, a następny się rozwija (animacja wysokości, rozmiaru nazwy i tła). Odznaczenie działa odwrotnie.
- Stuknięcie zwiniętego paska rozwija go podglądowo (np. żeby odznaczyć coś w zrobionym dziale). Po następnym odhaczeniu widok wraca do aktualnego działu.
- Na starcie (lista na kilka sklepów): „W którym sklepie jesteś?”.
- U góry: zmiana sklepu w każdej chwili oraz widok „Cała lista” bez podziału.
- Po odhaczeniu wszystkiego w sklepie: „{Sklep} zrobiony, zapłać tutaj” i „Do którego sklepu teraz?” (przy jednym pozostałym: „Został {sklep}. Idziesz?”).
- Lista na jeden sklep pomija te pytania.
- „Gdzie jestem” wyliczamy z ostatnio odhaczonego produktu (bez GPS i beaconów). Marszrutę uczymy się pasywnie z kolejności odhaczania.

## 6.1 Mapa sklepu (Z2)

- **Wejścia:** okrągły przycisk mapy w nagłówku trybu zakupów (Z1, zawsze w tym samym miejscu) oraz „Nie mogę znaleźć” przy aktualnym dziale (otwiera mapę od razu na tym produkcie).
- **Plan** rysujemy z pliku mapy sklepu (format `alejka.store`, siatka np. 28×40). Kolory typów klocków: regał, lodówka, zamrażarka, stoisko (warzywa), lada (piekarnia), kasy i wejście. Kilka podpisów stref (Warzywa i owoce, Piekarnia, Nabiał, Mrożonki, Napoje, Chemia, Kasy, Wejście). Działy już odhaczone są lekko przygaszone na zielono.
- **Przełącznik u góry:** „Cała trasa” albo pojedynczy produkt z listy (tylko te, których jeszcze nie ma w koszyku).
  - Produkt: klocek z tym działem pulsuje na akcent, pinezka, trasa alejkami od miejsca użytkownika, „ok. 43 m stąd, ok. 50 s pieszo”.
  - Cała trasa: przystanki numerowane od najbliższego (zachłannie, po odległości alejkami), na końcu kasa, łączna długość trasy.
- **Trasa** to najkrótsza droga po wolnych kratkach siatki (BFS, ruch w 4 kierunkach). Klocki są przeszkodami, wejście jest przejściem. Rysujemy ją jako przerywaną linię z białą obwódką.
- **Gdzie jestem:** domyślnie przy ostatnio odhaczonym produkcie (opis: „jesteś przy mleku (ostatnio odhaczone)”). „Jestem gdzie indziej” włącza tryb wskazania: stuknięcie planu przyciąga kropkę do najbliższej wolnej kratki i przelicza trasę. Opis zmienia się wtedy na „miejsce wskazane ręcznie”.
- Odległość: 1 kratka ≈ 1 m, czas ≈ 1,2 s/m (zaokrąglony do 10 s).

## 6.2 Koniec zakupów (Z3)

- Po ostatnim sklepie (Z1 → „Dalej”). Duży animowany ptaszek, „Wszystko w koszyku”, nazwa listy, liczba sklepów i czas.
- Podsumowanie: produkty (9/9), szacunek z listy, czas w sklepach.
- **Paragony per sklep:** każdy sklep z listy to osobny paragon. Wiersz sklepu ma „Skanuj” (otwiera PA0 dla tego sklepu) albo „Jest” po zeskanowaniu. Nad nimi pasek „x z 4” paragonów w 30 dni do Premium.
- „Przypomnij wieczorem” (przełącznik, domyślnie włączony). **Propozycja do potwierdzenia:** powiadomienie o 20:00 tego dnia, jeśli zostały niezeskanowane paragony.
- „Zakończ” przenosi listę do „Zrobione”, skąd można jej użyć ponownie.

## 6.3 Skaner paragonu (PA0)

- Pełnoekranowy aparat z ramką (rogi pulsują). Nagłówek mówi, z którego sklepu ma być paragon („Paragon z Biedronki · 2 z 3 sklepów tej listy”), bo skaner wie, jakie sklepy były na liście.
- Spust zdjęcia, „Z galerii”, lampa. Podpowiedź: długi paragon = przesuwaj telefon w dół (skan ciągły).
- Animacja: po zdjęciu paragon się prostuje, linia skanu przesuwa się po nim, status „Czytam paragon…”, potem „Odczytano 3 pozycje · 21,98 zł · dopasowaliśmy je do Twojej listy” z przyciskami „Jeszcze raz” i „Sprawdź” (PA1).
- Dolne panele (celowanie / gotowe) leżą w tym samym miejscu i przenikają się, więc nic nie skacze.
- Prywatność: zdjęcie zostaje na telefonie (OCR na urządzeniu), wysyłamy tylko odczytany tekst, numer karty usuwamy przed wysłaniem.

## 6.4 Zakładka Paragony (PA2)

- Karta postępu do Premium („2 z 4 paragonów w 30 dni”, 4 segmenty, „Jeszcze 2, a Premium masz za darmo do {data}”).
- Wydatki w miesiącu: przełącznik miesięcy (nie zmienia układu), suma, liczba paragonów, słupki per sklep.
- „Ostatnie” paragony: sklep, dzień, liczba pozycji, kwota. Stuknięcie otwiera PA1.
- Stały przycisk „Zeskanuj paragon” nad nawigacją. Zakładka „Paragony” w dolnej nawigacji prowadzi tutaj.

## 7. Mądra lista

- Aplikacja wykrywa rytm zakupów (dni tygodnia, produkty kupowane regularnie).
- Gdy regularny produkt nie trafił na listę w danym tygodniu, na liście pojawia się krótkie „Nic Ci nie umknęło?” z tymi produktami. Bez tłumaczenia, skąd to wiemy. Jedno stuknięcie dodaje produkt.

## 8. Promocje (PR1)

- Personalizowane z historii list i paragonów (co i w jakim sklepie użytkownik kupuje). Na starcie ogólne, z czasem trafniejsze.
- Sklepy wybiera użytkownik (chipy u góry, docelowo także w onboardingu).
- Dwie sekcje: **„Idealne dla Ciebie”** (posortowane według dopasowania) i **„Inne promocje”**.
- Ogólny wpis na liście (np. „ser”) dostaje znaczek „Promocja”. Stuknięcie pokazuje konkretną ofertę („Ser żółty Gouda 150 g”) z pytaniem „Tak, ten / Nie, dzięki”. Oferta z innego sklepu dodaje ten sklep (patrz punkt 4).
- **Bez „realnej zniżki” i bez procentów z gazetek.** Pokazujemy tylko cenę i termin.
- Z gazetek bierzemy tylko fakty i link, docelowo na licencji od sieci.

## 9. Paragony i Premium (PA1)

- Aplikacja jest darmowa. Ceny z paragonów są kluczowymi danymi do wspólnej bazy cen.
- **4 paragony w ciągu 30 dni = Premium za darmo.** Pasek postępu „x z 4” w Paragonach i komunikat „Premium odblokowane do {data}”.
- Kto nie skanuje, może zapłacić (ok. 10 zł/mies., kwota do ustalenia). Bez losowań nagród (loteria wymaga zezwolenia).
- Zabezpieczenia: duplikaty i świeżość paragonu. OCR na telefonie. Cena referencyjna to mediana cen regularnych z 60 dni.

## 10. Mapowanie sklepów

- Wariant 1: nagranie wideo z telefonu na uchwycie na klatce piersiowej (1 klatka/s) plus krokomierz i kompas (expo-sensors) w Expo Go. Model wizyjny przypisuje sekcje, a z kolejności klatek powstaje szkic planu do poprawy w edytorze 2D.
- Bez AR/ARKit/Niantic na MVP (wymaga konta Apple Developer i własnego buildu).

## Na później (nie budujemy teraz)

Te pomysły wchodzą dopiero po dopracowaniu aplikacji i sprawdzeniu, że promocje w ogóle działają.

- **„Taniej w innym sklepie”** (pomysł Marko, 2026-11-06). Jeśli produkt z listy jest tańszy w innym sklepie, który użytkownik ma w ulubionych, pokazujemy informację, np. „Taniej w Kauflandzie: 4,99 zł (o 1,50 zł mniej)”. Forma UX jest otwarta: na przykład ikonka z wykrzyknikiem przy produkcie, która po stuknięciu otwiera dymek lub arkusz. Musi spełniać zasadę „nic nie przeskakuje”. Źródło cen: paragony i gazetki.

## Otwarte pytania

- ml/l jako osobna jednostka?
- Nazwa aplikacji (Zakulista / smart-lista / Alejka).
- Wyjście z Expo Go na EAS dev build.
- Promocje tylko z wybranych sklepów czy także z innych?
- Podpowiedź o przesuwaniu kart: zawsze czy tylko przy pierwszych użyciach?
- Przypomnienie o paragonach: godzina (propozycja 20:00) i czy domyślnie włączone.
