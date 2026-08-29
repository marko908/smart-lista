/**
 * Katalog sekcji sklepowych — ZAMKNIĘTY i WERSJONOWANY.
 *
 * Kontrybutorzy wybierają z tej listy, nigdy nie wpisują własnych nazw. Bez tego
 * po kilku miesiącach mamy „Nabiał", „nabial", „Mleczne" i „Lodówki" jako cztery
 * różne byty i koniec z porównywalnością map między sklepami.
 *
 * Podział jest CELOWO drobny: osobno mąki, osobno cukier, osobno jogurty, osobno
 * sery żółte. Im drobniej, tym dokładniej da się poprowadzić człowieka po sklepie —
 * „idź do nabiału" jest bezużyteczne przy dwunastometrowej chłodni, „idź do jogurtów"
 * już nie. Ceną jest to, że jeden regał trzeba postawić jako kilka krótszych klocków,
 * bo klocek obsługuje najwyżej dwie kategorie.
 *
 * KOLEJNOŚĆ MA ZNACZENIE: sekcje są wypisane mniej więcej w takiej kolejności,
 * w jakiej mija się je w typowym sklepie. Ta kolejność służy za podkładkę dla sieci,
 * których konkretnego sklepu nikt jeszcze nie zmapował.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * JAK DODAĆ KATEGORIĘ
 *
 * Jedna linijka w tablicy DEFS poniżej, w miejscu odpowiadającym temu, gdzie
 * dana rzecz stoi w sklepie:
 *
 *   ['klucz', 'Nazwa widoczna', 'Grupa', 'kolor', 'podpowiedź albo pusty tekst'],
 *
 *   klucz   — bez ogonków i spacji, myślniki zamiast spacji, już nigdy niezmieniany
 *   Grupa   — jedna z SectionGroup poniżej
 *   kolor   — jedna z CategoryKey z design/tokens.ts (swieze, nabial, mieso,
 *             mrozone, pieczywo, napoje, suche, chemia, infra, pusty)
 *
 * Potem podbij CATALOG_VERSION. To wszystko — reszta aplikacji podchwytuje
 * nową kategorię sama: pojawi się w wyszukiwarce, w kolejności sieci i w trasie.
 *
 * Jeśli kategoria ma nadawać klockowi konkretny typ (lodówka, lada, stoisko),
 * dopisz ją jeszcze do TYPE_FOR_SECTION w src/data/blocks.ts. Bez tego dostanie
 * zwykły regał, co dla większości rzeczy jest w porządku.
 *
 * NIE dodawaj możliwości wpisywania własnych nazw w aplikacji. Katalog jest
 * zamknięty właśnie po to, żeby mapy z różnych sklepów dało się porównywać —
 * gdyby każdy wpisywał po swojemu, po kwartale byłoby pięć wariantów „nabiału".
 * Kategorię dopisuje się tutaj, w tym pliku, i podbija CATALOG_VERSION.
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { CategoryKey } from '../../design/tokens';

export const CATALOG_VERSION = 9;

export type SectionGroup =
  | 'Świeże'
  | 'Nabiał'
  | 'Mięso i ryby'
  | 'Mrożone'
  | 'Sypkie'
  | 'Dodatki i przetwory'
  | 'Słodycze i przekąski'
  | 'Napoje'
  | 'Alkohole'
  | 'Zdrowie i dieta'
  | 'Chemia'
  | 'Higiena i kosmetyki'
  | 'Dzieci i zwierzęta'
  | 'Dom'
  | 'Pozostałe';

export type Section = {
  key: SectionKey;
  name: string;
  group: SectionGroup;
  cat: CategoryKey;
  hint?: string;
};

/** Definicje w kolejności przejścia przez typowy sklep. */
const DEFS = [
  // ---- Świeże, zaraz za wejściem ----
  ['warzywa', 'Warzywa', 'Świeże', 'swieze', ''],
  ['owoce', 'Owoce', 'Świeże', 'swieze', ''],
  ['soki-swieze', 'Świeże soki', 'Świeże', 'swieze', 'wyciskane na miejscu, chłodzone'],
  ['salaty', 'Sałaty i warzywa pakowane', 'Świeże', 'swieze', 'miksy, roszponka, rukola'],
  ['ziola-swieze', 'Zioła świeże', 'Świeże', 'swieze', ''],
  ['kwiaty', 'Kwiaty i rośliny', 'Świeże', 'swieze', ''],
  ['piekarnia', 'Piekarnia', 'Świeże', 'pieczywo', 'wypiek na miejscu'],
  ['pieczywo-swieze', 'Pieczywo świeże', 'Świeże', 'pieczywo', ''],
  ['pieczywo-pakowane', 'Pieczywo pakowane', 'Świeże', 'pieczywo', 'tostowe, chrupkie, bułki'],
  ['ciasta', 'Ciasta i desery', 'Świeże', 'pieczywo', ''],

  // ---- Nabiał ----
  ['jaja', 'Jaja', 'Nabiał', 'nabial', ''],
  ['mleko', 'Mleko', 'Nabiał', 'nabial', ''],
  ['napoje-roslinne', 'Napoje roślinne', 'Nabiał', 'nabial', 'owsiane, migdałowe, sojowe'],
  ['jogurty', 'Jogurty', 'Nabiał', 'nabial', ''],
  ['kefiry', 'Kefiry i maślanki', 'Nabiał', 'nabial', ''],
  ['serki-twarogi', 'Serki i twarogi', 'Nabiał', 'nabial', ''],
  ['sery-zolte', 'Sery żółte', 'Nabiał', 'nabial', ''],
  ['sery-plesniowe', 'Sery pleśniowe i specjalne', 'Nabiał', 'nabial', 'feta, mozzarella, camembert'],
  ['sery-lada', 'Sery na wagę', 'Nabiał', 'nabial', ''],
  ['smietany', 'Śmietany', 'Nabiał', 'nabial', ''],
  ['masla', 'Masła i margaryny', 'Nabiał', 'nabial', ''],
  ['desery-mleczne', 'Desery mleczne', 'Nabiał', 'nabial', 'budynie, serki homogenizowane'],

  // ---- Mięso i ryby ----
  ['mieso-swieze', 'Mięso świeże', 'Mięso i ryby', 'mieso', 'schab, karkówka, wołowina'],
  ['drob', 'Drób', 'Mięso i ryby', 'mieso', ''],
  ['mieso-mielone', 'Mięso mielone', 'Mięso i ryby', 'mieso', ''],
  ['wedliny', 'Wędliny pakowane', 'Mięso i ryby', 'mieso', ''],
  ['wedliny-lada', 'Wędliny na wagę', 'Mięso i ryby', 'mieso', ''],
  ['kielbasy', 'Kiełbasy', 'Mięso i ryby', 'mieso', ''],
  ['grill', 'Mięso na grilla', 'Mięso i ryby', 'mieso', 'karkówka marynowana, kiełbaski, szaszłyki, ser na grilla'],
  ['parowki', 'Parówki', 'Mięso i ryby', 'mieso', ''],
  ['ryby-swieze', 'Ryby świeże', 'Mięso i ryby', 'mieso', ''],
  ['ryby-wedzone', 'Ryby wędzone i marynowane', 'Mięso i ryby', 'mieso', 'śledzie, łosoś, makrela'],
  ['garmazerka', 'Garmażerka', 'Mięso i ryby', 'mieso', 'sałatki, pierogi, surówki'],
  ['dania-gotowe', 'Dania gotowe chłodzone', 'Mięso i ryby', 'mieso', ''],
  ['oferta-czasowa-lodowka', 'Oferta czasowa — lodówka', 'Świeże', 'swieze', 'strefa rotacyjna: kuchnie świata, produkty limitowane'],
  ['sushi', 'Sushi', 'Mięso i ryby', 'mieso', 'osobna lada albo lodówka'],

  // ---- Mrożone ----
  ['mrozone-warzywa', 'Mrożone warzywa', 'Mrożone', 'mrozone', ''],
  ['mrozone-owoce', 'Mrożone owoce', 'Mrożone', 'mrozone', ''],
  ['frytki', 'Frytki i ziemniaki mrożone', 'Mrożone', 'mrozone', ''],
  ['mrozone-dania', 'Mrożone dania i pizze', 'Mrożone', 'mrozone', ''],
  ['mrozone-ryby', 'Mrożone ryby', 'Mrożone', 'mrozone', ''],
  ['lody', 'Lody', 'Mrożone', 'mrozone', ''],

  // ---- Sypkie ----
  ['makarony', 'Makarony', 'Sypkie', 'suche', ''],
  ['ryze', 'Ryże', 'Sypkie', 'suche', ''],
  ['kasze', 'Kasze', 'Sypkie', 'suche', ''],
  ['straczki', 'Strączki', 'Sypkie', 'suche', 'soczewica, ciecierzyca, fasola'],
  ['maki', 'Mąki', 'Sypkie', 'suche', ''],
  ['cukier', 'Cukier i słodziki', 'Sypkie', 'suche', ''],
  ['dodatki-pieczenie', 'Dodatki do pieczenia', 'Sypkie', 'suche', 'drożdże, proszek, budyń'],
  ['bakalie', 'Bakalie i orzechy', 'Sypkie', 'suche', ''],
  ['platki', 'Płatki śniadaniowe', 'Sypkie', 'suche', ''],
  ['musli', 'Musli i granola', 'Sypkie', 'suche', ''],
  ['kaszki', 'Kaszki i owsianki', 'Sypkie', 'suche', ''],

  // ---- Dodatki i przetwory ----
  ['oleje', 'Oleje i oliwy', 'Dodatki i przetwory', 'suche', ''],
  ['octy', 'Octy', 'Dodatki i przetwory', 'suche', ''],
  ['sosy', 'Sosy', 'Dodatki i przetwory', 'suche', 'sojowy, czosnkowy, do spaghetti'],
  ['ketchup-majonez', 'Ketchupy i majonezy', 'Dodatki i przetwory', 'suche', ''],
  ['musztardy', 'Musztardy i chrzany', 'Dodatki i przetwory', 'suche', ''],
  ['przyprawy', 'Przyprawy', 'Dodatki i przetwory', 'suche', ''],
  ['ziola-suszone', 'Zioła suszone', 'Dodatki i przetwory', 'suche', ''],
  ['zupy-buliony', 'Zupy i buliony', 'Dodatki i przetwory', 'suche', 'kostki, saszetki, zupki'],
  ['pomidory-passaty', 'Pomidory i passaty', 'Dodatki i przetwory', 'suche', ''],
  ['konserwy-rybne', 'Konserwy rybne', 'Dodatki i przetwory', 'suche', ''],
  ['konserwy-warzywne', 'Konserwy warzywne', 'Dodatki i przetwory', 'suche', 'kukurydza, groszek, fasola'],
  ['konserwy-miesne', 'Konserwy mięsne', 'Dodatki i przetwory', 'suche', ''],
  ['kiszonki', 'Kiszonki', 'Dodatki i przetwory', 'suche', ''],
  ['marynaty', 'Marynaty i oliwki', 'Dodatki i przetwory', 'suche', ''],
  ['dzemy', 'Dżemy i powidła', 'Dodatki i przetwory', 'suche', ''],
  ['miody', 'Miody', 'Dodatki i przetwory', 'suche', ''],
  ['kremy-smarowanie', 'Kremy do smarowania', 'Dodatki i przetwory', 'suche', 'czekoladowe, orzechowe'],
  ['kuchnie-swiata', 'Kuchnie świata', 'Dodatki i przetwory', 'suche', ''],

  // ---- Słodycze i przekąski ----
  ['czekolady', 'Czekolady', 'Słodycze i przekąski', 'suche', ''],
  ['batony', 'Batony', 'Słodycze i przekąski', 'suche', ''],
  ['cukierki', 'Cukierki i żelki', 'Słodycze i przekąski', 'suche', ''],
  ['ciastka', 'Ciastka i herbatniki', 'Słodycze i przekąski', 'suche', ''],
  ['wafle', 'Wafle i wafelki', 'Słodycze i przekąski', 'suche', ''],
  ['guma-mietowki', 'Gumy i miętówki', 'Słodycze i przekąski', 'suche', ''],
  ['chipsy', 'Chipsy', 'Słodycze i przekąski', 'suche', ''],
  ['chrupki', 'Chrupki i prażynki', 'Słodycze i przekąski', 'suche', ''],
  ['paluszki-krakersy', 'Paluszki i krakersy', 'Słodycze i przekąski', 'suche', ''],
  ['orzeszki', 'Orzeszki przekąskowe', 'Słodycze i przekąski', 'suche', ''],
  ['przekaski-miesne', 'Kabanosy i przekąski mięsne', 'Słodycze i przekąski', 'mieso', 'sucha półka, nie chłodnia'],
  ['popcorn', 'Popcorn', 'Słodycze i przekąski', 'suche', ''],

  // ---- Napoje ----
  ['woda', 'Woda', 'Napoje', 'napoje', ''],
  ['woda-smakowa', 'Woda smakowa', 'Napoje', 'napoje', ''],
  ['napoje-gazowane', 'Napoje gazowane', 'Napoje', 'napoje', ''],
  ['napoje-niegazowane', 'Napoje niegazowane', 'Napoje', 'napoje', 'ice tea, lemoniady'],
  ['soki', 'Soki i nektary', 'Napoje', 'napoje', ''],
  ['energetyki', 'Napoje energetyczne', 'Napoje', 'napoje', ''],
  ['izotoniki', 'Izotoniki', 'Napoje', 'napoje', ''],
  ['syropy', 'Syropy i koncentraty', 'Napoje', 'napoje', ''],
  ['kawa', 'Kawa', 'Napoje', 'suche', ''],
  ['kawa-kapsulki', 'Kawa w kapsułkach', 'Napoje', 'suche', ''],
  ['herbata', 'Herbata', 'Napoje', 'suche', ''],
  ['kakao', 'Kakao i czekolada do picia', 'Napoje', 'suche', ''],

  // ---- Alkohole ----
  ['piwo', 'Piwo', 'Alkohole', 'napoje', ''],
  ['piwo-bezalkoholowe', 'Piwo bezalkoholowe', 'Alkohole', 'napoje', ''],
  ['cydr-drinki', 'Cydry i drinki', 'Alkohole', 'napoje', ''],
  ['wino', 'Wino', 'Alkohole', 'napoje', ''],
  ['alkohole-mocne', 'Alkohole mocne', 'Alkohole', 'napoje', ''],

  // ---- Zdrowie i dieta ----
  ['proteinowe', 'Produkty proteinowe', 'Zdrowie i dieta', 'suche', 'odżywki, batony, skyry'],
  ['bez-glutenu', 'Bezglutenowe', 'Zdrowie i dieta', 'suche', ''],
  ['wege-zamienniki', 'Zamienniki wege', 'Zdrowie i dieta', 'suche', 'tofu, kotlety, parówki wege'],
  ['zdrowa-zywnosc', 'Zdrowa żywność', 'Zdrowie i dieta', 'suche', 'chia, siemię, superfoods'],
  ['suplementy', 'Suplementy i witaminy', 'Zdrowie i dieta', 'chemia', ''],
  ['apteczka', 'Apteczka', 'Zdrowie i dieta', 'chemia', 'plastry, leki bez recepty'],

  // ---- Chemia ----
  ['pranie', 'Pranie', 'Chemia', 'chemia', 'proszki, płyny, kapsułki'],
  ['zmywarka', 'Zmywarka', 'Chemia', 'chemia', ''],
  ['plyny-naczynia', 'Płyny do naczyń', 'Chemia', 'chemia', ''],
  ['czyszczenie', 'Środki czyszczące', 'Chemia', 'chemia', 'kuchnia, łazienka, podłogi'],
  ['akcesoria-sprzatanie', 'Akcesoria do sprzątania', 'Chemia', 'chemia', 'gąbki, mopy, ścierki'],
  ['worki-smieci', 'Worki na śmieci', 'Chemia', 'chemia', ''],
  ['folie-kuchenne', 'Folie i papier do pieczenia', 'Chemia', 'chemia', 'aluminiowa, spożywcza, rękawy'],
  ['odswiezacze', 'Odświeżacze powietrza', 'Chemia', 'chemia', ''],
  ['papier-toaletowy', 'Papier toaletowy', 'Chemia', 'chemia', ''],
  ['reczniki-papierowe', 'Ręczniki papierowe', 'Chemia', 'chemia', 'papier kuchenny, czyściwo'],
  ['chusteczki', 'Chusteczki higieniczne', 'Chemia', 'chemia', 'pudełka i kieszonkowe'],
  ['serwetki', 'Serwetki', 'Chemia', 'chemia', ''],

  // ---- Higiena i kosmetyki ----
  ['higiena-zeby', 'Higiena jamy ustnej', 'Higiena i kosmetyki', 'chemia', ''],
  ['kapiel', 'Kąpiel i prysznic', 'Higiena i kosmetyki', 'chemia', 'żele, mydła, płyny'],
  ['wlosy', 'Włosy', 'Higiena i kosmetyki', 'chemia', 'szampony, odżywki, farby'],
  ['golenie', 'Golenie i depilacja', 'Higiena i kosmetyki', 'chemia', ''],
  ['dezodoranty', 'Dezodoranty', 'Higiena i kosmetyki', 'chemia', ''],
  ['higiena-intymna', 'Higiena intymna', 'Higiena i kosmetyki', 'chemia', ''],
  ['pielegnacja-twarzy', 'Pielęgnacja twarzy', 'Higiena i kosmetyki', 'chemia', ''],
  ['pielegnacja-ciala', 'Pielęgnacja ciała', 'Higiena i kosmetyki', 'chemia', ''],
  ['makijaz', 'Makijaż', 'Higiena i kosmetyki', 'chemia', ''],
  ['rajstopy', 'Rajstopy i skarpety', 'Higiena i kosmetyki', 'chemia', 'stojak przy kosmetykach, nie przy pościeli'],

  // ---- Dzieci i zwierzęta ----
  ['pieluchy', 'Pieluchy', 'Dzieci i zwierzęta', 'chemia', ''],
  ['zywnosc-dzieci', 'Żywność dla dzieci', 'Dzieci i zwierzęta', 'chemia', 'kaszki, słoiczki, mleko'],
  ['akcesoria-dzieci', 'Akcesoria dla dzieci', 'Dzieci i zwierzęta', 'chemia', ''],
  ['karma-psy', 'Karma dla psów', 'Dzieci i zwierzęta', 'suche', ''],
  ['karma-koty', 'Karma dla kotów', 'Dzieci i zwierzęta', 'suche', ''],
  ['akcesoria-zwierzeta', 'Akcesoria dla zwierząt', 'Dzieci i zwierzęta', 'suche', 'żwirek, smycze, zabawki'],

  // ---- Dom ----
  ['naczynia', 'Naczynia i sztućce', 'Dom', 'chemia', ''],
  ['akcesoria-kuchenne', 'Akcesoria kuchenne', 'Dom', 'chemia', 'garnki, patelnie, pojemniki'],
  ['baterie-zarowki', 'Baterie i żarówki', 'Dom', 'chemia', ''],
  ['papiernicze', 'Artykuły papiernicze', 'Dom', 'chemia', ''],
  ['zabawki', 'Zabawki', 'Dom', 'chemia', ''],
  ['tekstylia', 'Tekstylia', 'Dom', 'chemia', ''],
  ['grill-akcesoria', 'Akcesoria do grilla', 'Dom', 'chemia', 'węgiel, podpałka, tacki, ruszty'],
  ['ogrod', 'Ogród i sezon', 'Dom', 'chemia', ''],
  ['narzedzia', 'Narzędzia i majsterkowanie', 'Dom', 'chemia', 'Parkside, elektronarzędzia, warsztat'],
  ['motoryzacja', 'Motoryzacja', 'Dom', 'chemia', ''],

  // ---- Pozostałe ----
  ['prasa', 'Prasa', 'Pozostałe', 'chemia', ''],
  ['oferta-czasowa-polka', 'Oferta czasowa — półka', 'Pozostałe', 'suche', 'kuchnie świata, sezonowe, limitowane'],
  ['kosze-promocyjne', 'Kosze promocyjne', 'Pozostałe', 'suche', 'wymieszany towar z przecen: patelnie, walizki, wentylatory'],
  ['aleja-srodkowa', 'Aleja środkowa', 'Pozostałe', 'suche', 'zmienna oferta tygodnia'],
  ['inne', 'Inne', 'Pozostałe', 'pusty', 'czego nie udało się rozpoznać'],
] as const;

export type SectionKey = (typeof DEFS)[number][0];

export const SECTIONS: Section[] = DEFS.map(([key, name, group, cat, hint]) => ({
  key,
  name,
  group: group as SectionGroup,
  cat: cat as CategoryKey,
  hint: hint || undefined,
}));

export const SECTION_BY_KEY: Record<SectionKey, Section> = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s])
) as Record<SectionKey, Section>;

/**
 * Grupy w kolejności wyświetlania w wyszukiwarce sekcji.
 * To tylko szufladki dla oka — trasę wyznacza kolejność DEFS, nie grupa.
 */
export const SECTION_GROUPS: SectionGroup[] = [
  'Świeże',
  'Nabiał',
  'Mięso i ryby',
  'Mrożone',
  'Sypkie',
  'Dodatki i przetwory',
  'Słodycze i przekąski',
  'Napoje',
  'Alkohole',
  'Zdrowie i dieta',
  'Chemia',
  'Higiena i kosmetyki',
  'Dzieci i zwierzęta',
  'Dom',
  'Pozostałe',
];

export const CATALOG_ORDER: SectionKey[] = SECTIONS.map((s) => s.key);

export function sectionName(key: SectionKey): string {
  return SECTION_BY_KEY[key]?.name ?? 'Inne';
}

export function sectionCategory(key: SectionKey): CategoryKey {
  return SECTION_BY_KEY[key]?.cat ?? 'pusty';
}

export function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === 'string' && v in SECTION_BY_KEY;
}

/**
 * Sekcje z wcześniejszych, grubszych wersji katalogu.
 *
 * Rozbicie „Nabiału" na mleko, jogurty i sery jest dobre dla trasy, ale zapisane
 * plany i pliki pamiętają stare klucze. Bez tłumaczenia znikałyby z map bez słowa.
 * Tam, gdzie jedna stara sekcja rozpadła się na kilka, wskazujemy tę najbardziej
 * pojemną — resztę człowiek poprawi.
 */
export const LEGACY_SECTIONS: Record<string, SectionKey> = {
  'warzywa-owoce': 'warzywa',
  pieczywo: 'pieczywo-pakowane',
  nabial: 'mleko',
  'sery-lada': 'sery-lada',
  mieso: 'mieso-swieze',
  ryby: 'ryby-swieze',
  'makarony-ryze': 'makarony',
  'kasze-straczki': 'kasze',
  'kawa-herbata': 'kawa',
  slodycze: 'czekolady',
  konserwy: 'konserwy-warzywne',
  przetwory: 'dzemy',
  'sosy-oleje': 'oleje',
  'do-pieczenia': 'maki',
  'bio-wege': 'wege-zamienniki',
  karma: 'karma-psy',
  napoje: 'napoje-gazowane',
  alkohole: 'alkohole-mocne',
  mrozonki: 'mrozone-warzywa',
  chemia: 'pranie',
  czystosc: 'czyszczenie',
  higiena: 'kapiel',
  kosmetyki: 'pielegnacja-twarzy',
  dzieci: 'zywnosc-dzieci',
  dom: 'akcesoria-kuchenne',
  'ziola-prowansalskie': 'ziola-suszone',
  // 'papier' obejmował papier toaletowy, ręczniki, chusteczki i serwetki naraz.
  // Rozbity, bo w sklepie to cztery różne miejsca w regale, a „idź po papier"
  // nie mówi, po który. Stare plany lądują na papierze toaletowym — z czterech
  // to on zajmuje najwięcej miejsca i najłatwiej go poprawić w edytorze.
  papier: 'papier-toaletowy',
  // 'worki-folie' mieszało worki na śmieci z folią aluminiową i papierem do
  // pieczenia. Worki stoją przy chemii, folie przy akcesoriach kuchennych —
  // to dwa różne przystanki. Stare plany lądują na workach, bo to one zajmują
  // w regale więcej miejsca.
  'worki-folie': 'worki-smieci',
};

export function normalizeSection(raw: string): SectionKey | null {
  if (isSectionKey(raw)) return raw;
  return LEGACY_SECTIONS[raw] ?? null;
}
