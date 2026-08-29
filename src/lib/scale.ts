/**
 * Dobieranie skali planu z pomiaru budynku.
 *
 * Google Maps ma linijkę, którą da się obrysować budynek i odczytać powierzchnię.
 * Problem w tym, że mierzy się CAŁY budynek: razem z magazynem, chłodniami,
 * zapleczem socjalnym i pomieszczeniami technicznymi. Sala sprzedaży, czyli to,
 * co się mapuje, jest wyraźnie mniejsza.
 *
 * Nie chodzi o dokładność co do metra — chodzi o to, żeby proporcje się zgadzały.
 * Trasa i tak liczy kolejność sekcji, a nie dystans w centymetrach.
 */

/** Ile procent budynku dyskontu zajmuje zaplecze. Punkt wyjścia, nie dogmat. */
export const DEFAULT_BACK_OF_HOUSE_PCT = 30;

export type ScaleSuggestion = {
  gridW: number;
  gridH: number;
  /** Szacowana sala sprzedaży w m². */
  salesAreaM2: number;
  /** Powierzchnia oddana zapleczu. */
  backAreaM2: number;
};

/**
 * Proponuje siatkę na podstawie obrysu z map.
 *
 * Zaplecze traktujemy jako pas wzdłuż tylnej ściany, więc skracamy krótszy bok,
 * a dłuższy zostawiamy. W dyskontach magazyn zwykle właśnie tak leży —
 * za salą sprzedaży, przy rampie dla ciężarówek.
 */
export function suggestGrid(
  totalAreaM2: number,
  longSideM: number,
  backOfHousePct = DEFAULT_BACK_OF_HOUSE_PCT
): ScaleSuggestion | null {
  if (!Number.isFinite(totalAreaM2) || !Number.isFinite(longSideM)) return null;
  if (totalAreaM2 <= 0 || longSideM <= 0) return null;

  const pct = Math.min(70, Math.max(0, backOfHousePct));
  const shortSide = totalAreaM2 / longSideM;
  const salesShort = shortSide * (1 - pct / 100);

  const gridW = Math.max(6, Math.round(longSideM));
  const gridH = Math.max(6, Math.round(salesShort));

  return {
    gridW,
    gridH,
    salesAreaM2: Math.round(gridW * gridH),
    backAreaM2: Math.round(totalAreaM2 - gridW * gridH),
  };
}

/** Gdy znamy tylko powierzchnię — zakładamy proporcje typowego dyskontu 3:2. */
export function suggestGridFromArea(
  totalAreaM2: number,
  backOfHousePct = DEFAULT_BACK_OF_HOUSE_PCT
): ScaleSuggestion | null {
  if (!Number.isFinite(totalAreaM2) || totalAreaM2 <= 0) return null;
  const longSide = Math.sqrt((totalAreaM2 * 3) / 2);
  return suggestGrid(totalAreaM2, longSide, backOfHousePct);
}
