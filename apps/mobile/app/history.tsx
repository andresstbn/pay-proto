import { ScrollView } from 'react-native';
import { Card, formatEuros, Screen, Txt } from '../src/components/ui';
import { useProtectedUser, useStore } from '../src/domain/store';
import { colors, spacing } from '../src/theme/theme';

// Pantalla 13: historial de transacciones (SPEC-001 §5, RF-001 §14).
export default function History() {
  const user = useProtectedUser();
  const { transactions, users } = useStore();
  if (!user) return null;

  const own = transactions.filter((t) => t.payerId === user.id || t.recipientId === user.id);

  return (
    <Screen style={{ gap: spacing.lg }}>
      <Txt variant="title">Historial</Txt>

      {own.length === 0 && <Txt variant="caption" color={colors.gray500}>Todavía no hay transacciones.</Txt>}

      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        {own.map((t) => {
          const isSent = t.payerId === user.id;
          const other = users[isSent ? t.recipientId : t.payerId];
          return (
            <Card key={t.id} style={{ gap: spacing.xs }}>
              <Txt variant="subtitle">{isSent ? `Enviado a ${other?.displayName}` : `Recibido de ${other?.displayName}`}</Txt>
              <Txt variant="title" color={isSent ? colors.gray900 : colors.green500}>
                {isSent ? '-' : '+'}{formatEuros(t.amountInCents)}
              </Txt>
              {!!t.concept && <Txt variant="caption" color={colors.gray500}>{t.concept}</Txt>}
              <Txt variant="caption" color={colors.gray500}>{new Date(t.createdAt).toLocaleString('es-ES')}</Txt>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
