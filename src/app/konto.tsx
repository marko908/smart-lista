/**
 * Ekran konta — logowanie, rejestracja, wylogowanie.
 *
 * Konto niczego nie odblokowuje. Aplikacja działa bez niego w całości, a to
 * jest miejsce, w którym dokładasz do niej trwałość: plany przeżyją zmianę
 * telefonu, a listę zobaczysz na drugim urządzeniu. Ekran mówi to wprost,
 * żeby nikt nie zakładał, że musi się rejestrować, zanim czegokolwiek spróbuje.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, FONT, H1, Input, Label, Pill, Screen } from '../components/ui';
import { przypomnijHaslo, useKonto, wyloguj, zaloguj, zarejestruj } from '../lib/konto';
import { radius, useTheme } from '../lib/theme';
import { useSync, type StanSync } from '../lib/syncContext';
import { useApp } from '../lib/storage';

/**
 * Opis stanu po ludzku.
 *
 * „Ostatnio: 14:32" mówi człowiekowi więcej niż kręcące się kółko: widzi, że
 * jego listy są w bazie, i wie, kiedy to sprawdzono.
 */
function opisSynchronizacji(stan: StanSync | undefined): string {
  if (!stan) return 'Niedostępna w tej wersji.';
  if (stan.stan === 'pracuje') return 'Trwa wymiana z bazą…';
  if (stan.stan === 'blad') return `Nie udało się: ${stan.powod}`;
  if (!stan.kiedy) return 'Jeszcze nie synchronizowano.';
  const d = new Date(stan.kiedy);
  return `Ostatnio o ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}.`;
}

type Tryb = 'logowanie' | 'rejestracja';

export default function Konto() {
  const t = useTheme();
  const { sesja, wlaczone, email: zalogowanyJako } = useKonto();
  const sync = useSync();
  const { state: stan } = useApp();

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
    if (tryb === 'rejestracja') {
      setNota('Konto założone. Sprawdź skrzynkę — trzeba potwierdzić adres.');
    }
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

  if (!wlaczone) {
    return (
      <Screen>
        <H1>Konto</H1>
        <Card>
          <Body muted>
            Ta wersja aplikacji działa wyłącznie lokalnie. Wszystko, co zrobisz, zostaje na tym
            urządzeniu.
          </Body>
        </Card>
        <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (sesja === undefined) {
    return (
      <Screen>
        <H1>Konto</H1>
        <Body muted>Sprawdzam, czy jesteś zalogowany…</Body>
      </Screen>
    );
  }

  if (sesja) {
    return (
      <Screen>
        <View style={{ gap: 4 }}>
          <H1>Konto</H1>
          <Body muted>Zalogowany jako {zalogowanyJako}</Body>
        </View>

        <Card>
          <Label>Synchronizacja</Label>
          <Body>{opisSynchronizacji(sync?.stan)}</Body>
          <Body muted>
            {stan.lists.length === 1 ? '1 lista' : `${stan.lists.length} listy`} ·{' '}
            {stan.stores.length === 1 ? '1 sklep' : `${stan.stores.length} sklepów`}
          </Body>
          <Button
            title={sync?.stan.stan === 'pracuje' ? 'Trwa…' : 'Synchronizuj teraz'}
            variant="secondary"
            disabled={!sync || sync.stan.stan === 'pracuje'}
            onPress={() => void sync?.zsynchronizuj()}
          />
        </Card>

        <Card>
          <Body muted>
            Wylogowanie niczego nie kasuje — twoje listy zostają na tym urządzeniu i wrócą do
            konta przy następnym zalogowaniu.
          </Body>
        </Card>

        <Button title="Wyloguj" variant="ghost" onPress={wyloguj} />
        <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <H1>Konto</H1>
        <Body muted>
          Nie musisz go zakładać. Aplikacja działa bez logowania — konto sprawia tylko, że plany
          przeżyją zmianę telefonu, a listę zobaczysz na drugim urządzeniu.
        </Body>
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

      <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  komunikat: { borderWidth: 1, borderRadius: radius.md, padding: 10 },
  komunikatText: { fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 19 },
});
