/**
 * Potwierdzenie decyzji, które działa też w przeglądarce.
 *
 * `Alert.alert` z React Native jest na webie PUSTĄ FUNKCJĄ — dosłownie
 * `static alert() {}`. Nie wyrzuca błędu, nie loguje ostrzeżenia, po prostu
 * nic nie robi. Skutek: każde „usuń", „wyczyść" i „zacznij od nowa" wyglądało
 * na martwy przycisk, bo dialog nigdy się nie pokazywał, a akcja czekała na
 * odpowiedź, która nie mogła nadejść.
 *
 * Na telefonie zostaje natywny dialog, w przeglądarce wchodzi `window.confirm`.
 */

import { Alert, Platform } from 'react-native';

export function potwierdz(tytul: string, tresc: string, etykieta = 'Usuń'): Promise<boolean> {
  if (Platform.OS === 'web') {
    const zgoda =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(`${tytul}\n\n${tresc}`)
        : true;
    return Promise.resolve(zgoda);
  }

  return new Promise((rozstrzygnij) => {
    Alert.alert(tytul, tresc, [
      { text: 'Anuluj', style: 'cancel', onPress: () => rozstrzygnij(false) },
      { text: etykieta, style: 'destructive', onPress: () => rozstrzygnij(true) },
    ]);
  });
}

/**
 * Wybór jednej z dwóch dróg albo rezygnacja.
 *
 * W przeglądarce nie ma dialogu z trzema przyciskami, więc pytamy dwa razy:
 * najpierw o pierwszą drogę, potem o drugą. Brzmi topornie, ale jest uczciwe —
 * człowiek widzi obie możliwości i żadna nie chowa się pod „Anuluj".
 */
export function wybierz(
  tytul: string,
  tresc: string,
  pierwsza: string,
  druga: string
): Promise<'pierwsza' | 'druga' | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(null);
    }
    if (window.confirm(`${tytul}\n\n${tresc}\n\nOK — ${pierwsza}`)) {
      return Promise.resolve('pierwsza');
    }
    return Promise.resolve(window.confirm(`${tresc}\n\nOK — ${druga}`) ? 'druga' : null);
  }

  return new Promise((rozstrzygnij) => {
    Alert.alert(tytul, tresc, [
      { text: 'Anuluj', style: 'cancel', onPress: () => rozstrzygnij(null) },
      { text: pierwsza, onPress: () => rozstrzygnij('pierwsza') },
      { text: druga, style: 'destructive', onPress: () => rozstrzygnij('druga') },
    ]);
  });
}
