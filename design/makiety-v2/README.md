# Makiety v2 (Alejka)

Źródła klikalnych makiet z płótna https://claude.ai/artifact/Tig6gU98Eu39qRyhiMtZXj.
Każdy plik `ekrany/*.dc.html` to jeden ekran z działającą logiką (klasa `Component`, metoda `renderVals()`), więc przy budowie aplikacji można podejrzeć dokładne zachowanie: progi, opóźnienia, animacje i rozpoznawanie ilości.

Wymagania opisowe są w `docs/USTALENIA.md`, razem z tabelą kodów ekranów.

| Plik | Kod |
|---|---|
| E00-b-Pierwszy | S0 |
| E00-a-Start | S1 |
| E01-a-Typowy | L1 |
| E01-b-Pusta | L2 |
| E01-c-MVP | L3 |
| E02-Edycja | L4 |
| F1-Pusto … F6-Gotowe | N1 … N6 |
| A-2-Zakupy | Z1 |
| A-3-Mapa | Z2 |
| A-6-Koniec | Z3 |
| A-7-Skaner | PA0 |
| A-5-Paragon | PA1 |
| A-8-Paragony | PA2 |
| A-4-Promocje | PR1 |

## Generator

- `generator/silnik.js`: wspólna logika listy, czyli katalog, rozpoznawanie wpisu (`rozpoznaj`: ilość, jednostka, dział) i formatowanie (`fmt`).
- `generator/lista.tpl.html` + `build.py` generują L1, L2 i L4.
- `generator/flow.tpl.html` + `flow_build.py` generują N1–N6.
- `generator/*test.js`: testy logiki w Node, np. `node generator/ztest.js ekrany/A-2-Zakupy.dc.html`.

Skrypty zakładają układ katalogów `gen/` i `makiety/project/`, w którym powstawały. Przy uruchamianiu tutaj trzeba poprawić ścieżki.
