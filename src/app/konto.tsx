/**
 * Ekran konta — stan synchronizacji i wylogowanie.
 *
 * Od czasu wprowadzenia bramki logowania niezalogowany człowiek tu nie dotrze:
 * formularz stoi przed całą aplikacją. Gałąź z formularzem zostaje na wypadek
 * wylogowania się z tego ekranu — wtedy bramka przejmuje przy następnym
 * przerysowaniu, ale między jednym a drugim trzeba coś pokazać.
 */

import { router } from 'expo-router';
import { View } from 'react-native';
import { Body, Button, Card, H1, Label, Screen } from '../components/ui';
import { Logowanie } from '../components/Logowanie';
import { useKonto, wyloguj } from '../lib/konto';

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

export default function Konto() {
  const { sesja, wlaczone, email: zalogowanyJako } = useKonto();
  const sync = useSync();
  const { state: stan } = useApp();


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
      <Logowanie
        naglowek="Konto"
        wstep="Zaloguj się, żeby twoje listy i plany sklepów wróciły na to urządzenie."
      />
      <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
