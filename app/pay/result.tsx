import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge, Button, Card, formatEuros, Screen, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { colors, spacing } from '../../src/theme/theme';

// Pantalla 12: resultado del pago (SPEC-001 §5, RF-001 §13).
export default function Result() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const user = useProtectedUser();
  const { transactions, users } = useStore();
  const router = useRouter();
  if (!user) return null;

  const transaction = transactions.find((t) => t.id === transactionId);
  if (!transaction) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Txt>Transacción no encontrada.</Txt>
        <Button title="Volver al inicio" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  const recipient = users[transaction.recipientId];

  return (
    <Screen style={{ gap: spacing.xl, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Badge status="paid" label="Pago completado" />
        <Txt variant="display">{formatEuros(transaction.amountInCents)}</Txt>
        <Txt variant="body" color={colors.gray500}>a {recipient?.displayName}</Txt>
      </View>

      <Card style={{ gap: spacing.sm }}>
        <Row label="Fecha" value={new Date(transaction.createdAt).toLocaleString('es-ES')} />
        {!!transaction.concept && <Row label="Concepto" value={transaction.concept} />}
        <Row label="Nuevo saldo" value={formatEuros(user.balanceInCents)} />
        <Row label="Identificador" value={transaction.id} />
      </Card>

      <Button title="Volver al inicio" onPress={() => router.replace('/home')} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Txt variant="caption" color={colors.gray500}>{label}</Txt>
      <Txt variant="caption">{value}</Txt>
    </View>
  );
}
