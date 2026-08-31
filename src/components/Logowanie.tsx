/**
 * Formularz logowania i zakładania konta.
 *
 * Wyciągnięty z ekranu konta, bo służy teraz w dwóch miejscach: jako bramka
 * przed całą aplikacją i jako ekran konta dla kogoś, kto się wylogował.
 * Dwie kopie tego samego formularza rozjechałyby się przy pierwszej poprawce.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, FONT, H1, Input, Label, Pill } from './ui';
import { przypomnijHaslo, zaloguj, zarejestruj } from '../lib/konto';
import { radius, useTheme } from '../lib/theme';

type Tryb = 'logowanie' | 'rejestracja';

/**
 * Co pokazać po udanej próbie.
 *
 * Rejestracja KOŃCZY SIĘ WYJŚCIEM z aplikacji do skrzynki pocztowej, więc musi
 * mieć własny ekran — inaczej człowiek zostaje na formularzu i próbuje się
 * zalogować na konto, którego jeszcze nie potwierdził.
 *
 * Błędy zostają PRZY POLACH, a nie na osobnym ekranie. Złe hasło poprawia się
 * w tym samym miejscu, w którym się je wpisało; wyrzucenie człowieka na ekran
 * „nie udało się" kazałoby mu wracać i wpisywać wszystko od nowa.
 */
type Wynik = null | { rodzaj: 'zalogowano' } | { rodzaj: 'zarejestrowano'; email: string };

export function Logowanie({ naglowek, wstep }: { naglowek: string; wstep: string }) {
  const t = useTheme();
  const [wynik, setWynik] = useState<Wynik>(null);
  const [tryb, setTryb] = useState<Tryb>('logowanie');
  const [email, setEmail] = useState('');
  const [haslo, setHaslo] = useState('');
  const [blad, setBlad] = useState<string | null>(null);
  const [nota, setNota] = useState<string | null>(null);
  const [czeka, setCzeka] = useState(false);

  async function wyslij() {
    setBlad(null);
    setNota(null);
    if (!email.trim() || !haslo) {
      setBlad('Podaj adres i hasło.');
      return;
    }
    setCzeka(true);
    const wynik = tryb === 'logowanie' ? await zaloguj(email, haslo) : await zarejestruj(email, haslo);
    setCzeka(false);
    if (!wynik.ok) {
      setBlad(wynik.blad);
      return;
    }
    setHaslo('');
    setWynik(
      tryb === 'rejestracja'
        ? { rodzaj: 'zarejestrowano', email: email.trim() }
        : { rodzaj: 'zalogowano' }
    );
  }

  async function naPrzypomnienie() {
    setBlad(null);
    setNota(null);
    if (!email.trim()) {
      setBlad('Podaj adres, na który mam wysłać link.');
      return;
    }
    const wynik = await przypomnijHaslo(email);
    if (wynik.ok) setNota('Wysłane. Sprawdź skrzynkę.');
    else setBlad(wynik.blad);
  }

  if (wynik?.rodzaj === 'zarejestrowano') {
    return (
      <>
        <View style={{ gap: 4 }}>
          <H1>Sprawdź skrzynkę</H1>
          <Body muted>Wysłaliśmy link na {wynik.email}.</Body>
        </View>
        <Card>
          <Body>
            Kliknij w link z maila, żeby potwierdzić adres. Bez tego nie da się zalogować.
          </Body>
          <Body muted>
            Nie ma maila? Zajrzyj do spamu. Link jest ważny krótko — jeśli wygaśnie, załóż konto
            ponownie tym samym adresem.
          </Body>
        </Card>
        <Button
          title="Wróć do logowania"
          variant="secondary"
          onPress={() => {
            setWynik(null);
            setTryb('logowanie');
          }}
        />
      </>
    );
  }

  if (wynik?.rodzaj === 'zalogowano') {
    return (
      <>
        <View style={{ gap: 4 }}>
          <H1>Zalogowano</H1>
          <Body muted>Twoje listy i plany sklepów właśnie się pobierają.</Body>
        </View>
        <Card>
          <Body>Możesz zaczynać. W sklepie aplikacja działa też bez zasięgu.</Body>
        </Card>
      </>
    );
  }

  return (
    <>
      <View style={{ gap: 4 }}>
        <H1>{naglowek}</H1>
        <Body muted>{wstep}</Body>
      </View>

      <View style={st.wrap}>
        <Pill
          label="Mam konto"
          active={tryb === 'logowanie'}
          onPress={() => {
            setTryb('logowanie');
            setBlad(null);
          }}
        />
        <Pill
          label="Zakładam konto"
          active={tryb === 'rejestracja'}
          onPress={() => {
            setTryb('rejestracja');
            setBlad(null);
          }}
        />
      </View>

      <Card>
        <Label>Adres e-mail</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="np. jan@przyklad.pl"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Label>Hasło</Label>
        <Input
          value={haslo}
          onChangeText={setHaslo}
          placeholder={tryb === 'rejestracja' ? 'co najmniej 6 znaków' : ''}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={tryb === 'rejestracja' ? 'newPassword' : 'password'}
          onSubmitEditing={wyslij}
        />

        {blad && (
          <View style={[st.komunikat, { backgroundColor: t.colors.muted, borderColor: t.colors.destructive }]}>
            <Text style={[st.komunikatText, { color: t.colors.foreground }]}>{blad}</Text>
          </View>
        )}
        {nota && (
          <View style={[st.komunikat, { backgroundColor: t.colors.muted, borderColor: t.colors.primary }]}>
            <Text style={[st.komunikatText, { color: t.colors.foreground }]}>{nota}</Text>
          </View>
        )}

        <Button
          title={czeka ? 'Chwileczkę…' : tryb === 'logowanie' ? 'Zaloguj' : 'Załóż konto'}
          onPress={wyslij}
          disabled={czeka}
        />

        {tryb === 'logowanie' && (
          <Button title="Nie pamiętam hasła" variant="ghost" onPress={naPrzypomnienie} />
        )}
      </Card>
    </>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  komunikat: { borderWidth: 1, borderRadius: radius.md, padding: 10 },
  komunikatText: { fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 19 },
});
