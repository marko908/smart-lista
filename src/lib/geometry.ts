/**
 * Geometria klocków na siatce.
 *
 * Do wersji 1.2 klocek był prostokątem równoległym do siatki i wystarczyło
 * porównywać zakresy x i y. Obrót co 45° to psuje — obrócony regał jest rombem
 * i nie pokrywa się z kratkami. Dlatego każdy klocek sprowadzamy do ODCISKU:
 * zbioru kratek, które faktycznie zajmuje. Silnik trasy i tak pracuje na siatce,
 * więc dla niego nic się nie zmienia — dostaje tylko dokładniejszą prawdę
 * o tym, co jest przeszkodą.
 *
 * Punkt obrotu to środek pierwszej kratki klocka (lewy górny róg). Klocek
 * obraca się więc wokół swojego początku, a nie wokół środka.
 */

export type Rect = { x: number; y: number; w: number; h: number; rot?: number };

/** Dozwolone kąty — co 45 stopni. */
export const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type Angle = (typeof ANGLES)[number];

export function normalizeAngle(deg: number): Angle {
  const step = Math.round(deg / 45) * 45;
  const n = ((step % 360) + 360) % 360;
  return n as Angle;
}

export function nextAngle(deg: number, dir: 1 | -1 = 1): Angle {
  return normalizeAngle(normalizeAngle(deg) + dir * 45);
}

/** Środek pierwszej kratki — wokół niego wszystko się obraca. */
export function pivotOf(r: Rect): { px: number; py: number } {
  return { px: r.x + 0.5, py: r.y + 0.5 };
}

function rotatePoint(x: number, y: number, px: number, py: number, deg: number) {
  if (deg === 0) return { x, y };
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const dx = x - px;
  const dy = y - py;
  return { x: px + dx * c - dy * s, y: py + dx * s + dy * c };
}

/** Środek klocka po obrocie — potrzebny do rozdzielenia stron regału. */
export function centerOf(r: Rect): { cx: number; cy: number } {
  const { px, py } = pivotOf(r);
  const p = rotatePoint(r.x + r.w / 2, r.y + r.h / 2, px, py, r.rot ?? 0);
  return { cx: p.x, cy: p.y };
}

/**
 * Kierunek dłuższej osi klocka po obrocie.
 * Po tej osi dzielimy regał dwustronny na stronę A i B.
 */
export function longAxis(r: Rect): { ax: number; ay: number } {
  const along: [number, number] = r.w >= r.h ? [1, 0] : [0, 1];
  const rad = ((r.rot ?? 0) * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { ax: along[0] * c - along[1] * s, ay: along[0] * s + along[1] * c };
}

/**
 * Odcisk klocka — kratki, które zajmuje.
 *
 * Próbkujemy wnętrze prostokąta gęściej niż kratka (co 1/4), żeby przy skosie
 * nie zostawały dziury. Punkty bierzemy z wnętrza, nigdy z krawędzi, bo punkt
 * dokładnie na granicy trafiałby raz w jedną, raz w drugą kratkę.
 */
export function footprint(r: Rect, gridW: number, gridH: number): number[] {
  const { px, py } = pivotOf(r);
  const rot = normalizeAngle(r.rot ?? 0);
  const out = new Set<number>();
  const STEP = 0.25;

  for (let u = STEP / 2; u < r.w; u += STEP) {
    for (let v = STEP / 2; v < r.h; v += STEP) {
      const p = rotatePoint(r.x + u, r.y + v, px, py, rot);
      const cx = Math.floor(p.x);
      const cy = Math.floor(p.y);
      if (cx < 0 || cy < 0 || cx >= gridW || cy >= gridH) continue;
      out.add(cy * gridW + cx);
    }
  }
  return [...out];
}

/** Czy odcisk mieści się w całości na planie (nic nie zostało obcięte). */
export function footprintFits(r: Rect, gridW: number, gridH: number): boolean {
  const { px, py } = pivotOf(r);
  const rot = normalizeAngle(r.rot ?? 0);
  const corners: [number, number][] = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ];
  return corners.every(([x, y]) => {
    const p = rotatePoint(x, y, px, py, rot);
    return p.x >= -0.001 && p.y >= -0.001 && p.x <= gridW + 0.001 && p.y <= gridH + 0.001;
  });
}

/** Obrót punktu wokół innego punktu — potrzebny do ustawiania uchwytów edytora. */
export function rotateAround(
  x: number,
  y: number,
  px: number,
  py: number,
  deg: number
): { x: number; y: number } {
  if (!deg) return { x, y };
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const dx = x - px;
  const dy = y - py;
  return { x: px + dx * c - dy * s, y: py + dx * s + dy * c };
}

/** Kierunek „na zewnątrz" danej ściany klocka, po uwzględnieniu obrotu. */
export function sideNormal(side: 'N' | 'S' | 'W' | 'E', deg: number): { nx: number; ny: number } {
  const base: Record<typeof side, [number, number]> = {
    N: [0, -1],
    S: [0, 1],
    W: [-1, 0],
    E: [1, 0],
  };
  const [bx, by] = base[side];
  const rad = ((deg ?? 0) * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { nx: bx * c - by * s, ny: bx * s + by * c };
}
