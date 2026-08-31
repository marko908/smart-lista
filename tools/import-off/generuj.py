# -*- coding: utf-8 -*-
"""Wygenerowanie nowych pozycji do products.ts.

Jedna kategoria taksonomii = jedna pozycja. Pierwsza polska nazwa jest nazwa
glowna, pozostale ida jako aliasy - dokladnie tak, jak plik to przewiduje
("Format: [nazwa, sekcja, aliasy oddzielone spacja").

Aliasy w tym pliku sa JEDNOWYRAZOWE (dziela sie po spacji), wiec wielowyrazowy
synonim nie moze byc aliasem - trafia jako osobna pozycja z ta sama sekcja.
"""
import io, json, re, unicodedata
from collections import defaultdict
from ziarna import ZIARNA, ZIARNA_URODA

BAZA = r"C:\Users\xkolo\OneDrive\Desktop\Projekty Claude\smart lista zakupów\src\data"


def norm(s):
    s = s.strip().lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s)


psrc = io.open(BAZA + r"\products.ts", encoding='utf-8').read()
MAMY = set()
for nazwa, sek, al in re.findall(r"\['([^']+)',\s*'([^']+)'(?:,\s*'([^']*)')?\]", psrc):
    MAMY.add(norm(nazwa))
    for a in (al or '').split(): MAMY.add(norm(a))
print(f"juz w katalogu: {len(MAMY)}")

src = io.open(BAZA + r"\sections.ts", encoding='utf-8').read()
NASZE = re.findall(r"^\s*\['([a-z0-9-]+)',", src, re.M)
KOLEJNOSC = {s: i for i, s in enumerate(NASZE)}
NAZWY_SEKCJI = dict(re.findall(r"^\s*\['([a-z0-9-]+)',\s*'([^']+)'", src, re.M))

CHEMIA = re.compile(r'(sodu|potasu|wapnia|magnezu|amonu|glinu|\be\d{3}\b|kwas |'
                    r'ynian\b|owian\b|siarcz|fosforan|azotan|benzoes|glutamin)', re.I)


# Taksonomia opisuje SWIAT, nie polke. Sa w niej etykiety klasyfikacyjne
# ("czeskie produkty miesne", "zywnosc pochodzenia roslinnego") i stany
# kulinarne ("kalafior gotowany"), ktorych nikt nie wpisze na liste zakupow,
# a ktore zasmiecalyby podpowiedzi przy pisaniu.
TAKSONOMICZNE = re.compile(
    r'\b(produkty|produktów|produktow|żywność|zywnosc|wyroby|artykuły|artykuly|'
    r'pochodzenia|wykorzystywane|części|czesci|alternatywy|niezielonych)\b'
    r'|gotowan|blanszowan', re.I)


def dobra(f):
    if TAKSONOMICZNE.search(f): return False
    return (3 <= len(f) <= 38
            and re.fullmatch(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9 -]+", f)
            and not CHEMIA.search(f))


wg_sekcji = defaultdict(list)
uzyte = set(MAMY)
ile_alias = 0

for plik, ziarna in [('tax-food-categories.json', ZIARNA),
                     ('tax-beauty-categories.json', ZIARNA_URODA),
                     ('tax-petfood-categories.json',
                      {'en:cat-food': 'karma-koty', 'en:dog-food': 'karma-psy'})]:
    tax = json.load(io.open(plik, encoding='utf-8'))
    mapa = json.load(io.open('mapa-off-sekcje.json', encoding='utf-8')) \
        if plik == 'tax-food-categories.json' else None
    if mapa is None:
        from buduj import zbuduj_mape
        mapa = zbuduj_mape(tax, ziarna)
    for klucz, wpis in tax.items():
        sek = mapa.get(klucz)
        if not sek or sek not in KOLEJNOSC: continue
        nazwy = [n for n in wpis.get('pl', []) if dobra(n)]
        nazwy = [n for n in nazwy if norm(n) not in uzyte]
        if not nazwy: continue
        glowna = nazwy[0]
        uzyte.add(norm(glowna))
        aliasy, dodatkowe = [], []
        for syn in nazwy[1:]:
            if norm(syn) in uzyte: continue
            uzyte.add(norm(syn))
            (aliasy if ' ' not in syn else dodatkowe).append(norm(syn))
        ile_alias += len(aliasy)
        wg_sekcji[sek].append((glowna.lower(), tuple(aliasy)))
        for extra in dodatkowe:
            wg_sekcji[sek].append((extra, ()))

pozycji = sum(len(v) for v in wg_sekcji.values())
print(f"nowych pozycji: {pozycji:,} (w tym {ile_alias} aliasow doklejonych)")
print(f"sekcji objetych: {len(wg_sekcji)}")


def esc(s):
    return s.replace("'", "\u2019")


linie = ["", "  // ═══════════════════════════════════════════════════════════════════",
         "  // Slownik z taksonomii Open Food Facts / Open Beauty Facts.",
         "  //",
         "  // Zrodlem sa POLSKIE NAZWY KATEGORII z taksonomii OFF, nie nazwy handlowe",
         "  // produktow. Nazwy handlowe probowalismy takze - okazaly sie zlepkiem",
         "  // przymiotnikow i urwanych form (\"atlantycki\", \"jogurt picia\"), wiec",
         "  // do katalogu nie weszly.",
         "  //",
         "  // Sekcje przypisane przez dziedziczenie po drzewie kategorii OFF: ziarno",
         "  // lezy wysoko, potomkowie je przejmuja. Skrypt i tabela ziaren sa poza",
         "  // repozytorium - to byl import jednorazowy, nie stale wiazanie.",
         "  // ═══════════════════════════════════════════════════════════════════"]

for sek in sorted(wg_sekcji, key=lambda s: KOLEJNOSC[s]):
    pozycje = sorted(set(wg_sekcji[sek]))
    linie.append(f"  // --- {NAZWY_SEKCJI.get(sek, sek)} ---")
    for nazwa, aliasy in pozycje:
        if aliasy:
            linie.append(f"  ['{esc(nazwa)}', '{sek}', '{esc(' '.join(aliasy))}'],")
        else:
            linie.append(f"  ['{esc(nazwa)}', '{sek}'],")

io.open('nowe-pozycje.ts', 'w', encoding='utf-8').write('\n'.join(linie) + '\n')
print("zapisane do nowe-pozycje.ts")
