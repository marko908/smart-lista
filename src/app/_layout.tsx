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
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loading } from '../components/ui';
import { useTheme } from '../lib/theme';
import { AppStateContext, loadState, saveState } from '../lib/storage';
import { EMPTY_STATE, type AppState } from '../lib/types';

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

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    dirty.current = true;
    setState(fn);
  }, []);

  if (!ready || !fontsLoaded) return <Loading />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AppStateContext.Provider value={{ state, ready, update }}>
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
      </Stack>
    </AppStateContext.Provider>
    </GestureHandlerRootView>
  );
}
