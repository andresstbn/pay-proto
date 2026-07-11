import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';

export function Screen({ children, style, dark }: { children: ReactNode; style?: ViewStyle; dark?: boolean }) {
  return (
    <View style={[styles.screen, dark && styles.screenDark, style]}>{children}</View>
  );
}

export function Txt({
  variant = 'body',
  color = colors.gray900,
  style,
  children,
}: {
  variant?: keyof typeof typography;
  color?: string;
  style?: TextStyle;
  children: ReactNode;
}) {
  return <Text style={[typography[variant], { color }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'accent' | 'outline';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  textColor,
}: {
  title: string;
  onPress: PressableProps['onPress'];
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  textColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'accent' && styles.buttonAccent,
        variant === 'outline' && styles.buttonOutline,
        disabled && styles.buttonDisabled,
        pressed && !disabled && { opacity: 0.85 },
        style,
      ]}
    >
      <Text
        style={[
          typography.subtitle,
          { color: textColor ?? (variant === 'outline' ? colors.blue600 : variant === 'accent' ? colors.navy900 : colors.white) },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export type BadgeStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'error';

const badgeStyles: Record<BadgeStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.yellow100, fg: colors.navy900, label: 'Pendiente' },
  paid: { bg: '#E4F6ED', fg: colors.green500, label: 'Pagado' },
  expired: { bg: colors.gray200, fg: colors.gray500, label: 'Expirado' },
  cancelled: { bg: colors.gray200, fg: colors.gray500, label: 'Cancelado' },
  error: { bg: '#FBE7E8', fg: colors.red500, label: 'Error' },
};

export function Badge({ status, label }: { status: BadgeStatus; label?: string }) {
  const s = badgeStyles[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[typography.caption, { color: s.fg, fontWeight: '600' }]}>{label ?? s.label}</Text>
    </View>
  );
}

export function formatEuros(amountInCents: number): string {
  return (amountInCents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.gray50,
    padding: spacing.lg,
  },
  screenDark: {
    backgroundColor: colors.navy900,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.lg,
    ...shadow.card,
  },
  button: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.blue600 },
  buttonAccent: { backgroundColor: colors.yellow300 },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.blue600 },
  buttonDisabled: { opacity: 0.4 },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
