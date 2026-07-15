import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Txt } from '../src/components/ui';
import { useNotificationPreferences } from '../src/notifications/notification-preferences';
import { colors, radius, spacing } from '../src/theme/theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreference } = useNotificationPreferences();

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </Pressable>
        <View>
          <Txt variant="title" color={colors.white}>Notificaciones</Txt>
          <Txt variant="caption" color={colors.orange400}>Tú decides cómo avisamos</Txt>
        </View>
      </View>
      <View style={styles.card}>
        <PreferenceRow
          icon="volume-up"
          title="Sonido Propi"
          description="Reproduce el aviso original al recibir dinero."
          value={preferences.soundEnabled}
          onValueChange={(value) => updatePreference('soundEnabled', value)}
        />
        <PreferenceRow
          icon="vibration"
          title="Vibración"
          description="Confirma la transferencia con respuesta háptica."
          value={preferences.hapticsEnabled}
          onValueChange={(value) => updatePreference('hapticsEnabled', value)}
          last
        />
      </View>
      <Txt variant="caption" color={colors.gray500} style={styles.note}>
        Estos avisos funcionan mientras Propi está abierta, incluso desde Expo Go.
      </Txt>
      <Txt variant="caption" color={colors.gray500} style={styles.sectionLabel}>EXPERIENCIA</Txt>
      <Pressable
        accessibilityLabel="Volver a ver el recorrido de bienvenida"
        onPress={() => router.replace({ pathname: '/home', params: { tour: '1' } })}
        style={({ pressed }) => [styles.tourCard, pressed && styles.tourCardPressed]}
      >
        <View style={styles.tourIcon}>
          <MaterialIcons name="auto-awesome" size={22} color={colors.orange400} />
        </View>
        <View style={styles.copy}>
          <Txt variant="subtitle" color={colors.white}>Recorrido de bienvenida</Txt>
          <Txt variant="caption" color={colors.gray200}>Descubre nuevamente lo esencial de Propi.</Txt>
        </View>
        <MaterialIcons name="arrow-forward" size={21} color={colors.orange400} />
      </Pressable>
    </Screen>
  );
}

function PreferenceRow({ icon, title, description, value, onValueChange, last = false }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.icon}><MaterialIcons name={icon} size={22} color={colors.brown700} /></View>
      <View style={styles.copy}>
        <Txt variant="subtitle">{title}</Txt>
        <Txt variant="caption" color={colors.gray500}>{description}</Txt>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.gray200, true: colors.brown500 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: colors.gray50 },
  header: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brown700,
  },
  back: { padding: spacing.sm, marginLeft: -spacing.sm },
  card: { margin: spacing.lg, borderRadius: radius.card, backgroundColor: colors.white, overflow: 'hidden' },
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 },
  copy: { flex: 1, gap: spacing.xs },
  note: { marginHorizontal: spacing.xl, lineHeight: 18 },
  sectionLabel: { marginTop: spacing.xxl, marginHorizontal: spacing.xl, fontSize: 11, letterSpacing: 1.6 },
  tourCard: {
    margin: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.brown700,
  },
  tourCardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  tourIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,183,135,0.12)',
  },
});
