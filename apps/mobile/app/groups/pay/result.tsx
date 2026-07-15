import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge, Button, Card, formatEuros, Screen, Txt } from '../../../src/components/ui';
import { useProtectedUser } from '../../../src/domain/store';
import { colors, spacing } from '../../../src/theme/theme';

export default function GroupPayResultScreen() {
  const params = useLocalSearchParams<{
    transactionId?: string;
    groupName?: string;
    amount?: string;
    recipients?: string;
    concept?: string;
    createdAt?: string;
    payerBalanceInCentsAfter?: string;
  }>();
  const user = useProtectedUser();
  const router = useRouter();
  if (!user) return null;

  const amountInCents = Number(params.amount ?? 0);
  const recipientCount = Number(params.recipients ?? 0);
  const parsedCreatedAt = Number(params.createdAt);
  const createdAt = Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : Date.now();
  const payerBalanceInCentsAfter = Number(params.payerBalanceInCentsAfter);
  const valid = Boolean(
    params.transactionId
    && params.groupName
    && Number.isSafeInteger(amountInCents)
    && amountInCents > 0
    && Number.isInteger(recipientCount)
    && recipientCount > 0
    && Number.isSafeInteger(payerBalanceInCentsAfter)
    && payerBalanceInCentsAfter >= 0
  );

  if (!valid) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
        <Txt>Recibo no disponible.</Txt>
        <Button title="Volver al inicio" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  return (
    <Screen style={{ justifyContent: 'center', gap: spacing.xl }}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: '#E4F6ED', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="check" size={42} color={colors.green500} />
        </View>
        <Badge status="paid" label="Pago repartido" />
        <Txt variant="display" color={colors.brown700}>{formatEuros(amountInCents)}</Txt>
        <Txt variant="body" color={colors.gray500}>a {params.groupName}</Txt>
      </View>
      <Card style={{ gap: spacing.md }}>
        <Row label="Personas receptoras" value={String(recipientCount)} />
        {params.concept ? <Row label="Concepto" value={params.concept} /> : null}
        <Row label="Fecha" value={new Date(createdAt).toLocaleString('es-ES')} />
        <Row label="Saldo disponible" value={formatEuros(payerBalanceInCentsAfter)} />
        <Row label="Identificador" value={params.transactionId!} />
      </Card>
      <Button title="Volver al inicio" onPress={() => router.replace('/home')} />
      <Button title="Ver historial" variant="outline" onPress={() => router.replace('/history')} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg }}>
      <Txt variant="caption" color={colors.gray500}>{label}</Txt>
      <Txt variant="caption" style={{ flex: 1, textAlign: 'right' }}>{value}</Txt>
    </View>
  );
}
