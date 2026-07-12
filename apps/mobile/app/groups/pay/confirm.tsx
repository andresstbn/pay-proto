import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, formatEuros, Screen, ScreenHeader, Txt } from '../../../src/components/ui';
import { useProtectedUser } from '../../../src/domain/store';
import { useGroups } from '../../../src/groups/GroupProvider';
import { createGroupPaymentRequestId } from '../../../src/groups/request-id';
import { GroupPaymentPreview } from '../../../src/groups/types';
import { colors, spacing } from '../../../src/theme/theme';

export default function GroupPayConfirmScreen() {
  const params = useLocalSearchParams<{ groupId?: string; qrId?: string; amount?: string }>();
  const user = useProtectedUser();
  const router = useRouter();
  const { previewPayment, payGroup } = useGroups();
  const [preview, setPreview] = useState<GroupPaymentPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(createGroupPaymentRequestId()).current;
  const amountInCents = params.amount ? Number(params.amount) : undefined;
  const validInput = Boolean(
    (params.groupId && !params.qrId && typeof amountInCents === 'number' && Number.isInteger(amountInCents) && amountInCents > 0)
    || (params.qrId && !params.groupId && params.amount === undefined),
  );

  async function loadPreview() {
    if (!validInput) {
      setError('El QR del grupo no contiene datos válidos.');
      setLoadingPreview(false);
      return;
    }
    setLoadingPreview(true);
    setError(null);
    const result = await previewPayment({ groupId: params.groupId, qrId: params.qrId, amountInCents });
    if (result.ok) setPreview(result.preview);
    else setError(result.error);
    setLoadingPreview(false);
  }

  useEffect(() => {
    loadPreview();
  }, [params.groupId, params.qrId, params.amount]);

  if (!user) return null;

  async function confirm() {
    if (!preview || paying) return;
    setPaying(true);
    setError(null);
    const result = await payGroup({
      groupId: params.groupId,
      qrId: params.qrId,
      amountInCents,
      clientRequestId: requestId,
    });
    if (!result.ok) {
      setError(result.error);
      setPaying(false);
      return;
    }
    router.replace({
      pathname: '/groups/pay/result',
      params: {
        transactionId: result.transactionId,
        groupName: preview.groupName,
        amount: String(result.amountInCents),
        recipients: String(result.recipientCount),
        concept: preview.concept,
        createdAt: String(result.createdAt),
        payerBalanceInCentsAfter: String(result.payerBalanceInCentsAfter),
      },
    });
  }

  return (
    <Screen style={{ gap: spacing.xl }}>
      <ScreenHeader title="Confirmar reparto" />
      {loadingPreview ? (
        <Card style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xxl }}>
          <MaterialIcons name="hourglass-top" size={36} color={colors.blue600} />
          <Txt variant="body" color={colors.gray500}>Calculando el reparto actual…</Txt>
        </Card>
      ) : preview ? (
        <>
          <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="groups" size={34} color={colors.cyan400} />
            </View>
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <Txt variant="caption" color={colors.gray500}>Vas a pagar a</Txt>
              <Txt variant="title" color={colors.navy900}>{preview.groupName}</Txt>
            </View>
            <Txt variant="display" color={colors.navy900} style={{ fontSize: 38 }}>{formatEuros(preview.amountInCents)}</Txt>
            {preview.concept ? <Txt variant="body" color={colors.gray500}>{preview.concept}</Txt> : null}
          </Card>

          <Card style={{ gap: spacing.md }}>
            <SummaryRow label="Personas que reciben" value={String(preview.recipientCount)} />
            <SummaryRow label="Saldo disponible" value={formatEuros(user.balanceInCents)} />
          </Card>

          <Card style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.yellow100, borderWidth: 0 }}>
            <MaterialIcons name="privacy-tip" size={20} color={colors.navy900} />
            <Txt variant="caption" color={colors.navy700} style={{ flex: 1, lineHeight: 18 }}>
              El grupo decidirá el reparto definitivo al confirmar. No mostramos las identidades de sus miembros.
            </Txt>
          </Card>
        </>
      ) : null}

      {error ? (
        <View style={{ gap: spacing.md }}>
          <Txt color={colors.red500} style={{ textAlign: 'center' }}>{error}</Txt>
          {!loadingPreview && !preview ? <Button title="Reintentar" variant="outline" onPress={loadPreview} /> : null}
        </View>
      ) : null}

      <View style={{ marginTop: 'auto', gap: spacing.md }}>
        {preview ? <Button title={paying ? 'Repartiendo…' : 'Confirmar pago'} onPress={confirm} disabled={paying} /> : null}
        <Button title="Cancelar" variant="outline" onPress={() => router.back()} disabled={paying} />
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Txt variant="caption" color={colors.gray500}>{label}</Txt>
      <Txt variant="subtitle" color={colors.navy900}>{value}</Txt>
    </View>
  );
}
