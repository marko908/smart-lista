/**
 * Motyw aplikacji. Wartości pochodzą z design/tokens.ts, który jest przepisany
 * 1:1 z design/theme.css — jedynego źródła prawdy dla kolorów.
 * Nie definiuj kolorów tutaj; jak czegoś brakuje, dodaj to najpierw w design/.
 */

import { useColorScheme } from 'react-native';
import {
  dark, light, radius, semantic, shadow, space, typography,
  type ThemeColors,
} from '../../design/tokens';

export { radius, space, typography };
export type { ThemeColors };

export type Theme = {
  colors: ThemeColors;
  semantic: ReturnType<typeof semantic>;
  shadow: typeof shadow.light;
  isDark: boolean;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? dark : light;
  return {
    colors,
    semantic: semantic(colors),
    shadow: isDark ? shadow.dark : shadow.light,
    isDark,
  };
}
