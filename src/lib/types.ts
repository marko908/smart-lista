import type { ChainKey } from '../data/chains';
import type { SectionKey } from '../data/sections';
import type { StoreMap } from './mapModel';

/**
 * Pola, które ma każdy dokument podlegający synchronizacji.
 *
 * `zmieniono` rozstrzyga konflikty: przy dwóch wersjach tego samego dokumentu
 * wygrywa nowsza. Stempluje je jedno miejsce — `update` w `_layout.tsx` —
 * więc żadne miejsce wywołania nie musi o tym pamiętać.
 *
 * `zdalneId` to identyfikator w bazie. Dopóki jest `null`, dokument istnieje
 * tylko na tym urządzeniu. Dzięki temu nie trzeba było dokładać kolumny na
 * lokalny identyfikator po stronie bazy.
 */
export type Synchronizowany = {
  /**
   * Nieobecne dopóki dokument nie przeszedł przez `ostempluj` — czyli tylko
   * w momencie tworzenia. Nie wymagamy go przy tworzeniu celowo: gdyby był
   * obowiązkowy, dwadzieścia miejsc musiałoby o nim pamiętać, a stempel
   * i tak stawia jedno miejsce przy każdej zmianie stanu.
   */
  zmieniono?: string;
  zdalneId?: string | null;
};

/** Sklep dodany przez użytkownika. */
export type Store = Synchronizowany & {
  id: string;
  name: string;
  chain: ChainKey;
  /**
   * Adres. Człowiek ma zwykle kilka Biedronek w zasięgu i bez ulicy nie
   * odróżni ich na liście — a plan sklepu jest przypisany do konkretnego
   * budynku, nie do sieci.
   *
   * Opcjonalne, bo zapisy sprzed tej zmiany ich nie mają.
   */
  street?: string;
  city?: string;
  /**
   * Ukryty przed użytkownikami. W bazie odpowiada mu odwrotność `publiczny`.
   *
   * Sklep w budowie — z niedokończonym planem — nie może trafić na listę
   * wyboru, bo policzy bezsensowną trasę. Ukrycie jest odwracalne;
   * skasowanie nie.
   */
  ukryty?: boolean;
  /** Plan 2D — pełna topologia. Ma pierwszeństwo przed marszrutą. */
  map: StoreMap | null;
  /** Marszruta — kolejność sekcji od wejścia do kas. Zapasowa, gdy nie ma planu. */
  walkOrder: SectionKey[];
  mappedAt: string | null;
  createdAt: string;
};

export type ListItem = {
  id: string;
  /** Co użytkownik faktycznie wpisał — to pokazujemy na liście. */
  text: string;
  /**
   * Ilość i miara osobno, bo człowiek poprawia je niezależnie — może skasować
   * samą miarę, zostawiając liczbę. Puste znaczy „nie pokazuj".
   */
  ilosc?: string;
  miara?: string;
  /** Sekcja po dopasowaniu; użytkownik może ją nadpisać. */
  section: SectionKey;
  /** true, gdy sekcję ustawił człowiek — wtedy nie nadpisujemy jej automatem. */
  sectionLocked: boolean;
  /**
   * Sekcje, między którymi ta fraza się waha — gdy jedno słowo prowadzi do
   * kilku regałów („płyn", „papier", „sos"). `section` trzyma wtedy najlepszy
   * strzał, a to są pozostałe możliwości do pokazania przy dotknięciu.
   *
   * Pusto albo brak = nie ma wątpliwości. Znika po wyborze człowieka.
   */
  ambiguous?: SectionKey[];
  matchedProductId: string | null;
  checked: boolean;
  createdAt: string;
};

export type ShoppingList = Synchronizowany & {
  id: string;
  name: string;
  storeId: string | null;
  items: ListItem[];
  createdAt: string;
};

/**
 * Ślad po skasowanym dokumencie.
 *
 * Bez tego kasowanie nie dotarłoby na drugie urządzenie: synchronizacja
 * dociąga z bazy wszystko, czego nie ma lokalnie, więc skasowana lista
 * wróciłaby przy najbliższym pobraniu jak bumerang. Ślad mówi „to zniknęło
 * celowo" i jest kasowany, gdy baza potwierdzi usunięcie.
 */
export type Nagrobek = {
  zdalneId: string;
  tabela: 'listy' | 'sklepy';
};

export type AppState = {
  stores: Store[];
  lists: ShoppingList[];
  /**
   * Zapamiętane rozstrzygnięcia fraz wieloznacznych: `sklep|słowo` → sekcja.
   *
   * Pytamy raz. Jeśli dla tego człowieka „płyn" znaczy płyn do naczyń, to
   * znaczy tak za każdym razem — a lista fraz, o które w ogóle trzeba pytać,
   * jest krótka i wyczerpuje się po kilku zakupach.
   */
  wybory: Record<string, SectionKey>;
  /** Skasowane dokumenty czekające na potwierdzenie usunięcia w bazie. */
  nagrobki: Nagrobek[];
  /**
   * Ostatnio wybrany sklep. Nowa lista zaczyna od niego, bo ludzie robią
   * zakupy w kółko w tym samym miejscu i wybieranie go za każdym razem
   * od nowa byłoby podatkiem od przyzwyczajenia.
   */
  ostatniSklep?: string | null;
  /** Ulubiony sklep z profilu. Ma pierwszeństwo przed ostatnio używanym. */
  ulubionySklep?: string | null;
};

export const EMPTY_STATE: AppState = { stores: [], lists: [], wybory: {}, nagrobki: [] };
