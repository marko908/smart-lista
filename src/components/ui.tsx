/**
 * Mały zestaw komponentów na tokenach z design/.
 *
 * Świadomie bez NativeWind: v1.0 ma po prostu wystartować w Expo Go bez
 * dodatkowej konfiguracji babela. Kolory i tak idą wyłącznie przez tokeny,
 * więc przejście na klasy później nie zmieni palety.
 */

import { forwardRef, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radius, useTheme } from '../lib/theme';

export const FONT = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const style = { flex: 1, backgroundColor: t.colors.background };
  if (!scroll) return <View style={style}>{children}</View>;
  return (
    <ScrollView
      style={style}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text style={[s.h1, { color: t.colors.foreground }]} allowFontScaling>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[s.h2, { color: t.colors.foreground }]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <Text style={[s.body, { color: muted ? t.colors.mutedForeground : t.colors.foreground }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[s.label, { color: t.colors.mutedForeground }]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: t.colors.card, borderColor: t.colors.border },
        t.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const t = useTheme();
  const bg = {
    primary: t.colors.primary,
    secondary: t.colors.secondary,
    ghost: 'transparent',
    danger: t.colors.destructive,
  }[variant];
  const fg = {
    primary: t.colors.primaryForeground,
    secondary: t.colors.secondaryForeground,
    ghost: t.colors.mutedForeground,
    danger: t.colors.destructiveForeground,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        s.btn,
        {
          backgroundColor: bg,
          borderColor: variant === 'ghost' ? t.colors.border : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/**
 * Pole tekstowe przekazuje referencję dalej — bez tego nie da się ustawić
 * na nim kursora z zewnątrz, a wyszukiwarka sekcji właśnie na tym stoi.
 */
export const Input = forwardRef<TextInput, React.ComponentProps<typeof TextInput>>(function Input(
  props,
  ref
) {
  const t = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={t.colors.mutedForeground}
      {...props}
      style={[
        s.input,
        { backgroundColor: t.colors.card, borderColor: t.colors.input, color: t.colors.foreground },
        props.style,
      ]}
    />
  );
});

export function Pill({
  label,
  onPress,
  active,
  dim,
  index,
  stan,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
  dim?: boolean;
  index?: number;
  /**
   * Zaznacza rzeczy JUŻ użyte. Nieużyte zostają domyślne — wyróżniamy tylko to,
   * co wymaga uwagi, żeby lista nie zamieniła się w choinkę. Nie blokuje wyboru,
   * bo ta sama kategoria bywa w sklepie w kilku miejscach.
   */
  stan?: 'wolna' | 'zajeta';
}) {
  const t = useTheme();
  const Wrapper: any = onPress ? Pressable : View;
  const zajeta = stan === 'zajeta';
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        stan ? `${label} — ${zajeta ? 'już na planie' : 'jeszcze nieużyta'}` : undefined
      }
      style={({ pressed }: { pressed?: boolean }) => [
        s.pill,
        {
          // Obwódka i ósmoprocentowe wypełnienie — na tyle, żeby zobaczyć kątem
          // oka, za mało, żeby przykryć nazwę. Komu kolor nic nie mówi, tego
          // obsługuje etykieta dostępności: „już na planie".
          backgroundColor: active
            ? t.colors.primary
            : zajeta
              ? t.colors.destructive + '14'
              : t.colors.card,
          borderColor: active ? t.colors.primary : zajeta ? t.colors.destructive : t.colors.border,
          opacity: dim ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {index !== undefined && (
        <Text style={[s.pillIndex, { color: active ? t.colors.primaryForeground : t.colors.mutedForeground }]}>
          {index}
        </Text>
      )}
      <Text
        style={[
          s.pillText,
          { color: active ? t.colors.primaryForeground : t.colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Wrapper>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={[s.empty, { borderColor: t.colors.border }]}>
      <Text style={[s.emptyTitle, { color: t.colors.foreground }]}>{title}</Text>
      {hint ? <Text style={[s.emptyHint, { color: t.colors.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={[s.loading, { backgroundColor: t.colors.background }]}>
      <ActivityIndicator color={t.colors.primary} />
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.border }} />;
}

const s = StyleSheet.create({
  h1: { fontFamily: FONT.sansBold, fontSize: 30, letterSpacing: -0.6, lineHeight: 36 },
  h2: { fontFamily: FONT.sansSemi, fontSize: 18, letterSpacing: -0.36, lineHeight: 24 },
  body: { fontFamily: FONT.sans, fontSize: 15, lineHeight: 22 },
  label: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 10 },
  btn: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnText: { fontFamily: FONT.sansSemi, fontSize: 15, letterSpacing: -0.2 },
  input: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: FONT.sans,
    fontSize: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillText: { fontFamily: FONT.sansMedium, fontSize: 13.5, letterSpacing: -0.2 },
  pillIndex: { fontFamily: FONT.monoBold, fontSize: 11 },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: 22,
    gap: 6,
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: FONT.sansSemi, fontSize: 15.5, textAlign: 'center' },
  emptyHint: { fontFamily: FONT.sans, fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
