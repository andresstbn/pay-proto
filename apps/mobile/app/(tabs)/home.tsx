import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandHeader, Card, formatEuros, Screen, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { colors, fonts, radius, shadow, spacing } from '../../src/theme/theme';

const ACTIONS = [
  { href: '/scan', label: 'Escanear', icon: 'qr-code-scanner' },
  { href: '/personal', label: 'Recibir', icon: 'qr-code' },
  { href: '/charge/new', label: 'Cobrar', icon: 'payments' },
  { href: '/reusable', label: 'Reutilizables', icon: 'grid-view' },
] as const;

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Home() {
  const user = useProtectedUser();
  const { transactions, logout, users } = useStore();
  const router = useRouter();
  const [balanceHidden, setBalanceHidden] = useState(false);

  if (!user) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.cyan400} size="large" />
      </Screen>
    );
  }

  const own = transactions.filter((t) => t.payerId === user.id || t.recipientId === user.id);
  const recent = own.slice(0, 3);

  // "Has ahorrado" = neto (recibido - enviado) del mes en curso; se oculta si no es positivo.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const netThisMonth = own
    .filter((t) => t.createdAt >= monthStart)
    .reduce((sum, t) => sum + (t.recipientId === user.id ? t.amountInCents : -t.amountInCents), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BrandHeader
        user={user}
        greeting={`${greetingByHour()}, ${user.displayName.split(' ')[0]}`}
        onLogout={async () => {
          await logout();
          router.replace('/login');
        }}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        {/* Tarjeta de saldo */}
        <LinearGradient
          colors={[colors.navy900, colors.navy700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.card,
            padding: spacing.xl,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <View
            style={{
              position: 'absolute',
              right: -40,
              top: -40,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: colors.cyan400,
              opacity: 0.12,
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Txt variant="caption" color={colors.cyan400} style={{ fontSize: 12, fontFamily: fonts.bold, letterSpacing: 2 }}>
              SALDO DISPONIBLE
            </Txt>
            <Pressable onPress={() => setBalanceHidden((v) => !v)} hitSlop={8}>
              <MaterialIcons name={balanceHidden ? 'visibility-off' : 'visibility'} size={22} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
          <Txt variant="display" color={colors.white} style={{ fontSize: 36 }}>
            {balanceHidden ? '••••••' : formatEuros(user.balanceInCents)}
          </Txt>
          {netThisMonth > 0 && (
            <View
              style={{
                marginTop: spacing.xl,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: spacing.sm,
              }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(90,216,240,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="trending-up" size={16} color={colors.cyan400} />
              </View>
              <Txt variant="caption" color="rgba(255,255,255,0.8)">
                Has ahorrado <Txt variant="caption" color={colors.green500} style={{ fontFamily: fonts.bold }}>+{formatEuros(netThisMonth)}</Txt> este mes
              </Txt>
            </View>
          )}
        </LinearGradient>

        {/* Acciones rápidas */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.href}
              onPress={() => router.push(a.href)}
              style={({ pressed }) => [
                { flex: 1, alignItems: 'center', gap: spacing.sm },
                pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
              ]}
            >
              <View
                style={{
                  width: '100%',
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: colors.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadow.card,
                }}
              >
                <MaterialIcons name={a.icon} size={28} color={colors.blue600} />
              </View>
              <Txt variant="caption" color={colors.gray500} style={{ fontSize: 12, fontFamily: fonts.bold }}>
                {a.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        {/* ponytail: banner decorativo — Inversión no existe como feature en esta fase */}
        <View
          style={{
            backgroundColor: colors.yellow300,
            borderRadius: radius.card,
            padding: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" color={colors.navy900}>Inversión EricPay</Txt>
            <Txt variant="caption" color={colors.navy700}>Haz crecer tu dinero con un 12% de rendimiento anual.</Txt>
          </View>
          <View style={{ backgroundColor: colors.navy900, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}>
            <Txt variant="caption" color={colors.white} style={{ fontSize: 12, fontFamily: fonts.bold }}>Explorar</Txt>
          </View>
        </View>

        {/* Actividad reciente */}
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt variant="title" color={colors.navy900} style={{ fontSize: 20 }}>Actividad reciente</Txt>
            <Pressable onPress={() => router.push('/history')} hitSlop={8}>
              <Txt variant="caption" color={colors.blue600} style={{ fontFamily: fonts.bold }}>Ver todo</Txt>
            </Pressable>
          </View>

          {recent.length === 0 && (
            <Card style={{ alignItems: 'center', padding: spacing.xl }}>
              <MaterialIcons name="receipt-long" size={32} color={colors.gray500} style={{ marginBottom: spacing.xs }} />
              <Txt variant="caption" color={colors.gray500}>Todavía no hay transacciones.</Txt>
            </Card>
          )}

          {recent.map((t) => {
            const isSent = t.payerId === user.id;
            const other = users[isSent ? t.recipientId : t.payerId];
            return (
              <Card
                key={t.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing.lg,
                  borderWidth: 0,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isSent ? colors.gray100 : '#E4F6ED',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons
                      name={isSent ? 'north-east' : 'account-balance-wallet'}
                      size={22}
                      color={isSent ? colors.navy700 : colors.green500}
                    />
                  </View>
                  <View>
                    <Txt variant="body" style={{ fontFamily: fonts.semibold }}>
                      {isSent ? `Enviado a ${other?.displayName || 'Usuario'}` : `Recibido de ${other?.displayName || 'Usuario'}`}
                    </Txt>
                    <Txt variant="caption" color={colors.gray500}>
                      {new Date(t.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      {t.concept ? ` · ${t.concept}` : ''}
                    </Txt>
                  </View>
                </View>
                <Txt variant="subtitle" color={isSent ? colors.gray900 : colors.green500} style={{ fontSize: 16 }}>
                  {isSent ? '-' : '+'}{formatEuros(t.amountInCents)}
                </Txt>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
