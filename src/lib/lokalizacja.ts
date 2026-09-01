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

export { odleglosc, opisOdleglosci, type Punkt } from './odleglosc';
import type { Punkt } from './odleglosc';

export type StanLokalizacji =
  | { stan: 'nieznana' }
  | { stan: 'odmowa' }
  | { stan: 'znana'; punkt: Punkt };

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
