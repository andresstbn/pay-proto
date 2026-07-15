import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Button, Card, formatEuros, Screen, ScreenHeader, Txt } from '../../src/components/ui';
import { liveStatus, useProtectedUser, useStore } from '../../src/domain/store';
import { colors, spacing } from '../../src/theme/theme';

type Kind = 'one_time' | 'personal' | 'reusable';

// Pantalla 11: confirmación de pago (SPEC-001 §5, RF-001 §11). Punto único para los tres
// tipos de QR — cada uno resuelve receptor/monto/concepto de forma distinta pero comparte
// la misma pantalla de revisión y el mismo botón de confirmar.
export default function Confirm() {
  const params = useLocalSearchParams<{
    kind: Kind;
    requestId?: string;
    qrId?: string;
    recipientId?: string;
    amount?: string;
    concept?: string;
  }>();
  const user = useProtectedUser();
  const { users, oneTimeRequests, reusableQrs, payOneTime, payPersonal, payReusable } = useStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!user) return null;

  let recipientId: string | undefined;
  let amountInCents = 0;
  let concept = '';
  let blockedReason: string | null = null;

  if (params.kind === 'one_time') {
    const request = oneTimeRequests[params.requestId ?? ''];
    if (!request) blockedReason = 'QR inválido o desactivado.';
    else {
      recipientId = request.recipientId;
      amountInCents = request.amountInCents;
      concept = request.concept;
      const status = liveStatus(request);
      if (status === 'expired') blockedReason = 'Solicitud expirada.';
      if (status === 'paid') blockedReason = 'Solicitud ya pagada.';
      if (status === 'cancelled') blockedReason = 'QR inválido o desactivado.';
    }
  } else if (params.kind === 'personal') {
    recipientId = params.recipientId;
    amountInCents = Number(params.amount ?? '0');
    concept = params.concept ?? '';
  } else if (params.kind === 'reusable') {
    const qr = reusableQrs[params.qrId ?? ''];
    if (!qr) blockedReason = 'QR inválido o desactivado.';
    else {
      recipientId = qr.ownerId;
      amountInCents = qr.amountInCents;
      concept = qr.name;
      if (qr.status !== 'active') blockedReason = 'QR inválido o desactivado.';
    }
  }

  const recipient = recipientId ? users[recipientId] : undefined;
  if (!blockedReason && !recipient) blockedReason = 'Usuario receptor inexistente.';
  if (!blockedReason && recipientId === user.id) blockedReason = 'No puedes pagarte a ti mismo.';

  async function confirm() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      let result;
      if (params.kind === 'one_time') {
        result = await payOneTime({ requestId: params.requestId! });
      } else if (params.kind === 'personal') {
        result = await payPersonal({ recipientId: recipientId!, amountInCents, concept });
      } else {
        result = await payReusable({ qrId: params.qrId! });
      }

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.replace({ pathname: '/pay/result', params: { transactionId: result.id } });
    } catch (e: any) {
      setError(e.message || 'Error al procesar el pago.');
      setLoading(false);
    }
  }

  const balanceAfter = user.balanceInCents - amountInCents;

  return (
    <Screen style={{ gap: spacing.xl }}>
      <ScreenHeader title="Confirmar pago" />

      {blockedReason ? (
        <Card>
          <Txt color={colors.red500}>{blockedReason}</Txt>
        </Card>
      ) : (
        <>
          <Card style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xl }}>
            <Avatar user={recipient} size={64} style={{ borderWidth: 1.5, borderColor: colors.orange400 }} />
            <View style={{ alignItems: 'center', marginTop: spacing.xs }}>
              <Txt variant="caption" color={colors.gray500}>Vas a pagar a</Txt>
              <Txt variant="subtitle" style={{ fontWeight: '700', fontSize: 18 }}>{recipient!.displayName}</Txt>
            </View>
            <Txt variant="display" style={{ fontSize: 36, fontWeight: '800', marginVertical: spacing.xs }}>
              {formatEuros(amountInCents)}
            </Txt>
            {!!concept && (
              <View style={{ backgroundColor: colors.gray50, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 12 }}>
                <Txt variant="body" color={colors.gray500}>{concept}</Txt>
              </View>
            )}
          </Card>

          <Card style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt variant="caption" color={colors.gray500}>Saldo actual</Txt>
              <Txt variant="body">{formatEuros(user.balanceInCents)}</Txt>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt variant="caption" color={colors.gray500}>Saldo después del pago</Txt>
              <Txt variant="subtitle" color={balanceAfter < 0 ? colors.red500 : colors.gray900}>{formatEuros(balanceAfter)}</Txt>
            </View>
          </Card>

          {error && <Txt color={colors.red500}>{error}</Txt>}

          <Button title={loading ? 'Procesando...' : 'Confirmar'} onPress={confirm} disabled={loading || balanceAfter < 0} />
        </>
      )}

      <Button title="Cancelar" variant="outline" onPress={() => router.replace('/home')} disabled={loading} />
    </Screen>
  );
}
