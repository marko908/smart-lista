/**
 * Odległości — czysta arytmetyka, bez zależności od systemu.
 *
 * Osobno od `lokalizacja.ts`, bo tamten plik sięga po `expo-location`, czyli
 * po uprawnienia i czujnik. Rachunku da się dzięki temu dotknąć testem
 * bez udawania telefonu.
 */

export type Punkt = { szerokosc: number; dlugosc: number };

export type StanLokalizacji =
  | { stan: 'nieznana' }
  | { stan: 'odmowa' }
  | { stan: 'znana'; punkt: Punkt };

/**
 * Odległość po powierzchni Ziemi, wzór haversine'a, w kilometrach.
 *
 * Dokładność rzędu metrów przy dystansach miejskich w zupełności wystarcza —
 * pytanie brzmi „czy ten sklep jest blisko", a nie „ile dokładnie kroków".
 */
export function odleglosc(a: Punkt, b: Punkt): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.szerokosc - a.szerokosc);
  const dLon = rad(b.dlugosc - a.dlugosc);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.szerokosc)) * Math.cos(rad(b.szerokosc)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Odległość po ludzku.
 *
 * Poniżej kilometra zaokrąglamy do 50 metrów, wyżej do jednego miejsca po
 * przecinku. Dokładniejsza liczba udawałaby precyzję, której namiar z telefonu
 * nie ma — a „437 m" brzmi jak pomiar, nie jak szacunek. Zero metrów też nie
 * przechodzi: stojąc w sklepie widzisz „50 m", nie „0 m".
 */
export function opisOdleglosci(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

