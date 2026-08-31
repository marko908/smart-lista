import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loading } from '../components/ui';
import { useTheme } from '../lib/theme';
import { AppStateContext, loadState, ostempluj, saveState } from '../lib/storage';
import { EMPTY_STATE, type AppState } from '../lib/types';
import { synchronizuj } from '../lib/sync';
import { useKonto } from '../lib/konto';
import { SyncContext, type StanSync } from '../lib/syncContext';
import { Logowanie } from '../components/Logowanie';
import { Screen } from '../components/ui';
import { PoAktywacji } from '../components/PoAktywacji';
import { Nawigacja } from '../components/Nawigacja';
import { Onboarding } from '../components/Onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { powrotZLinku } from '../lib/supabase';

export default function RootLayout() {
  const t = useTheme();
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    loadState().then((loaded) => {
      setState(loaded);
      setReady(true);
    });
  }, []);

  // Zapis po każdej zmianie. Przy tej wielkości danych nie ma sensu
  // debouncować — AsyncStorage i tak jest asynchroniczny.
  useEffect(() => {
    if (!ready || !dirty.current) return;
    saveState(state);
  }, [state, ready]);

  /**
   * Każda zmiana stanu przechodzi tędy, więc tutaj stawiamy stempel czasu
   * i zostawiamy ślad po skasowanych dokumentach. Dzięki temu ani jedno
   * miejsce wywołania nie musi pamiętać o synchronizacji.
   */
  const update = useCallback((fn: (prev: AppState) => AppState) => {
    dirty.current = true;
    setState((prev) => ostempluj(prev, fn(prev)));
  }, []);

  const konto = useKonto();
  /** Ekran powitalny po kliknięciu w link z maila znika po potwierdzeniu. */
  const [powitanieZamkniete, setPowitanieZamkniete] = useState(false);

  /**
   * Wprowadzenie pokazujemy raz na urządzenie. `undefined` znaczy „jeszcze nie
   * odczytane" — bez tego stanu przy każdym starcie mignęłoby na ułamek sekundy
   * osobom, które już je przeszły.
   */
  const [wprowadzenie, setWprowadzenie] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem('alejka:wprowadzenie')
      .then((v) => setWprowadzenie(v !== 'zrobione'))
      .catch(() => setWprowadzenie(false));
  }, []);
  const zamknijWprowadzenie = useCallback(() => {
    setWprowadzenie(false);
    void AsyncStorage.setItem('alejka:wprowadzenie', 'zrobione').catch(() => {});
  }, []);
  const [stanSync, setStanSync] = useState<StanSync>({ stan: 'bezczynna', kiedy: null });
  /** Świeży stan dla synchronizacji, która startuje z opóźnieniem. */
  const biezacy = useRef(state);
  biezacy.current = state;
  const trwa = useRef(false);

  const zsynchronizuj = useCallback(async (pobieraj = true) => {
    if (trwa.current) return;
    trwa.current = true;
    setStanSync({ stan: 'pracuje' });
    try {
      const wynik = await synchronizuj(biezacy.current, { pobieraj });
      if (wynik) {
        dirty.current = true;
        setState(wynik);
        setStanSync({ stan: 'bezczynna', kiedy: new Date().toISOString() });
      } else {
        setStanSync({ stan: 'bezczynna', kiedy: null });
      }
    } catch (e) {
      // Brak sieci nie jest awarią — aplikacja ma działać dalej lokalnie.
      setStanSync({ stan: 'blad', powod: e instanceof Error ? e.message : 'nieznany błąd' });
    } finally {
      trwa.current = false;
    }
  }, []);

  // Zalogowanie i wylogowanie to moment, w którym trzeba się zejść z bazą.
  const czyjaSesja = konto.sesja?.user?.id ?? null;
  useEffect(() => {
    if (!ready || !czyjaSesja) return;
    void zsynchronizuj();
  }, [ready, czyjaSesja, zsynchronizuj]);

  /**
   * Odsyłanie zmian z opóźnieniem.
   *
   * Pisanie listy to seria drobnych zmian — bez opóźnienia każda litera
   * byłaby osobnym zapytaniem do bazy.
   */
  useEffect(() => {
    if (!ready || !czyjaSesja || !dirty.current) return;
    // Piętnaście sekund, nie dwie i pół: człowiek odhacza zakupy w tempie
    // kilku pozycji na minutę, więc dłuższe okno skleja je w jeden zapis
    // zamiast robić osobny za każdym razem. Bez pobierania — nasze własne
    // zmiany nie wymagają dociągania niczego z bazy.
    const h = setTimeout(() => void zsynchronizuj(false), 15000);
    return () => clearTimeout(h);
  }, [state, ready, czyjaSesja, zsynchronizuj]);

  if (!ready || !fontsLoaded) return <Loading />;

  /**
   * Powrót z maila pokazujemy PRZED bramką.
   *
   * Wygasły link nie zakłada sesji, więc bramka wyrzuciłaby człowieka na
   * formularz logowania bez słowa wyjaśnienia — a on próbowałby się logować
   * na konto, którego nie potwierdził. Ekran musi więc stać wyżej niż bramka,
   * także wtedy (a właściwie zwłaszcza wtedy), gdy logowanie się nie udało.
   */
  if (powrotZLinku && !powitanieZamkniete) {
    // Sesja z kotwicy adresu zakłada się asynchronicznie. Bez tego czekania
    // każdy, komu link ZADZIAŁAŁ, zobaczyłby najpierw „Link nie zadziałał",
    // bo w pierwszym przerysowaniu sesji jeszcze nie ma.
    if (konto.wlaczone && konto.sesja === undefined) return <Loading />;
    return (
      <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={t.isDark ? 'light' : 'dark'} />
        <PoAktywacji
          powrot={powrotZLinku}
          zalogowany={Boolean(konto.sesja)}
          onDalej={() => setPowitanieZamkniete(true)}
        />
      </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  /**
   * Bramka: bez konta nie ma aplikacji.
   *
   * Pytamy o `kiedykolwiek`, a NIE o ważną sesję — i to jest tu najważniejsze
   * rozstrzygnięcie. W sklepie nie ma zasięgu, więc gdyby wejście zależało od
   * odświeżenia tokenu przez sieć, człowiek z wygasłą sesją zostałby odcięty
   * od własnej listy dokładnie w chwili, gdy stoi przed półką. Raz zalogowany
   * wchodzi zawsze, aż do świadomego wylogowania.
   *
   * Gdy konta są wyłączone (brak konfiguracji Supabase), bramki NIE MA.
   * Inaczej pomyłka we wdrożeniu zamieniłaby aplikację w martwy ekran
   * logowania, którego nie da się przejść.
   */
  if (konto.wlaczone) {
    if (konto.kiedykolwiek === undefined || konto.sesja === undefined) return <Loading />;
    if (!konto.sesja && !konto.kiedykolwiek) {
      return (
        <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style={t.isDark ? 'light' : 'dark'} />
          <Screen>
            <Logowanie
              naglowek="Alejka"
              wstep="Lista zakupów, która układa się w kolejności przejścia przez sklep. Zaloguj się, żeby zacząć — listy i plany sklepów zostaną przypisane do twojego konta."
            />
          </Screen>
        </GestureHandlerRootView>
        </SafeAreaProvider>
      );
    }
  }

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AppStateContext.Provider value={{ state, ready, update }}>
    <SyncContext.Provider value={{ stan: stanSync, zsynchronizuj }}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.foreground,
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Alejka' }} />
        <Stack.Screen name="lista/[id]" options={{ title: 'Lista' }} />
        <Stack.Screen name="sklepy/index" options={{ title: 'Moje sklepy' }} />
        <Stack.Screen name="sklepy/[id]" options={{ title: 'Marszruta' }} />
        <Stack.Screen name="sklepy/plan/[id]" options={{ title: 'Plan sklepu' }} />
        <Stack.Screen name="admin" options={{ title: 'Katalog sklepów' }} />
      </Stack>
      <Nawigacja />
      {wprowadzenie === true && <Onboarding onKoniec={zamknijWprowadzenie} />}
    </SyncContext.Provider>
    </AppStateContext.Provider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
