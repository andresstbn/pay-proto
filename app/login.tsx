import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Txt } from '../src/components/ui';
import { useStore } from '../src/domain/store';
import { colors, radius, spacing } from '../src/theme/theme';

// Pantalla 2: login simulado (SPEC-001 §6, D-004). Botones con la estética de "elegir cuenta"
// de un sign-in federado, sin usar marca ni logo de terceros.
export default function Login() {
  const { users, login } = useStore();
  const router = useRouter();

  function continueAs(userId: string) {
    login(userId);
    router.replace('/home');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, padding: spacing.xl, justifyContent: 'center', gap: spacing.xxxl }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Txt variant="display" color={colors.white}>EricPay</Txt>
        <Txt variant="body" color={colors.cyan400}>Pagos simulados por QR</Txt>
      </View>

      <View style={{ gap: spacing.md }}>
        {Object.values(users).map((u) => (
          <Pressable
            key={u.id}
            onPress={() => continueAs(u.id)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                backgroundColor: colors.white,
                borderRadius: radius.pill,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.blue600,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt variant="body" color={colors.white} style={{ fontWeight: '700' }}>{u.initial}</Txt>
            </View>
            <Txt variant="subtitle" color={colors.gray900}>Continuar como {u.displayName}</Txt>
          </Pressable>
        ))}
      </View>

      <Txt variant="caption" color={colors.gray500} style={{ textAlign: 'center' }}>
        Demo interna — saldo ficticio, sin conexión con bancos ni dinero real.
      </Txt>
    </View>
  );
}
