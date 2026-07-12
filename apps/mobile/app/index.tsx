import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Txt } from '../src/components/ui';
import { useStore } from '../src/domain/store';
import { colors, spacing } from '../src/theme/theme';

// Pantalla 1: carga inicial. Espera a que Firebase Auth resuelva la sesión persistida
// (SPEC-002 §5.3) y redirige a /home o /login — único punto de decisión de arranque.
export default function Index() {
  const { currentUserId, loading } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => router.replace(currentUserId ? '/home' : '/login'), 400);
    return () => clearTimeout(t);
  }, [currentUserId, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
      <Txt variant="title" color={colors.white}>EricPay</Txt>
      <ActivityIndicator color={colors.cyan400} />
    </View>
  );
}
