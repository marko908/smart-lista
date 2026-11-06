# Skan sklepu spacerem (prototyp)

Z nagrania telefonu na klatce piersiowej robi szkic planu sklepu do poprawienia w edytorze.

## Nagranie (telefon)

1. Moje sklepy → **Skanuj sklep spacerem (prototyp)** (tylko administrator, działa w Expo Go).
2. Telefon na uchwycie na klatce piersiowej, aparatem do przodu. Aplikacja sama wybiera obiektyw
   szerokokątny, jeśli jest, i robi 1 małe zdjęcie na sekundę. Obok zapisuje krokomierz i kompas.
3. Zasady spaceru: każdą alejkę raz, środkiem, spokojnym krokiem; na początku alejki
   2 sekundy przodem do tablicy.
4. **Zakończ i wyślij** → arkusz udostępniania z jednym plikiem `*.alejka-skan.json`
   (sesja + zdjęcia). Wyślij go na komputer.

## Szkic planu (komputer)

```bash
npm run skan -- rozpakuj  skan.alejka-skan.json ./moj-skan
npm run skan -- etykietuj ./moj-skan            # model wizyjny, potrzebny klucz API Anthropic
npm run skan -- szkic     ./moj-skan "Lidl Zorska" lidl
```

Wynik `*.alejka.json` wczytujesz w aplikacji przyciskiem **Wczytaj sklep z pliku** i poprawiasz w edytorze.

- `etykiety.json` można poprawić ręcznie przed krokiem `szkic` — to zwykły JSON
  `{ "f0001.jpg": { "lewo": ["mleko"], "prawo": ["jogurty"] } }` z kluczami z `src/data/sections.ts`.
- Model wybierasz zmienną `SKAN_MODEL` (domyślnie `claude-opus-5-5`). Narzędzie wypisuje zużyte tokeny.
- Etykietowanie da się przerwać i wznowić: gotowe klatki zostają w `etykiety.json`.

## Jak liczona jest trasa

Kroki × długość kroku w kierunku z kompasu. Kurs przyciągamy do czterech kierunków głównych sklepu
(alejki są równoległe i prostopadłe), a krótkie skręty traktujemy jako szum. Kształt sklepu jest
przybliżony; kolejność alejek i rozmieszczenie kategorii są pewniejsze. Szczegóły: `src/lib/skan.ts`.

Gdy człowiek zawraca na końcu alejki, a telefon nie zarejestrował przejścia w bok (przerwa w nagraniu,
wózek tłumiący kroki), szkic dokłada przesunięcie o jedną alejkę w tę stronę, w którą ostatnio szło się
w bok. Rozstaw alejek ustawiasz zmienną `SKAN_ALEJKA` (metry, domyślnie 5). Każde takie dopowiedzenie
i każda przerwa w nagraniu trafia do ostrzeżeń.

Plik z telefonu ma też `dziennik` (zejście aplikacji w tło, stojący zegar, wolne zdjęcia) i oba strumienie
kroków osobno (`surowe`). `rozpakuj` wypisuje jedno i drugie — tak sprawdzamy, skąd biorą się przerwy.

## Osobna kamera zamiast telefonu

Gdy zdjęcia robi kamera na szyi, telefon jedzie w kieszeni w trybie **„Zdjęcia robi: osobna kamera”**
(liczy tylko kroki i kurs, ekran można wygasić stuknięciem w licznik). Na starcie pokaż kamerze duży
licznik z ekranu telefonu. Potem zamiast `rozpakuj`:

```
npm run skan -- film film.mp4 czujniki-….alejka-skan.json ./moj-skan          # wycina synchro/
npm run skan -- film film.mp4 czujniki-….alejka-skan.json ./moj-skan 12.4     # z przesunięciem
```

Przesunięcie = licznik widoczny na klatce − czas tej klatki w filmie (klatki `synchro/` są co 0,5 s).
Dalej jak zwykle: `etykietuj`, `szkic`. Potrzebny ffmpeg.
