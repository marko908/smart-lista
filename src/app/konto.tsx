/**
 * Ekran konta — stan synchronizacji i wylogowanie.
 *
 * Od czasu wprowadzenia bramki logowania niezalogowany człowiek tu nie dotrze:
 * formularz stoi przed całą aplikacją. Gałąź z formularzem zostaje na wypadek
 * wylogowania się z tego ekranu — wtedy bramka przejmuje przy następnym
 * przerysowaniu, ale między jednym a drugim trzeba coś pokazać.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, H1, Label, Screen } from '../components/ui';
import { Logowanie } from '../components/Logowanie';
import { useKonto, wyloguj } from '../lib/konto';
import { czyAdmin } from '../lib/admin';

import { useApp } from '../lib/storage';
import { WyborSklepu } from '../components/WyborSklepu';

export default function Konto() {
  const { sesja, wlaczone, email: zalogowanyJako } = useKonto();
  const { state: stan, update } = useApp();
  const [ulubionyOtwarty, setUlubionyOtwarty] = useState(false);
  const ulubiony = stan.stores.find((x) => x.id === stan.ulubionySklep) ?? null;


  if (!wlaczone) {
    return (
      <Screen>
        <H1>Profil</H1>
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
        <H1>Profil</H1>
        <Body muted>Sprawdzam, czy jesteś zalogowany…</Body>
      </Screen>
    );
  }

  if (sesja) {
    return (
      <Screen>
        <View style={{ gap: 4 }}>
          <H1>Profil</H1>
          <Body muted>Zalogowany jako {zalogowanyJako}</Body>
        </View>

        {/* Ulubiony sklep: większość ludzi robi zakupy w kółko w tym samym
            miejscu, więc wybieranie go przy każdej liście jest podatkiem od
            przyzwyczajenia. Nowa lista startuje właśnie od niego. */}
        <Card>
          <Label>Ulubiony sklep</Label>
          <Body muted>Każda nowa lista zacznie od niego.</Body>
          {ulubionyOtwarty ? (
            <WyborSklepu
              sklepy={stan.stores}
              wybrany={stan.ulubionySklep ?? null}
              onWybierz={(id) => {
                update((prev) => ({ ...prev, ulubionySklep: id }));
                setUlubionyOtwarty(false);
              }}
              onZamknij={() => setUlubionyOtwarty(false)}
            />
          ) : (
            <Button
              title={ulubiony ? ulubiony.name : 'Nie wybrano'}
              variant="secondary"
              onPress={() => setUlubionyOtwarty(true)}
            />
          )}
        </Card>

        {czyAdmin(sesja) && (
          <Button title="Katalog sklepów" variant="secondary" onPress={() => router.push('/admin')} />
        )}

        <Button title="Wyloguj" variant="ghost" onPress={wyloguj} />
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
