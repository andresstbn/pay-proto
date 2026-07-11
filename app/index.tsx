import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Txt } from '../src/components/ui';
import { useCurrentUser } from '../src/domain/store';
import { colors, spacing } from '../src/theme/theme';

// Pantalla 1: carga inicial y recuperación de sesión. Como el store vive solo en memoria
// (SPEC-001 §6), "recuperar sesión" es siempre negativo tras un reinicio real de la app —
// esta pantalla solo evita un salto brusco a /login y deja el punto único de decisión.
export default function Index() {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace(user ? '/home' : '/login'), 400);
    return () => clearTimeout(t);
  }, [user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
      <Txt variant="title" color={colors.white}>EricPay</Txt>
      <ActivityIndicator color={colors.cyan400} />
    </View>
  );
}
