import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, spacing, typography } from '../theme/theme';
import { User } from '../domain/types';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Avatar({ user, size = 36, style }: { user?: User | null; size?: number; style?: ViewStyle }) {
  if (!user) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.gray200,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      />
    );
  }

  const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';

  if (user.photoUrl) {
    return (
      <Image
        source={{ uri: user.photoUrl }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.gray200,
          },
          style as any,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.blue600,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={[
          typography.subtitle,
          {
            color: colors.white,
            fontSize: size * 0.42,
            fontFamily: fonts.bold,
            textAlign: 'center',
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

// Los pesos vienen de estilos legados como fontWeight; con Hanken Grotesk cada peso
// es una familia distinta, así que se traduce aquí y se elimina el fontWeight.
const weightToFont: Record<string, string> = {
  normal: fonts.regular,
  '400': fonts.regular,
  '500': fonts.semibold,
  '600': fonts.semibold,
  bold: fonts.bold,
  '700': fonts.bold,
  '800': fonts.extrabold,
};

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
  const flat = StyleSheet.flatten([typography[variant], { color }, style]) as TextStyle;
  if (flat.fontWeight) {
    flat.fontFamily = weightToFont[String(flat.fontWeight)] ?? fonts.regular;
    delete flat.fontWeight;
  }
  return <Text style={flat}>{children}</Text>;
}

// Header de marca compartido por las pantallas principales (DESIGN.md): degradado
// navy, avatar con borde cian, wordmark y campana (decorativa en esta fase).
export function BrandHeader({
  user,
  greeting,
  onLogout,
}: {
  user: User;
  greeting?: string;
  onLogout?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.navy900, colors.navy700]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Avatar user={user} size={40} style={{ borderWidth: 2, borderColor: colors.cyan400 }} />
        <View>
          {greeting ? (
            <Txt variant="caption" color={colors.cyan400} style={{ opacity: 0.8 }}>{greeting}</Txt>
          ) : null}
          <Txt variant="subtitle" color={colors.white} style={{ fontSize: 20, fontFamily: fonts.bold }}>EricPay</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {/* ponytail: campana decorativa — sin feature de notificaciones en esta fase */}
        <View style={styles.headerIconBtn}>
          <MaterialIcons name="notifications-none" size={22} color={colors.white} />
        </View>
        {onLogout && (
          <Pressable onPress={onLogout} style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="logout" size={20} color={colors.white} />
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
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
      <Text style={[typography.caption, { color: s.fg, fontFamily: fonts.semibold }]}>{label ?? s.label}</Text>
    </View>
  );
}

export function formatEuros(amountInCents: number): string {
  return (amountInCents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

// Entrada del usuario ("3,50") → céntimos enteros. Inversa de formatEuros.
export function parseEuros(text: string): number {
  const value = Number.parseFloat(text.replace(',', '.').trim());
  return Number.isNaN(value) ? 0 : Math.round(value * 100);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.gray50,
    padding: spacing.lg,
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
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
