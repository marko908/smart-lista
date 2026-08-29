# Motyw UI — Alejka

Motyw bazowy aplikacji. Ciepła piaskowa neutralność, złoty akcent `#c1a875`,
grafitowy kontrapunkt `#3d4147`. Pełne wsparcie trybu jasnego i ciemnego.

## Pliki

| Plik | Do czego |
| --- | --- |
| `theme.css` | **Źródło prawdy.** Format shadcn/ui + Tailwind v4. Zmiany zaczynają się tutaj. |
| `tokens.ts` | Te same wartości dla React Native / Expo. RN nie czyta zmiennych CSS. |

## Zasady

1. **Nie hardkoduj kolorów w komponentach.** Zawsze przez token — `var(--primary)`
   na webie, `colors.primary` w RN.
2. **Zmiana koloru idzie w dwóch miejscach naraz** — najpierw `theme.css`,
   potem `tokens.ts`. Rozjazd między nimi to najczęstszy błąd w tym układzie.
3. **Nowy kolor to decyzja, nie odruch.** Zanim dorzucisz szósty odcień,
   sprawdź, czy `chart-1..5`, `accent` albo `destructive` już go nie pokrywają.
   Znaczenia specyficzne dla Alejki (linia trasy, klocki regałów, węzły
   topologii) są w `tokens.ts` wyprowadzone z tokenów bazowych — patrz
   funkcja `semantic()`.

## Fonty

- **Inter** — interfejs, tekst bieżący
- **JetBrains Mono** — dane, etykiety sekcji, liczby w kolumnach
- **Georgia** — rola serif, jeśli gdzieś będzie potrzebna

Domyślny `letter-spacing` to `-0.02em`. W React Native trzeba go przeliczać
na piksele — jest do tego `typography.tracking(fontSize)`.

## Uwaga o kontraście

Złoto `#c1a875` na białym tle daje ok. **2.1:1** — za mało na tekst
(WCAG AA wymaga 4.5:1 dla tekstu i 3:1 dla elementów interfejsu).
Używaj go jako wypełnienia, obramowania, linii trasy i tła przycisków
z białym tekstem — nie jako koloru drobnego tekstu na jasnym tle.
Do tekstu drugorzędnego jest `--muted-foreground` (`#6b6352`, ok. 5.9:1).

W trybie ciemnym `#d4bc8b` na `#141412` daje ok. **9.5:1** i tam jako kolor
tekstu jest bezpieczne.
