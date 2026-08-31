# Import słownika z Open Food Facts

Jednorazowy import, który rozszerzył `src/data/products.ts` z 928 do 2211 pozycji.
Zapisany, żeby dało się go powtórzyć — po aktualizacji taksonomii OFF albo po
dodaniu nowych sekcji do `sections.ts`.

## Co jest źródłem

**Polskie nazwy kategorii z taksonomii OFF**, nie nazwy handlowe produktów.

Nazwy handlowe próbowaliśmy najpierw i to była ślepa uliczka. Z 49 287 polskich
produktów dało się wykopać frazy używane przez wiele marek, ale po odsianiu
angielskiego i niemieckiego z wielojęzycznych opakowań zostawały głównie
przymiotniki i urwane formy: „atlantycki", „karbowane", „jogurt picia",
„ser plastrach". Do katalogu nie weszły.

Taksonomia jest słownikiem, a nie zlepkiem z etykiet — i to widać w wyniku.

```
https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/food/categories.txt
https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/beauty/categories.txt
https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/petfood/categories.txt
```

Wersja `.txt` z GitHuba, nie `.json` z `static.openfoodfacts.org` — JSON gubi
synonimy, a to one dają aliasy.

## Jak to działa

1. `tax.py` — parsuje `.txt` do JSON-a: klucz kanoniczny → polskie nazwy + rodzice
2. `ziarna.py` — **tabela mapowania**: kategoria OFF → nasza sekcja
3. `buduj.py` — rozwiązuje sekcję dla każdej kategorii przez drzewo
4. `generuj.py` — wypluwa gotowe linijki do `products.ts`

Ziarna leżą **wysoko w drzewie**, a potomkowie dziedziczą. Dzięki temu 190 ziaren
obsługuje 14 489 kategorii. Doprecyzowanie kosztuje jedną linijkę, nie
przepisywanie gałęzi.

## Trzy rzeczy, które kosztowały najwięcej

**Najbliższe ziarno, nie pierwszy rodzic.** „Kiełbasa wieprzowa" ma dwóch
rodziców: kiełbasy i mięso wieprzowe. Branie pierwszego z brzegu wysyłało
kiełbasę do lady mięsnej. Szukamy wszerz i wygrywa ziarno najbliżej.

**Sposób przechowania bije rodzaj jedzenia.** „Mrożone ziemniaki" to zamrażarka,
nie regał z warzywami. Patrz `NADPISANIA` w `ziarna.py`.

**Martwe ziarna trzeba wykrywać.** Pierwsza wersja tabeli miała 49 kluczy, których
w taksonomii OFF nie ma — `en:sushi` zamiast `en:sushis`, brytyjskie
`en:flavoured-waters` zamiast amerykańskiego `en:flavored-waters`. Nie dawały
błędu, po prostu po cichu nic nie robiły. `buduj.py` je teraz zgłasza.

## Czego stąd nie będzie

Dump OFF jest **wyłącznie spożywczy**. Chemia gospodarcza, papier, narzędzia,
tekstylia — te sekcje nie dostaną stąd nic. Open Beauty Facts pokrywa higienę
i kosmetyki (129 polskich terminów), Open Products Facts jest przetłumaczony
w 95%, ale zakresem sięga od taśm klejących po silniki do łodzi, więc wymaga
przycięcia do tego, co stoi w markecie.
