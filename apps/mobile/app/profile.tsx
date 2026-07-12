import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Screen, Txt } from '../src/components/ui';
import { useProtectedUser, useStore } from '../src/domain/store';
import { colors, fonts, radius, spacing } from '../src/theme/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useProtectedUser();
  const { logout } = useStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? '—';

  if (!user) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator color={colors.blue600} size="large" />
      </Screen>
    );
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.replace('/login');
  }

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityLabel="Volver"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </Pressable>
        <Txt variant="title" color={colors.white}>Perfil</Txt>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.identityCard}>
          <Avatar user={user} size={82} style={styles.avatar} />
          <Txt variant="title" color={colors.navy900} style={styles.name}>{user.displayName}</Txt>
          <View style={styles.activeChip}>
            <View style={styles.activeDot} />
            <Txt variant="caption" color={colors.green500} style={styles.activeText}>Cuenta activa</Txt>
          </View>
        </View>

        <View style={styles.section}>
          <Txt variant="caption" color={colors.gray500} style={styles.sectionLabel}>PREFERENCIAS</Txt>
          <View style={styles.card}>
            <ProfileRow
              icon="notifications-none"
              title="Notificaciones"
              description="Sonido y vibración al recibir dinero"
              onPress={() => router.push('/notifications')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Txt variant="caption" color={colors.gray500} style={styles.sectionLabel}>ACERCA DE</Txt>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.rowIcon}>
                <MaterialIcons name="verified-user" size={21} color={colors.blue600} />
              </View>
              <View style={styles.rowCopy}>
                <Txt variant="subtitle">EricPay</Txt>
                <Txt variant="caption" color={colors.gray500}>Escanea. Paga. Listo.</Txt>
              </View>
              <Txt variant="caption" color={colors.gray500}>v{appVersion}</Txt>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Cerrar sesión"
          disabled={loggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && !loggingOut && styles.logoutPressed,
            loggingOut && styles.logoutDisabled,
          ]}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.red500} />
          ) : (
            <>
              <MaterialIcons name="logout" size={21} color={colors.red500} />
              <Txt variant="subtitle" color={colors.red500} style={styles.logoutText}>Cerrar sesión</Txt>
            </>
          )}
        </Pressable>

      </ScrollView>
    </Screen>
  );
}

function ProfileRow({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.infoRow, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={22} color={colors.blue600} />
      </View>
      <View style={styles.rowCopy}>
        <Txt variant="subtitle">{title}</Txt>
        <Txt variant="caption" color={colors.gray500}>{description}</Txt>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.gray500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: colors.gray50 },
  loading: { alignItems: 'center', justifyContent: 'center' },
  header: {
    minHeight: 96,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.navy900,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerSpacer: { width: 40 },
  pressed: { opacity: 0.7 },
  content: { padding: spacing.lg, gap: spacing.xl },
  identityCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  avatar: { borderWidth: 3, borderColor: colors.cyan400 },
  name: { marginTop: spacing.lg, textAlign: 'center' },
  activeChip: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: '#E4F6ED',
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green500 },
  activeText: { fontFamily: fonts.semibold },
  section: { gap: spacing.sm },
  sectionLabel: { marginLeft: spacing.xs, fontSize: 11, letterSpacing: 1.5, fontFamily: fonts.bold },
  card: {
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  infoRow: {
    minHeight: 82,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowPressed: { backgroundColor: colors.gray100 },
  rowIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.gray100,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  logoutButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(229,72,77,0.35)',
    backgroundColor: 'rgba(229,72,77,0.06)',
  },
  logoutPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  logoutDisabled: { opacity: 0.5 },
  logoutText: { fontFamily: fonts.bold },
});
