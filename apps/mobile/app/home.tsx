import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card, formatEuros, Screen, Txt } from '../src/components/ui';
import { useProtectedUser, useStore } from '../src/domain/store';
import { colors, radius, spacing } from '../src/theme/theme';

const ACTIONS = [
  { href: '/charge/new', label: 'Cobrar', hint: 'Monto puntual', icon: 'cash-outline' },
  { href: '/personal', label: 'Mi QR', hint: 'Monto abierto', icon: 'qr-code-outline' },
  { href: '/reusable', label: 'QRs reutilizables', hint: 'Administrar', icon: 'grid-outline' },
  { href: '/scan', label: 'Escanear', hint: 'Pagar a alguien', icon: 'scan-outline' },
] as const;

export default function Home() {
  const user = useProtectedUser();
  const { transactions, logout, users } = useStore();
  const router = useRouter();
  if (!user) return null;

  const recent = transactions.filter((t) => t.payerId === user.id || t.recipientId === user.id).slice(0, 3);

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Header Superior */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar user={user} size={44} style={{ borderWidth: 1.5, borderColor: colors.cyan400 }} />
            <View>
              <Txt variant="caption" color={colors.gray500}>Hola,</Txt>
              <Txt variant="subtitle" style={{ fontWeight: '700' }}>{user.displayName}</Txt>
            </View>
          </View>
          <Pressable 
            onPress={async () => { await logout(); router.replace('/login'); }}
            style={({ pressed }) => [
              { padding: spacing.xs, borderRadius: 20, backgroundColor: colors.gray100 },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.red500} />
          </Pressable>
        </View>

        {/* Tarjeta de Saldo Principal */}
        <View style={{ 
          backgroundColor: colors.navy900, 
          borderRadius: radius.card, 
          padding: spacing.xl, 
          gap: spacing.xs,
          position: 'relative',
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: colors.navy700
        }}>
          {/* Círculo decorativo tipo "glow" al fondo */}
          <View style={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.cyan400,
            opacity: 0.1,
            blurRadius: 40
          } as any} />

          <Txt variant="caption" color={colors.cyan400} style={{ fontWeight: '600', letterSpacing: 0.5 }}>SALDO DISPONIBLE</Txt>
          <Txt variant="display" color={colors.white}>{formatEuros(user.balanceInCents)}</Txt>
        </View>

        {/* Grid de Acciones */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.href}
              onPress={() => router.push(a.href)}
              style={({ pressed }) => [
                { width: '47%' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Card style={{ padding: spacing.md, gap: spacing.sm, alignItems: 'flex-start', borderLeftWidth: 3, borderLeftColor: colors.blue600 }}>
                <View style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  backgroundColor: colors.gray50, 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Ionicons name={a.icon} size={22} color={colors.blue600} />
                </View>
                <View>
                  <Txt variant="subtitle" style={{ fontSize: 15, fontWeight: '700' }}>{a.label}</Txt>
                  <Txt variant="caption" color={colors.gray500}>{a.hint}</Txt>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Transacciones Recientes */}
        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt variant="subtitle" style={{ fontWeight: '700' }}>Transacciones recientes</Txt>
            <Pressable onPress={() => router.push('/history')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Txt variant="caption" color={colors.blue600} style={{ fontWeight: '600' }}>Ver todo</Txt>
                <Ionicons name="arrow-forward" size={14} color={colors.blue600} />
              </View>
            </Pressable>
          </View>

          {recent.length === 0 && (
            <Card style={{ alignItems: 'center', padding: spacing.xl }}>
              <Ionicons name="receipt-outline" size={32} color={colors.gray500} style={{ marginBottom: spacing.xs }} />
              <Txt variant="caption" color={colors.gray500}>Todavía no hay transacciones.</Txt>
            </Card>
          )}

          {recent.map((t) => {
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
                  <Avatar user={other} size={40} />
                  <View>
                    <Txt variant="body" style={{ fontWeight: '700' }}>
                      {isSent ? `Enviado a ${other?.displayName || 'Usuario'}` : `Recibido de ${other?.displayName || 'Usuario'}`}
                    </Txt>
                    <Txt variant="caption" color={colors.gray500}>
                      {t.concept || (isSent ? 'Pago por QR' : 'Cobro por QR')}
                    </Txt>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Txt variant="subtitle" color={isSent ? colors.gray900 : colors.green500} style={{ fontWeight: '700' }}>
                    {isSent ? '-' : '+'}{formatEuros(t.amountInCents)}
                  </Txt>
                  <Txt variant="caption" color={colors.gray500} style={{ fontSize: 11 }}>
                    {new Date(t.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </Txt>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
