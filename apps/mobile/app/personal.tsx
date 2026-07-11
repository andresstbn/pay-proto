import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { View } from 'react-native';
import { Button, Txt } from '../src/components/ui';
import { useProtectedUser } from '../src/domain/store';
import { QrPayload } from '../src/domain/types';
import { colors, spacing } from '../src/theme/theme';

// Pantalla 6: QR personal de monto abierto (SPEC-001 §5, RF-001 §8). Estable y reutilizable —
// no cambia de estado con cada pago.
export default function PersonalQr() {
  const user = useProtectedUser();
  const router = useRouter();
  if (!user) return null;

  const payload: QrPayload = { app: 'ericpay', type: 'personal', userId: user.id };

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, padding: spacing.xl, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
      <View style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: 20, borderWidth: 2, borderColor: colors.cyan400 }}>
        <QRCode value={JSON.stringify(payload)} size={220} color={colors.navy900} backgroundColor={colors.white} />
      </View>

      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Txt variant="title" color={colors.white}>Pagar a {user.displayName}</Txt>
        <Txt variant="body" color={colors.cyan400}>El pagador elegirá el monto</Txt>
      </View>

      <Button title="Volver al inicio" variant="outline" onPress={() => router.replace('/home')} style={{ borderColor: colors.white }} textColor={colors.white} />
    </View>
  );
}
