import type { ChainKey } from '../data/chains';
import type { SectionKey } from '../data/sections';
import type { StoreMap } from './mapModel';

/** Sklep dodany przez użytkownika. */
export type Store = {
  id: string;
  name: string;
  chain: ChainKey;
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
  qty?: string;
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

export type ShoppingList = {
  id: string;
  name: string;
  storeId: string | null;
  items: ListItem[];
  createdAt: string;
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
};

export const EMPTY_STATE: AppState = { stores: [], lists: [], wybory: {} };
