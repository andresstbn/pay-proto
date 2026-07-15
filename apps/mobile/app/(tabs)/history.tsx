import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandHeader, Card, formatEuros, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { useGroups } from '../../src/groups/GroupProvider';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/theme';

const FILTERS = ['Todos', 'Gastos', 'Ingresos'] as const;
type Filter = (typeof FILTERS)[number];

interface HistoryEntry {
  id: string;
  createdAt: number;
  isSent: boolean;
  isGroup: boolean;
  title: string;
  concept: string;
  amountInCents: number;
  recipientCount?: number;
}

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
  const { history: groupHistory, groups: paymentGroups } = useGroups();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  if (!user) return null;

  const own = transactions.filter((t) => {
    const qrType = (t as { qrType: string }).qrType;
    return !qrType.startsWith('group_') && (t.payerId === user.id || t.recipientId === user.id);
  });
  const entries: HistoryEntry[] = [
    ...own.map((transaction): HistoryEntry => {
      const isSent = transaction.payerId === user.id;
      const other = users[isSent ? transaction.recipientId : transaction.payerId];
      return {
        id: transaction.id,
        createdAt: transaction.createdAt,
        isSent,
        isGroup: false,
        title: isSent ? `Enviado a ${other?.displayName || 'Usuario'}` : `De: ${other?.displayName || 'Usuario'}`,
        concept: transaction.concept || (isSent ? 'Pago por QR' : 'Transferencia'),
        amountInCents: transaction.amountInCents,
      };
    }),
    ...groupHistory.map((transaction): HistoryEntry => {
      const groupName = transaction.groupName || paymentGroups.find((group) => group.id === transaction.groupId)?.name || 'Grupo';
      return {
        id: transaction.id,
        createdAt: transaction.createdAt,
        isSent: transaction.direction === 'sent',
        isGroup: true,
        title: transaction.direction === 'sent' ? `Pago a ${groupName}` : `Ingreso de ${groupName}`,
        concept: transaction.concept || 'Reparto grupal',
        amountInCents: transaction.visibleAmountInCents,
        recipientCount: transaction.recipientCount,
      };
    }),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const q = query.trim().toLowerCase();
  const visible = entries.filter((entry) => {
    if (filter === 'Gastos' && !entry.isSent) return false;
    if (filter === 'Ingresos' && entry.isSent) return false;
    if (!q) return true;
    return entry.title.toLowerCase().includes(q) || entry.concept.toLowerCase().includes(q);
  });

  // Agrupar por día preservando el orden (ya vienen ordenadas desc por fecha).
  const dayGroups: { label: string; items: HistoryEntry[] }[] = [];
  for (const entry of visible) {
    const label = dayLabel(entry.createdAt);
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else dayGroups.push({ label, items: [entry] });
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
                    backgroundColor: active ? colors.brown700 : colors.white,
                    borderColor: active ? colors.brown700 : colors.gray200,
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
        {dayGroups.length === 0 && (
          <Card style={{ alignItems: 'center', padding: spacing.xxl }}>
            <MaterialIcons name="inbox" size={48} color={colors.gray500} style={{ marginBottom: spacing.sm }} />
            <Txt variant="body" color={colors.gray500} style={{ textAlign: 'center' }}>
              {entries.length === 0 ? 'Todavía no has realizado ninguna transacción.' : 'Sin resultados para esta búsqueda.'}
            </Txt>
          </Card>
        )}

        {dayGroups.map((g) => (
          <View key={g.label} style={{ gap: spacing.md }}>
            <Txt variant="body" color={colors.gray500} style={{ fontFamily: fonts.semibold, marginLeft: spacing.xs }}>
              {g.label}
            </Txt>
            {g.items.map((entry) => {
              return (
                <Card
                  key={`${entry.isGroup ? 'group' : 'personal'}-${entry.id}`}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderWidth: 0 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: entry.isSent ? colors.gray50 : '#E4F6ED',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons
                      name={entry.isGroup ? 'groups' : entry.isSent ? 'north-east' : 'account-balance-wallet'}
                        size={22}
                      color={entry.isSent ? colors.brown700 : colors.green500}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" color={colors.brown700} style={{ fontFamily: fonts.semibold }}>
                        {entry.title}
                      </Txt>
                      <Txt variant="caption" color={colors.gray500}>
                        {new Date(entry.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        {' • '}
                        {entry.concept}
                        {entry.isGroup && entry.recipientCount ? ` · ${entry.recipientCount} receptores` : ''}
                      </Txt>
                    </View>
                  </View>
                  <Txt variant="subtitle" color={entry.isSent ? colors.brown700 : colors.green500} style={{ fontSize: 16 }}>
                    {entry.isSent ? '-' : '+'}{formatEuros(entry.amountInCents)}
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
