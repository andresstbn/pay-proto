import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { View } from 'react-native';
import { Badge, BadgeStatus, Button, formatEuros, Txt } from '../../src/components/ui';
import { liveStatus, useProtectedUser, useStore } from '../../src/domain/store';
import { QrPayload } from '../../src/domain/types';
import { colors, spacing } from '../../src/theme/theme';

// Pantalla 5: mostrar QR de cobro puntual (SPEC-001 §5, RF-001 §7). El estado se lee en vivo
// del store — cuando el pagador paga desde otra pantalla, esta se actualiza sola.
export default function ChargeQr() {
  const { id: requestId } = useLocalSearchParams<{ id: string }>();
  const user = useProtectedUser();
  const { oneTimeRequests } = useStore();
  const router = useRouter();
  if (!user) return null;

  const request = oneTimeRequests[requestId];
  if (!request) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Txt color={colors.white}>Cobro no encontrado.</Txt>
        <Button title="Volver al inicio" onPress={() => router.replace('/home')} />
      </View>
    );
  }

  const status = liveStatus(request);
  const payload: QrPayload = { app: 'ericpay', type: 'one_time', id: request.id };

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, padding: spacing.xl, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
      <View style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: 20, borderWidth: 2, borderColor: colors.cyan400 }}>
        <QRCode value={JSON.stringify(payload)} size={220} color={colors.navy900} backgroundColor={colors.white} />
      </View>

      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Txt variant="title" color={colors.white}>{user.displayName}</Txt>
        <Txt variant="display" color={colors.white}>{formatEuros(request.amountInCents)}</Txt>
        {!!request.concept && <Txt variant="body" color={colors.cyan400}>{request.concept}</Txt>}
      </View>

      <Badge status={status as BadgeStatus} />

      <Button title="Volver al inicio" variant="outline" onPress={() => router.replace('/home')} style={{ borderColor: colors.white }} textColor={colors.white} />
    </View>
  );
}
