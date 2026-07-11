import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card, formatEuros, Screen, Txt } from '../src/components/ui';
import { useProtectedUser, useStore } from '../src/domain/store';
import { colors, spacing } from '../src/theme/theme';

export default function History() {
  const user = useProtectedUser();
  const { transactions, users } = useStore();
  if (!user) return null;

  const own = transactions.filter((t) => t.payerId === user.id || t.recipientId === user.id);

  return (
    <Screen style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs }}>
        <Ionicons name="receipt-outline" size={24} color={colors.blue600} />
        <Txt variant="title" style={{ fontWeight: '700' }}>Historial</Txt>
      </View>

      {own.length === 0 && (
        <Card style={{ alignItems: 'center', padding: spacing.xxl }}>
          <Ionicons name="file-tray-outline" size={48} color={colors.gray500} style={{ marginBottom: spacing.sm }} />
          <Txt variant="body" color={colors.gray500} style={{ textAlign: 'center' }}>
            Todavía no has realizado ninguna transacción.
          </Txt>
        </Card>
      )}

      <ScrollView contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false}>
        {own.map((t) => {
          const isSent = t.payerId === user.id;
          const other = users[isSent ? t.recipientId : t.payerId];
          return (
            <Card key={t.id} style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar user={other} size={42} />
                <View style={{ gap: 2 }}>
                  <Txt variant="body" style={{ fontWeight: '700' }}>
                    {isSent ? `Enviado a ${other?.displayName || 'Usuario'}` : `Recibido de ${other?.displayName || 'Usuario'}`}
                  </Txt>
                  <Txt variant="caption" color={colors.gray500}>
                    {t.concept || (isSent ? 'Pago por QR' : 'Cobro por QR')}
                  </Txt>
                  <Txt variant="caption" color={colors.gray500} style={{ fontSize: 11 }}>
                    {new Date(t.createdAt).toLocaleString('es-ES', { 
                      day: '2-digit', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Txt>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 4,
                  backgroundColor: isSent ? colors.gray50 : '#E4F6ED',
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: 12
                }}>
                  <Ionicons 
                    name={isSent ? 'arrow-up' : 'arrow-down'} 
                    size={12} 
                    color={isSent ? colors.gray900 : colors.green500} 
                  />
                  <Txt variant="subtitle" color={isSent ? colors.gray900 : colors.green500} style={{ fontWeight: '700', fontSize: 15 }}>
                    {formatEuros(t.amountInCents)}
                  </Txt>
                </View>
                <Txt variant="caption" color={colors.gray500} style={{ fontSize: 10 }}>
                  ID: {t.id.split('-').pop()}
                </Txt>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
