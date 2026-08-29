# Alejka — v1.5

Lista zakupów, która układa się w kolejności przejścia przez konkretny sklep,
a nie w kolejności wpisywania.

Pełny plan produktu: [`docs/plan-produktu.html`](docs/plan-produktu.html)

## Uruchomienie

```bash
npm install
```

```bash
npx expo start
```

Zeskanuj kod QR aparatem (iOS) albo z poziomu Expo Go (Android). Telefon i komputer
muszą być w tej samej sieci Wi-Fi. Jeśli sieć blokuje połączenia między urządzeniami,
użyj tunelu:

```bash
npx expo start --tunnel
```

### Dlaczego SDK 54, a nie najnowszy

Expo Go w Apple App Store stoi na **SDK 54** — od SDK 55 Expo nie publikuje tam
nowych wersji, bo Apple ich nie zatwierdza. Projekt jest więc świadomie trzymany
na SDK 54, żeby dało się go odpalić w Expo Go bez kombinowania.

Alternatywa, gdybyśmy chcieli wejść na nowszy SDK: podpisany build Expo Go
z `sign.expo.dev` albo własny development build przez EAS (dla iOS wymaga konta
Apple Developer).

## Budowanie map na komputerze

Edytor działa w przeglądarce na tym samym kodzie co aplikacja — mysz i duży ekran
biją palec i telefon, więc plany buduje się na PC.

```bash
npm run build:web
```

Powstaje statyczna paczka w `dist/`, gotowa do wystawienia gdziekolwiek.
Do pracy na bieżąco wystarczy `npx expo start` i otwarcie `http://localhost:8081`.

### Jeden sklep to jeden plik

W builderze jest **Zapisz sklep do pliku** — pobiera `nazwa-sklepu.alejka.json`
z całym planem, siecią i marszrutą. Na liście sklepów jest **Wczytaj sklep z pliku**.

Plik jest czytelnym JSON-em: da się go trzymać w repozytorium, wysłać komuś
mailem albo przenieść na telefon. Import to pełna walidacja, nie rzutowanie typu —
plik z nieznanym typem klocka albo sekcją spoza katalogu jest odrzucany
z konkretnym komunikatem, zamiast wywalać aplikację przy rysowaniu planu.
Gdy sklep o tej samej nazwie i sieci już istnieje, aplikacja pyta, czy zastąpić.

To rozwiązanie na fazę oceny podejścia. Gdy mapy mają trafiać do obcych ludzi,
plik przestaje wystarczać i potrzebny jest backend — patrz faza 4 w planie.

## Jak dodać kategorię

Jedna linijka w tablicy `DEFS` w [`src/data/sections.ts`](src/data/sections.ts),
w miejscu odpowiadającym temu, gdzie dana rzecz stoi w sklepie:

```ts
['klucz', 'Nazwa widoczna', 'Grupa', 'kolor', 'podpowiedź albo pusty tekst'],
```

Potem podbij `CATALOG_VERSION`. Reszta aplikacji podchwytuje nową kategorię sama —
pojawi się w wyszukiwarce, w kolejności sieci i w trasie. Jeśli ma nadawać klockowi
konkretny typ (lodówka, lada, stoisko), dopisz ją jeszcze do `TYPE_FOR_SECTION`
w [`src/data/blocks.ts`](src/data/blocks.ts).

Pełna instrukcja jest w komentarzu na górze `sections.ts`.

**Nie dodawaj możliwości wpisywania własnych nazw w aplikacji.** Katalog jest
zamknięty właśnie po to, żeby mapy z różnych sklepów dało się porównywać.

## Dodawanie pozycji do listy

Pole przyjmuje **wiele rzeczy naraz** — po przecinku, średniku albo z nowej
linii. Można wkleić całą listę z notatek jednym ruchem:

```
mleko, chleb, 2 kg ziemniaków, papier toaletowy, węgiel drzewny
```

Przecinek dziesiętny jest chroniony: `1,5 kg mąki` to jedna pozycja, a
`chleb, 2 mleka` to dwie. Rozstrzyga to, czy przecinek stoi **między cyframi**.

Enter dodaje i **zostawia kursor w polu** — listę pisze się seriami, bez
sięgania po mysz między produktami.

## Jak wygląda lista

Jeden ciąg, produkt po produkcie w kolejności przejścia przez sklep. Nazwa sekcji
stoi przy pozycji jako podpis, żeby było wiadomo, czego szukać wzrokiem — ale nie
dzieli listy na rozdziały. W sklepie idzie się od rzeczy do rzeczy.

## Pasek narzędzi

Nad płótnem, po lewej, zawsze widoczny: zaznaczanie · klocek · ściana · wejście ·
kasy · usuwanie. Plan rysuje się pod paskiem i tam też wraca po wyśrodkowaniu,
więc pasek nigdy nie zasłania lewego górnego rogu sklepu. Ta sama paleta jest
dalej w panelu po prawej, z pełnymi nazwami.

## Dodawanie kategorii bez myszy

Stuknięcie „Dodaj kategorię" albo „Dodaj kolejną" od razu ustawia kursor
w wyszukiwarce — można pisać. Po wybraniu kategorii pole czyści się i **odzyskuje
kursor**, więc kolejną wpisuje się bez sięgania po mysz. Regał ma zwykle kilka
kategorii i to była najbardziej męcząca część mapowania.

Wyszukiwarkę zamyka Escape (klocek zostaje zaznaczony) albo ponowne stuknięcie
w „Dodaj kategorię".

Kategorie **już obecne gdziekolwiek na planie** mają czerwoną obwódkę i delikatne
wypełnienie. Nieużyte zostają domyślne. To podpowiedź „czy o tym już pomyślałem
w tym sklepie", a nie zakaz — tę samą kategorię stawia się dwa razy, gdy sklep
ma ją w dwóch miejscach. Liczone z całego planu, nie z zaznaczonego klocka.

## Sterowanie myszą

Jak w programach graficznych:

- **kółko wciśnięte jak przycisk** (albo spacja z przeciągnięciem) — przesuwa widok
- **kółko kręcone** — przybliża pod kursorem
- **lewy przycisk na klocku** — zaznacza, przeciągnięcie go przesuwa
- **lewy przycisk po pustym polu** — kliknięcie odznacza, a **przeciągnięcie**
  rozciąga ramkę zaznaczenia, jak zaznaczanie plików na pulpicie; bierze
  wszystko, czego ramka dotknie

Kursor mówi, co się stanie po naciśnięciu: strzałka nad pustym polem, krzyżyk
przesuwania nad klockiem, strzałki rozciągania nad uchwytami i łapka przy
przesuwaniu widoku. Strzałka uchwytu bierze pod uwagę obrót klocka — przy 45°
pokazuje ukos, a nie pion czy poziom.

Ramka zapala się dopiero po przejechaniu kilku pikseli. Samo kliknięcie zostaje
kliknięciem — również wtedy, gdy przycisk był wciśnięty dłużej.

Na telefonie środkowego przycisku nie ma, więc tam palec po pustym polu nadal
przesuwa mapę, a zaznacza się stuknięciem.

## Zaznaczanie wielu klocków

Shift z kliknięciem dokłada klocki do zaznaczenia, ramka po pustym polu bierze
wszystko, czego dotknie, a `Ctrl+A` bierze wszystkie.
Przeciągnięcie któregokolwiek z zaznaczonych rusza całą grupą — przydaje się,
gdy trzeba przesunąć cały układ względem ścian, bo skala wyszła inaczej niż
w rzeczywistości.

Grupa jedzie w całości albo wcale: jeśli po puszczeniu wjechałaby na coś spoza
zaznaczenia, wraca tam, skąd wyszła. Pojedynczy klocek nadal odsuwa się sam na
najbliższe wolne pole, żeby dało się go przeciągnąć przez pół sklepu bez
zacinania o przeszkody po drodze.

Rozmiar i obrót ustawia się tylko przy jednym zaznaczonym klocku — przy grupie
nie wiadomo, wokół czego miałyby się obracać.

## Wejście i kasy

Sklep miewa po kilka jednych i drugich, więc stawia się je z palety jak każdy
inny klocek. Ale **jedno wejście i jedne kasy muszą zostać** — bez nich trasa nie
ma startu ani mety. Nadmiarowe usuwa się normalnie; przy ostatnim edytor odmawia
i mówi dlaczego. Zaznaczenie wszystkiego i `Delete` kasuje resztę, a te dwa
zostawia.

## Minimalne rozmiary klocków

Prawie każdy klocek schodzi do 1×1. Zostały trzy wyjątki, każdy z powodu:

- **regał dwustronny** ma dwie strony, więc ma co najmniej dwie kratki głębokości
- **wejście** ma zawsze 3 kratki szerokości
- **kasy** mają co najmniej 2×3

Przypisanie kategorii zmienia typ klocka, ale **nie rozdmuchuje go**: klocek 1×1
z mlekiem zostaje lodówką 1×1. Dopiero druga kategoria — czyli druga strona
alejki — pogrubia go do dwóch kratek, bo to fizycznie inne miejsce.

## Rozmiar sali

W panelu po prawej, pod nagłówkiem „Rozmiar sali", wpisuje się wymiary
z ręki. Zatwierdza Enter albo wyjście z pola. Sali nie da się zmniejszyć
poniżej tego, co już stoi — zamiast po cichu ucinać plan, edytor odmawia
i mówi, ile minimum wchodzi.

## Skróty klawiszowe w edytorze

| Skrót | Działanie |
| --- | --- |
| strzałki | przesuń zaznaczenie o kratkę |
| `R` | obróć o 45° (przy jednym zaznaczonym) |
| `Delete` | usuń zaznaczone |
| `Esc` | odznacz |
| `Ctrl+Z` / `Ctrl+Y` | cofnij / ponów |
| `Ctrl+C` / `Ctrl+V` | kopiuj / wklej zaznaczenie |
| `Ctrl+A` | zaznacz wszystkie klocki |
| `Shift` + kliknięcie | dołóż klocek do zaznaczenia albo wyjmij go |
| `Alt` + przeciągnięcie | duplikuj klocek |
| `Spacja` + przeciągnięcie | przesuń widok |
| kółko myszy | przybliż pod kursorem |
| wciśnięte kółko | przesuń widok |

## Testy

```bash
npm test
```

Dwa zestawy. Silnik trasy: walidacja planu, obracanie klocków, ciągłość ścieżki,
omijanie ścian, zgodność kosztu z narysowaną trasą, nieosiągalne sekcje.
Format pliku: zapis i odczyt w obie strony plus odrzucanie uszkodzonych
i obcych plików.

## Co jest w środku

### Mapowanie sklepu — dwie drogi

**Plan 2D** (`src/app/sklepy/plan/[id].tsx`) — układasz sklep z klocków na siatce
40×28 (około 1120 m², czyli typowa sala sprzedaży dyskontu). Regały, lady, lodówki,
zamrażarki, kosze, ściany, wejście i kasy. Regał dwustronny może mieć różne sekcje
po obu stronach i to właśnie ta informacja odróżnia dobrą trasę od średniej.

Sterowanie: zaznacz klocek stuknięciem, a pojawią się uchwyty — **obrót co 45°**
w lewym górnym rogu, **kasowanie** w prawym górnym, **przesuwanie** w prawym dolnym
i **cztery boki do rozciągania**. Ciągnięcie boku na zewnątrz wydłuża klocek o całe
kratki, do środka skraca; przy klocku obróconym liczy się rzut ruchu na kierunek
prostopadły do tej ściany, więc skos zachowuje się tak samo jak pion.

Widok: przeciągnięcie przesuwa mapę, kółko myszy przybliża pod kursorem, dwa palce
też, a w prawym dolnym rogu są przyciski + / − i wyśrodkowanie.

Pas między wejściem a kasami jest oznaczony na czerwono i regałów tam postawić się
nie da. Plan jest walidowany na bieżąco: brak wejścia, klocek bez dostępu, odcięta
alejka — wszystko wyłapywane, zanim popsuje trasę.

**Skala.** Obrys budynku da się zmierzyć linijką w Google Maps, ale pomiar obejmuje
magazyn i zaplecze. `lib/scale.ts` odejmuje z tego domyślnie 30% i proponuje siatkę:
1679 m² przy boku 50 m daje 50×24, czyli salę sprzedaży około 1200 m².

**Marszruta** (`src/app/sklepy/[id].tsx`) — prostsza droga: stukasz sekcje
w kolejności mijania. Zapasowa opcja, gdy ktoś nie chce układać planu.

Bez żadnego z tych dwóch lista i tak sortuje się po typowym układzie sieci.

### Silnik trasy

`src/lib/route.ts`, w całości offline:

1. rasteryzacja planu na siatkę ścian i podłogi
2. punkty dostępu przy ścianach klocków, osobno dla każdej strony regału
3. reprezentant sekcji — jedna kratka, „do której idzie się po produkt"
4. macierz odległości z BFS wielopunktowego
5. kolejność: Held-Karp do 13 sekcji (dokładnie optymalnie), wyżej najbliższy
   sąsiad plus 2-opt
6. ścieżka do narysowania i porównanie z kolejnością wpisywania

### Reszta

- **Katalog 928 produktów** z automatycznym przypisaniem do sekcji
- **Normalizacja polskiego wejścia** — odmiana („mleka" → mleko), brak ogonków
  („ser zolty"), literówki („mlyko"), ilość z przodu („2 kg ziemniaków")
- **Przełącznik „kolejność trasy / kolejność wpisywania"** na liście
- **Ręczne poprawianie sekcji** — czego katalog nie zna, trafia do „Inne"

### Czego nie ma

- Backendu, kont i wspólnej bazy map (faza 4) — wszystko żyje na urządzeniu
- Przeciągania klocków palcem — stawianie i przesuwanie jest na stuknięcia
- Katalog ma 525 pozycji, plan zakłada docelowo 2000–3000

## Struktura

```
design/          motyw — theme.css jest źródłem prawdy, tokens.ts to wersja dla RN
docs/            plan produktu
tests/           testy silnika trasy
src/app/         ekrany (expo-router)
src/data/        katalog sekcji, klocków, sieci, produktów
src/lib/         model planu, silnik trasy, normalizacja, dopasowanie, zapis
src/components/  zestaw komponentów i rysunek planu
```

## Zasady

Kolory wyłącznie przez tokeny z `design/`. Zmiana koloru idzie najpierw
do `design/theme.css`, potem do `design/tokens.ts` — szczegóły w
[`design/README.md`](design/README.md).

### Rozróżniamy to, co leży w innym miejscu

Zasada przy dzieleniu kategorii: **jeśli dwie rzeczy stoją w sklepie osobno,
to są osobnymi kategoriami** — choćby nazywały się podobnie. Papier toaletowy,
ręczniki papierowe, chusteczki i serwetki to cztery różne miejsca w regale,
więc „idź po papier" nic nie mówi.

Osobno traktujemy też **strefy rotacyjne**, których zawartość zmienia się
co tydzień:

- **Oferta czasowa — lodówka**: te dwa metry chłodziarki, gdzie stoi kuchnia
  grecka, potem hiszpańska, potem coś limitowanego
- **Oferta czasowa — półka**: to samo, ale na sucho
- **Kosze promocyjne**: wymieszany towar z przecen — patelnie obok walizek
  i wentylatorów, bez żadnego układu
- **Aleja środkowa**: klasyczna zmienna oferta tygodnia

Produkty przypisane do tych stref są z natury ubogie — nie da się wypisać
zawartości czegoś, co za tydzień będzie inne. Wartość jest w tym, że da się
taki regał zaznaczyć na mapie i poprowadzić przez niego trasę.

Katalog sekcji w `src/data/sections.ts` jest **zamknięty i wersjonowany**.
Dodanie sekcji to podbicie `CATALOG_VERSION`. Nie wolno pozwolić, żeby
kontrybutorzy wpisywali własne nazwy sekcji — inaczej mapy przestają być
porównywalne między sklepami.
