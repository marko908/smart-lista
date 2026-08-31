/**
 * Ekran po kliknięciu w link z maila.
 *
 * Bez niego potwierdzenie konta było niewidzialne: człowiek klikał w link,
 * lądował na liście zakupów i nie dostawał żadnego potwierdzenia, że jego
 * konto w ogóle zadziałało. Przy rejestracji, która wymaga wyjścia do skrzynki,
 * to jest moment, w którym najłatwiej stracić człowieka — bo nie wie, czy
 * coś się udało.
 *
 * Drugi powód jest ważniejszy: link bywa WYGASŁY. Wtedy bez tego ekranu
 * człowiek wracał na formularz logowania bez słowa wyjaśnienia i próbował
 * się zalogować na konto, którego nie potwierdził.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, FONT, H1, Screen } from './ui';
import type { Powrot } from '../lib/supabase';
import { radius, useTheme } from '../lib/theme';

type Props = {
  powrot: Powrot;
  /** Czy udało się faktycznie założyć sesję — link mógł być poprawny, ale spóźniony. */
  zalogowany: boolean;
  onDalej: () => void;
};

export function PoAktywacji({ powrot, zalogowany, onDalej }: Props) {
  const t = useTheme();

  if (powrot.rodzaj === 'blad' || !zalogowany) {
    const opis = powrot.rodzaj === 'blad' ? powrot.opis : 'Link nie założył sesji.';
    return (
      <Screen>
        <View style={{ gap: 4 }}>
          <H1>Link nie zadziałał</H1>
          <Body muted>{opis}</Body>
        </View>
        <Card>
          <Body>
            Spróbuj zalogować się normalnie. Jeśli konto nie jest jeszcze potwierdzone, załóż je
            ponownie tym samym adresem — dostaniesz świeży link.
          </Body>
        </Card>
        <Button title="Przejdź do logowania" onPress={onDalej} />
      </Screen>
    );
  }

  const odzyskiwanie = powrot.rodzaj === 'odzyskiwanie';
  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <H1>{odzyskiwanie ? 'Jesteś zalogowany' : 'Konto potwierdzone'}</H1>
        <Body muted>
          {odzyskiwanie
            ? 'Link z maila wpuścił cię na konto.'
            : 'Adres e-mail działa, konto jest aktywne.'}
        </Body>
      </View>

      <Card>
        <View style={[st.znacznik, { backgroundColor: t.colors.primary }]}>
          <Text style={[st.ptaszek, { color: t.colors.primaryForeground }]}>✓</Text>
        </View>
        <Body>
          Od teraz twoje listy i plany sklepów zapisują się na koncie — zobaczysz je też na drugim
          urządzeniu.
        </Body>
        <Body muted>
          Aplikacja działa bez zasięgu. W sklepie nie musisz mieć internetu, żeby dokończyć zakupy.
        </Body>
      </Card>

      <Button title="Zaczynamy" onPress={onDalej} />
    </Screen>
  );
}

const st = StyleSheet.create({
  znacznik: {
    width: 40, height: 40, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  ptaszek: { fontFamily: FONT.sans, fontSize: 22, fontWeight: '700', lineHeight: 26 },
});
