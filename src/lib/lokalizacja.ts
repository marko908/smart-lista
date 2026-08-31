/**
 * Gdzie jest człowiek i który sklep ma blisko.
 *
 * Lokalizacja jest DOBROWOLNA i aplikacja bez niej działa w całości — po prostu
 * pokazuje cały katalog zamiast pobliskich sklepów. Pytamy o nią dopiero wtedy,
 * gdy człowiek sam sięga po sortowanie po odległości, a nie przy pierwszym
 * uruchomieniu: prośba o dostęp wyskakująca zanim wiadomo, po co, jest zwykle
 * odrzucana, a odmowy nie da się cofnąć bez wejścia w ustawienia systemu.
 *
 * Współrzędnych NIGDZIE nie wysyłamy. Zostają na urządzeniu, żeby posortować
 * listę, którą i tak mamy pobraną.
 */

import * as Location from 'expo-location';

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

/** „420 m", „2,4 km", „18 km" — im dalej, tym mniej cyfr ma sens. */
export function opisOdleglosci(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Pyta o zgodę i zwraca położenie.
 *
 * Zwraca `odmowa` zamiast rzucać wyjątkiem, bo brak zgody to normalna
 * odpowiedź człowieka, a nie awaria — i wywołujący ma ją obsłużyć tak samo
 * spokojnie jak zgodę.
 */
export async function ustalPolozenie(): Promise<StanLokalizacji> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { stan: 'odmowa' };
    // Niska dokładność wystarcza do „który sklep bliżej", a jest znacznie
    // szybsza i tańsza dla baterii niż namiar z GPS-a.
    const poz = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    return {
      stan: 'znana',
      punkt: { szerokosc: poz.coords.latitude, dlugosc: poz.coords.longitude },
    };
  } catch {
    // Wyłączona lokalizacja w systemie, brak czujnika, przerwane pytanie —
    // wszystko to znaczy dla nas to samo: nie wiemy, gdzie jesteśmy.
    return { stan: 'odmowa' };
  }
}
