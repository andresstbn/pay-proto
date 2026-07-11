import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { Card, formatEuros, Screen, Txt } from '../src/components/ui';
import { useProtectedUser, useStore } from '../src/domain/store';
import { colors, radius, spacing } from '../src/theme/theme';

const ACTIONS = [
  { href: '/charge/new', label: 'Cobrar', hint: 'Monto puntual' },
  { href: '/personal', label: 'Mi QR', hint: 'Monto abierto' },
  { href: '/reusable', label: 'QRs reutilizables', hint: 'Administrar' },
  { href: '/scan', label: 'Escanear', hint: 'Pagar a alguien' },
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blue600, alignItems: 'center', justifyContent: 'center' }}>
              <Txt color={colors.white} style={{ fontWeight: '700' }}>{user.initial}</Txt>
            </View>
            <Txt variant="subtitle">{user.displayName}</Txt>
          </View>
          <Pressable onPress={() => { logout(); router.replace('/login'); }}>
            <Txt variant="caption" color={colors.blue600}>Cerrar sesión</Txt>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.navy900, borderRadius: radius.card, padding: spacing.xl, gap: spacing.xs }}>
          <Txt variant="caption" color={colors.cyan400}>Saldo disponible</Txt>
          <Txt variant="display" color={colors.white}>{formatEuros(user.balanceInCents)}</Txt>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.href}
              onPress={() => router.push(a.href)}
              style={({ pressed }) => [
                { width: '47%' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Card style={{ gap: spacing.xs }}>
                <Txt variant="subtitle">{a.label}</Txt>
                <Txt variant="caption" color={colors.gray500}>{a.hint}</Txt>
              </Card>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt variant="subtitle">Transacciones recientes</Txt>
            <Pressable onPress={() => router.push('/history')}>
              <Txt variant="caption" color={colors.blue600}>Ver todo</Txt>
            </Pressable>
          </View>

          {recent.length === 0 && <Txt variant="caption" color={colors.gray500}>Todavía no hay transacciones.</Txt>}

          {recent.map((t) => {
            const isSent = t.payerId === user.id;
            const other = users[isSent ? t.recipientId : t.payerId];
            return (
              <Card key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Txt variant="body">{isSent ? `Enviado a ${other?.displayName}` : `Recibido de ${other?.displayName}`}</Txt>
                  {!!t.concept && <Txt variant="caption" color={colors.gray500}>{t.concept}</Txt>}
                </View>
                <Txt variant="subtitle" color={isSent ? colors.gray900 : colors.green500}>
                  {isSent ? '-' : '+'}{formatEuros(t.amountInCents)}
                </Txt>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
