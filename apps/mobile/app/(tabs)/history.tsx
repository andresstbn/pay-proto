import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandHeader, Card, formatEuros, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/theme';
import { Transaction } from '../../src/domain/types';

const FILTERS = ['Todos', 'Gastos', 'Ingresos'] as const;
type Filter = (typeof FILTERS)[number];

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  if (sameDay(d, today)) return `Hoy, ${dateStr}`;
  if (sameDay(d, yesterday)) return `Ayer, ${dateStr}`;
  return dateStr;
}

export default function History() {
  const user = useProtectedUser();
  const { transactions, users } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  if (!user) return null;

  const own = transactions.filter((t) => t.payerId === user.id || t.recipientId === user.id);

  const q = query.trim().toLowerCase();
  const visible = own.filter((t) => {
    const isSent = t.payerId === user.id;
    if (filter === 'Gastos' && !isSent) return false;
    if (filter === 'Ingresos' && isSent) return false;
    if (!q) return true;
    const other = users[isSent ? t.recipientId : t.payerId];
    return (other?.displayName || '').toLowerCase().includes(q) || (t.concept || '').toLowerCase().includes(q);
  });

  // Agrupar por día preservando el orden (ya vienen ordenadas desc por fecha).
  const groups: { label: string; items: Transaction[] }[] = [];
  for (const t of visible) {
    const label = dayLabel(t.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(t);
    else groups.push({ label, items: [t] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BrandHeader user={user} />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Búsqueda */}
        <View style={{ justifyContent: 'center' }}>
          <MaterialIcons name="search" size={20} color={colors.gray500} style={{ position: 'absolute', left: spacing.lg, zIndex: 1 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar transacciones..."
            placeholderTextColor={colors.gray500}
            style={{
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.gray200,
              borderRadius: 12,
              paddingVertical: spacing.md,
              paddingLeft: spacing.xxl + spacing.sm,
              paddingRight: spacing.lg,
              ...typography.body,
              color: colors.gray900,
            }}
          />
        </View>

        {/* Filtros */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    backgroundColor: active ? colors.blue600 : colors.white,
                    borderColor: active ? colors.blue600 : colors.gray200,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Txt variant="caption" color={active ? colors.white : colors.gray500} style={{ fontFamily: fonts.semibold }}>
                  {f}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}>
        {groups.length === 0 && (
          <Card style={{ alignItems: 'center', padding: spacing.xxl }}>
            <MaterialIcons name="inbox" size={48} color={colors.gray500} style={{ marginBottom: spacing.sm }} />
            <Txt variant="body" color={colors.gray500} style={{ textAlign: 'center' }}>
              {own.length === 0 ? 'Todavía no has realizado ninguna transacción.' : 'Sin resultados para esta búsqueda.'}
            </Txt>
          </Card>
        )}

        {groups.map((g) => (
          <View key={g.label} style={{ gap: spacing.md }}>
            <Txt variant="body" color={colors.gray500} style={{ fontFamily: fonts.semibold, marginLeft: spacing.xs }}>
              {g.label}
            </Txt>
            {g.items.map((t) => {
              const isSent = t.payerId === user.id;
              const other = users[isSent ? t.recipientId : t.payerId];
              return (
                <Card
                  key={t.id}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderWidth: 0 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: isSent ? colors.gray50 : '#E4F6ED',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons
                        name={isSent ? 'north-east' : 'account-balance-wallet'}
                        size={22}
                        color={isSent ? colors.navy900 : colors.green500}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" color={colors.navy900} style={{ fontFamily: fonts.semibold }}>
                        {isSent ? `Enviado a ${other?.displayName || 'Usuario'}` : `De: ${other?.displayName || 'Usuario'}`}
                      </Txt>
                      <Txt variant="caption" color={colors.gray500}>
                        {new Date(t.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        {' • '}
                        {t.concept || (isSent ? 'Pago por QR' : 'Transferencia')}
                      </Txt>
                    </View>
                  </View>
                  <Txt variant="subtitle" color={isSent ? colors.navy900 : colors.green500} style={{ fontSize: 16 }}>
                    {isSent ? '-' : '+'}{formatEuros(t.amountInCents)}
                  </Txt>
                </Card>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
