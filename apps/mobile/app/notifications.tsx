import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Screen, Txt } from '../src/components/ui';
import { useNotificationPreferences } from '../src/notifications/notification-preferences';
import { colors, radius, spacing } from '../src/theme/theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { preferences, updatePreference, pushStatus } = useNotificationPreferences();

  const pushStatusLabel = {
    idle: 'Desactivadas',
    registering: 'Configurando…',
    ready: 'Activas en este dispositivo',
    denied: 'Permiso denegado en iOS/Android',
    unsupported: 'Requiere un dispositivo y una development build',
    error: 'No se pudo completar la configuración',
  }[pushStatus];

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </Pressable>
        <View>
          <Txt variant="title" color={colors.white}>Notificaciones</Txt>
          <Txt variant="caption" color={colors.cyan400}>Tú decides cómo avisamos</Txt>
        </View>
      </View>
      <View style={styles.card}>
        <PreferenceRow
          icon="volume-up"
          title="Sonido EricPay"
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
        />
        <PreferenceRow
          icon="notifications-active"
          title="Notificaciones push"
          description={pushStatusLabel}
          value={preferences.pushEnabled}
          onValueChange={(value) => updatePreference('pushEnabled', value)}
          last
        />
      </View>
      <Txt variant="caption" color={colors.gray500} style={styles.note}>
        El banner dentro de EricPay seguirá mostrándose aunque desactives el sonido o la vibración.
      </Txt>
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
      <View style={styles.icon}><MaterialIcons name={icon} size={22} color={colors.blue600} /></View>
      <View style={styles.copy}>
        <Txt variant="subtitle">{title}</Txt>
        <Txt variant="caption" color={colors.gray500}>{description}</Txt>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.gray200, true: colors.blue500 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: colors.gray50 },
  header: {
    paddingTop: 64,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.navy900,
  },
  back: { padding: spacing.sm, marginLeft: -spacing.sm },
  card: { margin: spacing.lg, borderRadius: radius.card, backgroundColor: colors.white, overflow: 'hidden' },
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 },
  copy: { flex: 1, gap: spacing.xs },
  note: { marginHorizontal: spacing.xl, lineHeight: 18 },
});
