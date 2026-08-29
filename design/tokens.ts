/**
 * Alejka — tokeny motywu dla React Native / Expo.
 *
 * Wartości są przepisane 1:1 z design/theme.css, który jest źródłem prawdy.
 * Kiedy zmieniasz kolor, zmieniasz go NAJPIERW w theme.css, potem tutaj.
 *
 * React Native nie czyta zmiennych CSS, więc ten plik jest jedyną drogą,
 * żeby ten sam motyw działał w aplikacji mobilnej i w panelu na webie.
 * (Jeśli wejdzie NativeWind v4, theme.css da się podłączyć bezpośrednio
 *  i ten plik zostaje tylko dla kodu, który nie używa klas.)
 */

export type ThemeColors = {
  background: string; foreground: string;
  card: string; cardForeground: string;
  popover: string; popoverForeground: string;
  primary: string; primaryForeground: string;
  secondary: string; secondaryForeground: string;
  muted: string; mutedForeground: string;
  accent: string; accentForeground: string;
  destructive: string; destructiveForeground: string;
  border: string; input: string; ring: string;
  chart1: string; chart2: string; chart3: string; chart4: string; chart5: string;
  sidebar: string; sidebarForeground: string;
  sidebarPrimary: string; sidebarPrimaryForeground: string;
  sidebarAccent: string; sidebarAccentForeground: string;
  sidebarBorder: string; sidebarRing: string;
};

export type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowRadius: number;
  shadowOpacity: number;
  elevation: number;
};

export const light: ThemeColors = {
  background: '#f8f7f2',
  foreground: '#1a1a1a',
  card: '#ffffff',
  cardForeground: '#1a1a1a',
  popover: '#ffffff',
  popoverForeground: '#1a1a1a',
  primary: '#c1a875',
  primaryForeground: '#ffffff',
  secondary: '#e5e1d5',
  secondaryForeground: '#1a1a1a',
  muted: '#f1ede1',
  mutedForeground: '#6b6352',
  accent: '#c1a875',
  accentForeground: '#ffffff',
  destructive: '#d32f2f',
  destructiveForeground: '#ffffff',
  border: '#e2decb',
  input: '#e2decb',
  ring: '#c1a875',
  chart1: '#c1a875',
  chart2: '#3d4147',
  chart3: '#e5e1d5',
  chart4: '#8a7d5e',
  chart5: '#2a2d31',
  sidebar: '#f1ede1',
  sidebarForeground: '#1a1a1a',
  sidebarPrimary: '#c1a875',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#e2decb',
  sidebarAccentForeground: '#1a1a1a',
  sidebarBorder: '#e2decb',
  sidebarRing: '#c1a875',
};

export const dark: ThemeColors = {
  background: '#141412',
  foreground: '#f8f7f2',
  card: '#1e1e1c',
  cardForeground: '#f8f7f2',
  popover: '#1e1e1c',
  popoverForeground: '#f8f7f2',
  primary: '#d4bc8b',
  primaryForeground: '#141412',
  secondary: '#2d2b28',
  secondaryForeground: '#f8f7f2',
  muted: '#242422',
  mutedForeground: '#a39e94',
  accent: '#d4bc8b',
  accentForeground: '#141412',
  destructive: '#ef4444',
  destructiveForeground: '#f8f7f2',
  border: '#2d2b28',
  input: '#2d2b28',
  ring: '#d4bc8b',
  chart1: '#d4bc8b',
  chart2: '#6d7278',
  chart3: '#33312e',
  chart4: '#a89b7c',
  chart5: '#1a1a18',
  sidebar: '#141412',
  sidebarForeground: '#f8f7f2',
  sidebarPrimary: '#d4bc8b',
  sidebarPrimaryForeground: '#141412',
  sidebarAccent: '#2d2b28',
  sidebarAccentForeground: '#f8f7f2',
  sidebarBorder: '#2d2b28',
  sidebarRing: '#d4bc8b',
};

/** Skala odstępów — --spacing: 0.25rem, czyli 4 px na krok. */
export const SPACING_UNIT = 4;
export const space = (steps: number) => steps * SPACING_UNIT;

/** --radius: 0.75rem = 12 px. Reszta wyprowadzona jak w shadcn. */
export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  sans: 'Inter',
  mono: 'JetBrains Mono',
  serif: 'Georgia',
  /** --letter-spacing: -0.02em; w RN podajemy w px względem rozmiaru fontu. */
  tracking: (fontSize: number) => fontSize * -0.02,
} as const;

/** shadow-offset-y 8 px / blur 15 px / opacity 0.05 (light). */
export const shadow: { light: ShadowStyle; dark: ShadowStyle } = {
  light: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    shadowOpacity: 0.05,
    elevation: 4,
  },
  dark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    shadowOpacity: 0.4,
    elevation: 8,
  },
};

/**
 * Znaczenia specyficzne dla Alejki — WYPROWADZONE z tokenów bazowych,
 * żeby nie mnożyć palety. Jeśli któreś ma dostać własny kolor,
 * to jest decyzja do podjęcia świadomie, nie po cichu tutaj.
 */
export const semantic = (t: ThemeColors) => ({
  /** Linia trasy na mapce sklepu i aktywna sekcja. */
  route: t.primary,
  /** Klocki regałów na planie. */
  block: t.secondary,
  blockBorder: t.border,
  /** Elementy topologii: wejście, kasy, wyjście. */
  node: t.chart2,
  /** Produkt odhaczony. */
  done: t.mutedForeground,
  /** Mapa nieaktualna, błąd walidacji. */
  stale: t.destructive,
});

/**
 * Kolory kategorii regałów.
 *
 * Dodane świadomie, na prośbę Marka: na planie sklepu trzeba na pierwszy rzut oka
 * odróżnić lodówkę od regału ze słodyczami. Odcienie są przygaszone, żeby usiadły
 * na piaskowym tle i nie zrobiły z planu tęczy.
 */
export type CategoryKey =
  | 'swieze' | 'pieczywo' | 'nabial' | 'mieso' | 'mrozone'
  | 'napoje' | 'suche' | 'chemia' | 'infra' | 'pusty';

export const categoryColors: Record<'light' | 'dark', Record<CategoryKey, string>> = {
  light: {
    swieze: '#7d9b6a',
    pieczywo: '#b8863b',
    nabial: '#6f96b8',
    mieso: '#b5654f',
    mrozone: '#7fb0bf',
    napoje: '#5f9a91',
    suche: '#c1a875',
    chemia: '#8a86a3',
    infra: '#3d4147',
    pusty: '#e5e1d5',
  },
  dark: {
    swieze: '#9dbb8a',
    pieczywo: '#d4a45c',
    nabial: '#8fb4d4',
    mieso: '#d1836c',
    mrozone: '#9ccbd8',
    napoje: '#7fb8ae',
    suche: '#d4bc8b',
    chemia: '#a8a4c0',
    infra: '#6d7278',
    pusty: '#2d2b28',
  },
};
