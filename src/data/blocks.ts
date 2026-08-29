/**
 * Typy klocków na planie sklepu.
 *
 * Wszystko jest klockiem — także wejście i kasy. Wcześniej były punktami,
 * ale skoro kasy zajmują realny kawałek sklepu i mają zmienną liczbę stanowisk,
 * muszą mieć rozmiar. Dzięki temu trasa kończy się przy ladzie kasowej,
 * a nie w abstrakcyjnym punkcie.
 *
 * Skala: jedna kratka to mniej więcej metr. Plan ma oddawać proporcje,
 * nie centymetry — margines błędu rzędu 30% niczego nie psuje, bo do policzenia
 * kolejności sekcji liczy się topologia, nie geodezja.
 */

export type BlockType =
  | 'klocek'
  | 'regal'
  | 'regal-scienny'
  | 'kosz'
  | 'lodowka'
  | 'zamrazarka'
  | 'lada'
  | 'stoisko'
  | 'sciana'
  | 'wejscie'
  | 'kasy';

export type BlockDef = {
  key: BlockType;
  name: string;
  /** Domyślny rozmiar w kratkach: [szerokość, wysokość]. */
  size: [number, number];
  /**
   * Minimalny rozmiar.
   *
   * Trzymamy go TYLKO tam, gdzie wynika z rzeczy, a nie z wyobrażenia, jak sklep
   * „powinien" wyglądać: regał dwustronny ma dwie strony, więc musi mieć dwie
   * kratki głębokości, a wejście i kasy mają ustalone wymiary. Reszta schodzi do
   * 1×1 — w sklepie stoją małe lodówki, krótkie lady i pojedyncze regaliki,
   * a zawyżone minimum tylko rozpycha plan i psuje skalę.
   */
  min: [number, number];
  /** Czy blokuje przejście. Wejście nie blokuje — to drzwi, nie mur. */
  blocking: boolean;
  /** Czy można przypisać sekcję z produktami. */
  sections: boolean;
  /** Czy sensowne są dwie różne sekcje po przeciwnych stronach. */
  twoSided: boolean;
  /** Stały element sklepu — jest zawsze i nie da się go usunąć. */
  fixed: boolean;
  /** Napis wewnątrz klocka, gdy nie ma przypisanej sekcji. */
  label: string;
  hint: string;
};

export const BLOCK_DEFS: BlockDef[] = [
  {
    key: 'klocek',
    name: 'Klocek',
    size: [1, 1],
    min: [1, 1],
    blocking: true,
    sections: true,
    twoSided: true,
    fixed: false,
    label: '',
    hint: 'Postaw i przypisz kategorię — reszta wynika sama',
  },
  {
    key: 'regal',
    name: 'Regał dwustronny',
    size: [2, 6],
    min: [2, 2],
    blocking: true,
    sections: true,
    twoSided: true,
    fixed: false,
    label: 'REGAŁ',
    hint: 'Dwie strony, więc zawsze co najmniej dwie kratki głębokości',
  },
  {
    key: 'regal-scienny',
    name: 'Regał przyścienny',
    size: [1, 6],
    min: [1, 1],
    blocking: true,
    sections: true,
    twoSided: false,
    fixed: false,
    label: 'REGAŁ',
    hint: 'Przy ścianie, dostęp z jednej strony',
  },
  {
    key: 'kosz',
    name: 'Kosz / paleta',
    size: [2, 2],
    min: [1, 1],
    blocking: true,
    sections: true,
    twoSided: false,
    fixed: false,
    label: 'KOSZ',
    hint: 'Wolnostojący, dostęp ze wszystkich stron',
  },
  {
    key: 'lodowka',
    name: 'Lodówka',
    size: [1, 5],
    min: [1, 1],
    blocking: true,
    sections: true,
    twoSided: false,
    fixed: false,
    label: 'LODÓWKA',
    hint: 'Nabiał, wędliny, napoje',
  },
  {
    key: 'zamrazarka',
    name: 'Zamrażarka',
    size: [2, 3],
    min: [1, 1],
    blocking: true,
    sections: true,
    twoSided: false,
    fixed: false,
    label: 'MROŹNIA',
    hint: 'Wyspa albo pionowa, mrożonki i lody',
  },
  {
    key: 'lada',
    name: 'Lada obsługowa',
    size: [4, 1],
    min: [1, 1],
    blocking: true,
    sections: true,
    twoSided: false,
    fixed: false,
    label: 'LADA',
    hint: 'Mięso, sery, garmażerka',
  },
  {
    key: 'stoisko',
    name: 'Stoisko',
    size: [3, 2],
    min: [1, 1],
    blocking: true,
    sections: true,
    twoSided: false,
    fixed: false,
    label: 'STOISKO',
    hint: 'Np. warzywa i owoce przy wejściu',
  },
  {
    key: 'sciana',
    name: 'Ściana / słup',
    // Stawiamy pojedynczą kratkę i rozciągamy do potrzebnej długości — tak samo
    // jak klocek. Domyślne cztery kratki trzeba było najpierw skrócić.
    size: [1, 1],
    min: [1, 1],
    blocking: true,
    sections: false,
    twoSided: false,
    fixed: false,
    label: 'ŚCIANA',
    hint: 'Przeszkoda bez produktów',
  },
  {
    key: 'wejscie',
    name: 'Wejście',
    size: [3, 1],
    // Bez minimum: bywają wejścia szerokie na bramę i wąskie na jedne drzwi,
    // a wymuszone trzy kratki zawyżały skalę małych sklepów.
    min: [1, 1],
    blocking: false,
    sections: false,
    twoSided: false,
    fixed: true,
    label: 'WEJŚCIE',
    hint: 'Start trasy. Wyjście pomijamy — liczy się droga do kasy',
  },
  {
    key: 'kasy',
    name: 'Kasy',
    size: [2, 4],
    min: [2, 3],
    blocking: true,
    sections: false,
    twoSided: false,
    fixed: true,
    label: 'KASY',
    hint: 'Koniec trasy. Rozciągnij wedle liczby stanowisk',
  },
];

export const BLOCK_BY_KEY: Record<BlockType, BlockDef> = Object.fromEntries(
  BLOCK_DEFS.map((b) => [b.key, b])
) as Record<BlockType, BlockDef>;

/**
 * Klocki, które użytkownik stawia sam.
 *
 * Świadomie krótka lista. Wybieranie z góry, czy to lodówka, lada czy regał
 * dwustronny, było wyborem na zapas — i tak wszystko sprowadza się do przypisania
 * kategorii, a z niej typ wynika sam. Zostają tu tylko te, których z kategorii
 * wyprowadzić się nie da: ściana (jako jedyna nie ma produktów) oraz wejście
 * i kasy (nie mają kategorii, a sklep miewa po kilka jednych i drugich).
 */
export const PLACEABLE = BLOCK_DEFS.filter(
  (b) => b.key === 'klocek' || b.key === 'sciana' || b.key === 'wejscie' || b.key === 'kasy'
);

/**
 * Typ klocka wyprowadzony z przypisanej kategorii.
 *
 * Nabiał to lodówka, mrożonki to zamrażarka, warzywa to stoisko, wędliny to lada.
 * Dwie kategorie na jednym klocku oznaczają regał dwustronny — bo tylko regał
 * ma dwie obsługiwane strony.
 */
const TYPE_FOR_SECTION: Record<string, BlockType> = {
  // stoiska i wyspy ze świeżym towarem
  warzywa: 'stoisko',
  owoce: 'stoisko',
  salaty: 'stoisko',
  'ziola-swieze': 'stoisko',
  kwiaty: 'stoisko',
  'aleja-srodkowa': 'kosz',
  // Wymieszane kosze z przecenami — patelnie obok walizek i wentylatorów.
  // Dostęp ze wszystkich stron, więc kosz, nie regał.
  'kosze-promocyjne': 'kosz',
  // Węgiel i podpałka stoją zwykle na palecie w alejce, nie na regale.
  'grill-akcesoria': 'kosz',

  // lady obsługowe
  piekarnia: 'lada',
  'wedliny-lada': 'lada',
  'sery-lada': 'lada',

  // wszystko, co musi stać w chłodzie
  jaja: 'lodowka',
  mleko: 'lodowka',
  'napoje-roslinne': 'lodowka',
  jogurty: 'lodowka',
  kefiry: 'lodowka',
  'serki-twarogi': 'lodowka',
  'sery-zolte': 'lodowka',
  'sery-plesniowe': 'lodowka',
  smietany: 'lodowka',
  masla: 'lodowka',
  'desery-mleczne': 'lodowka',
  'mieso-swieze': 'lodowka',
  drob: 'lodowka',
  'mieso-mielone': 'lodowka',
  wedliny: 'lodowka',
  kielbasy: 'lodowka',
  parowki: 'lodowka',
  // Osobna lodówka z asortymentem grillowym — sezonowa, ale w wielu sklepach
  // stoi cały rok i zawsze w jednym miejscu, z dala od zwykłego mięsa.
  grill: 'lodowka',
  'ryby-swieze': 'lodowka',
  'ryby-wedzone': 'lodowka',
  garmazerka: 'lodowka',
  'dania-gotowe': 'lodowka',
  sushi: 'lodowka',
  // Rotująca strefa chłodzona — te dwa metry lodówki, gdzie co tydzień stoi
  // co innego (kuchnia grecka, hiszpańska, produkty limitowane).
  'oferta-czasowa-lodowka': 'lodowka',

  // mroźnie
  'mrozone-warzywa': 'zamrazarka',
  'mrozone-owoce': 'zamrazarka',
  frytki: 'zamrazarka',
  'mrozone-dania': 'zamrazarka',
  'mrozone-ryby': 'zamrazarka',
  lody: 'zamrazarka',
};

export function typeForSections(
  sections: readonly string[],
  sectionsB: readonly string[],
  current: BlockType
): BlockType {
  // Ściany i stałe punkty rządzą się swoimi prawami.
  if (current === 'sciana' || BLOCK_BY_KEY[current]?.fixed) return current;
  // Druga strona oznacza regał dwustronny, niezależnie od tego, co na niej leży.
  if (sectionsB.length) return 'regal';
  if (!sections.length) return 'klocek';
  // Typ bierzemy z pierwszej kategorii — to ona nadaje klockowi charakter.
  return TYPE_FOR_SECTION[sections[0]] ?? 'regal-scienny';
}

/** Klocki kończące trasę. */
export const CHECKOUT_TYPES: BlockType[] = ['kasy'];

export function isCheckout(type: BlockType): boolean {
  return CHECKOUT_TYPES.includes(type);
}

/**
 * Typy z wcześniejszych wersji, mapowane przy wczytywaniu.
 *
 * Kasy zwykłe i samoobsługowe zostały scalone: dla trasy nie ma znaczenia,
 * przy której zapłacisz, a w sklepie i tak stoją w jednej linii. Kto ma je
 * osobno, stawia po prostu drugi klocek kas.
 */
export const LEGACY_TYPES: Record<string, BlockType> = {
  'kasy-samo': 'kasy',
  chlodnia: 'lodowka',
  wyspa: 'zamrazarka',
  'regal-scienny': 'regal-scienny',
};

export function normalizeType(raw: string): BlockType | null {
  if (raw in BLOCK_BY_KEY) return raw as BlockType;
  return LEGACY_TYPES[raw] ?? null;
}
