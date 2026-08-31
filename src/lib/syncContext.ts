/**
 * Stan synchronizacji udostępniony ekranom.
 *
 * Siedzi w osobnym pliku, a nie przy `synchronizuj()`, bo `sync.ts` nie może
 * zależeć od Reacta — jest testowany zwyczajnym node'em, bez renderowania.
 */

import { createContext, useContext } from 'react';

export type StanSync =
  | { stan: 'bezczynna'; kiedy: string | null }
  | { stan: 'pracuje' }
  | { stan: 'blad'; powod: string };

export type SyncApi = {
  stan: StanSync;
  /** Ręczne wymuszenie — przycisk „Synchronizuj teraz". */
  zsynchronizuj: () => Promise<void>;
};

export const SyncContext = createContext<SyncApi | null>(null);

/** Zwraca `null`, gdy ekran jest poza providerem — wtedy po prostu nic nie pokazujemy. */
export function useSync(): SyncApi | null {
  return useContext(SyncContext);
}
