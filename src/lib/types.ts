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
};

export const EMPTY_STATE: AppState = { stores: [], lists: [] };
