# -*- coding: utf-8 -*-
"""Zbudowanie slownika: polska fraza -> nasza sekcja.

Zrodla, w kolejnosci zaufania:
  1. taksonomie OFF - czyste terminy generyczne z polskimi nazwami i synonimami
  2. frazy wykopane z nazw produktow, uzywane przez wiele marek

Sekcje przypisujemy przez dziedziczenie po drzewie OFF. DWIE RZECZY SA TU
NIEOCZYWISTE:

1. Liczy sie NAJBLIZSZE ziarno, nie pierwszy rodzic, ktory sie rozwiaze.
   Kategoria "kielbasa wieprzowa" ma dwoch rodzicow: kielbasy i mieso
   wieprzowe. Branie pierwszego z brzegu wysylalo kielbase do lady miesnej.
   Szukamy wszerz i wygrywa ziarno lezace najblizej.

2. Sposob przechowania bije rodzaj jedzenia. "Mrozony groszek" to nie regal
   z warzywami, tylko zamrazarka. Jesli wsrod przodkow jest mrozonka albo
   konserwa, nadpisuje to wynik normalnego dziedziczenia.
"""
import io, json, re, unicodedata
from collections import Counter, deque
from ziarna import ZIARNA, ZIARNA_URODA, NADPISANIA

BAZA = r"C:\Users\xkolo\OneDrive\Desktop\Projekty Claude\smart lista zakupów\src\data"
SEKCJE_TS = BAZA + r"\sections.ts"
PRODUKTY_TS = BAZA + r"\products.ts"

src = io.open(SEKCJE_TS, encoding='utf-8').read()
NASZE = set(re.findall(r"^\s*\['([a-z0-9-]+)',", src, re.M))

psrc = io.open(PRODUKTY_TS, encoding='utf-8').read()
MAMY = set()
for nazwa, sek, al in re.findall(r"\['([^']+)',\s*'([^']+)'(?:,\s*'([^']*)')?\]", psrc):
    MAMY.add(nazwa.lower())
    for a in (al or '').split():
        MAMY.add(a.lower())


def przodkowie(tax, klucz):
    """Wszyscy przodkowie z odlegloscia, wszerz."""
    out, widziane, q = {}, {klucz}, deque([(klucz, 0)])
    while q:
        k, d = q.popleft()
        out[k] = min(out.get(k, 99), d)
        for r in tax.get(k, {}).get('parents', []):
            if r not in widziane:
                widziane.add(r)
                q.append((r, d + 1))
    return out


def zbuduj_mape(tax, ziarna):
    mapa = {}
    for klucz in tax:
        anc = przodkowie(tax, klucz)
        # najblizsze ziarno
        kand = [(d, ziarna[k]) for k, d in anc.items() if k in ziarna]
        sek = min(kand)[1] if kand else None

        # sposob przechowania nadpisuje rodzaj jedzenia
        for rodzic_nadrzedny, regula in NADPISANIA.items():
            if rodzic_nadrzedny in anc and anc[rodzic_nadrzedny] > 0 or rodzic_nadrzedny == klucz:
                szczegol = [(d, regula[k]) for k, d in anc.items() if k in regula]
                sek = min(szczegol)[1] if szczegol else regula.get('*', sek)
                break
        mapa[klucz] = sek
    return mapa


def norm(s):
    s = s.strip().lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s)


# Chemia z listy skladnikow to nie sa zakupy. Filtrujemy koncowki nazw
# dodatkow i substancji, ktorych nikt nie wpisze na liste.
CHEMIA = re.compile(r'(sodu|potasu|wapnia|magnezu|amonu|glinu|\be\d{3}\b|kwas |'
                    r'ynian\b|owian\b|siarcz|fosforan|azotan|benzoes|glutamin)', re.I)

wynik = {}


def dodaj(fraza, sekcja, zrodlo):
    f = fraza.strip()
    if not (3 <= len(f) <= 40): return
    if not re.fullmatch(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9 %.-]+", f): return
    if CHEMIA.search(f): return
    n = norm(f)
    if n in MAMY or n in wynik: return
    wynik[n] = (f.lower(), sekcja, zrodlo)


ZRODLA = [
    ('tax-food-categories.json', ZIARNA, 'taksonomia-zywnosc'),
    ('tax-beauty-categories.json', ZIARNA_URODA, 'taksonomia-uroda'),
    ('tax-petfood-categories.json',
     {'en:cat-food': 'karma-koty', 'en:dog-food': 'karma-psy',
      'en:bird-food': 'akcesoria-zwierzeta', 'en:fish-food': 'akcesoria-zwierzeta'},
     'taksonomia-karma'),
]

MAPY = {}
for plik, ziarna, zrodlo in ZRODLA:
    tax = json.load(io.open(plik, encoding='utf-8'))
    mapa = zbuduj_mape(tax, ziarna)
    MAPY[plik] = (tax, mapa)
    zpl = [k for k in tax if tax[k].get('pl')]
    trafione = sum(1 for k in zpl if mapa.get(k))
    print(f"{plik:<34} z polska nazwa: {len(zpl):>5,}  przypisanych: {trafione:>5,}")
    for klucz in zpl:
        sek = mapa.get(klucz)
        if sek:
            for nazwa in tax[klucz]['pl']:
                dodaj(nazwa, sek, zrodlo)

json.dump(MAPY['tax-food-categories.json'][1],
          io.open('mapa-off-sekcje.json', 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(wynik, io.open('slownik-taksonomia.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=0)

print(f"\nfraz ze slownika taksonomii: {len(wynik):,}")
licz = Counter(v[1] for v in wynik.values())
print(f"sekcji objetych: {len(licz)} z {len(NASZE)}")

# kontrola jakosci na przypadkach, ktore wczesniej szly zle
KONTROLA = [('kiełbasy wieprzowe', 'kielbasy'), ('sushi z tuńczykiem', 'sushi'),
            ('wody smakowe', 'woda-smakowa')]
print("\nkontrola poprawek:")
for fraza, oczekiwana in KONTROLA:
    got = wynik.get(norm(fraza))
    stan = 'OK  ' if got and got[1] == oczekiwana else 'BLAD'
    print(f"  {stan} {fraza:<24} -> {got[1] if got else '(brak)':<18} (chcielismy {oczekiwana})")
