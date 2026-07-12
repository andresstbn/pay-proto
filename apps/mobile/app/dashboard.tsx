import { useEffect, useState } from 'react';
import { Platform, View, ScrollView, useWindowDimensions, ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { MaterialIcons } from '@expo/vector-icons';

import { functions } from '../src/domain/firebase';
import { useProtectedUser, useStore } from '../src/domain/store';
import { colors, spacing, radius, fonts } from '../src/theme/theme';
import { Txt, Button, Card, Avatar, formatEuros, Badge } from '../src/components/ui';

interface DashboardUser {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string;
  balanceInCents: number;
  currency: 'EUR';
}

interface DashboardTransaction {
  id: string;
  qrType: string;
  qrReferenceId: string;
  payerId: string;
  recipientId: string;
  amountInCents: number;
  currency: string;
  concept: string;
  status: string;
  createdAt: number;
}

export default function Dashboard() {
  const user = useProtectedUser();
  const { logout } = useStore();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [txQuery, setTxQuery] = useState('');

  const isLargeScreen = width > 992;

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminGetDashboardData = httpsCallable(functions, 'adminGetDashboardData');
      const response = await adminGetDashboardData();
      const data = response.data as { ok: boolean; users: DashboardUser[]; transactions: DashboardTransaction[] };
      if (data.ok) {
        setUsers(data.users || []);
        setTransactions(data.transactions || []);
      } else {
        setError('Error al procesar la respuesta del servidor.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de conexión al obtener los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && user) {
      fetchDashboardData();
    }
  }, [user]);

  // Si no está en Web, mostramos mensaje de advertencia
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.navy900 }]}>
        <View style={{ width: '90%', maxWidth: 400, gap: spacing.lg, alignItems: 'center' }}>
          <View style={styles.warningIconContainer}>
            <MaterialIcons name="computer" size={48} color={colors.yellow300} />
          </View>
          <Txt variant="title" color={colors.white} style={{ textAlign: 'center' }}>
            Panel reservado para Web
          </Txt>
          <Txt variant="body" color={colors.gray500} style={{ textAlign: 'center' }}>
            Este panel de administración requiere una pantalla de computadora y el entorno web para visualizar adecuadamente todas las métricas, usuarios y transacciones del sistema.
          </Txt>
          <Button title="Volver al Inicio" onPress={() => router.replace('/home')} style={{ width: '100%' }} />
        </View>
      </View>
    );
  }

  if (!user) {
    return null; // Esperando la redirección de useProtectedUser
  }

  // Filtrado de datos
  const filteredUsers = users.filter((u) => {
    const q = userQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const usersMap = users.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {} as Record<string, DashboardUser>);

  const filteredTransactions = transactions.filter((t) => {
    const q = txQuery.toLowerCase().trim();
    if (!q) return true;

    const payer = usersMap[t.payerId];
    const recipient = usersMap[t.recipientId];

    return (
      t.concept.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (payer?.displayName || '').toLowerCase().includes(q) ||
      (recipient?.displayName || '').toLowerCase().includes(q)
    );
  });

  // KPIs
  const totalUsersCount = users.length;
  const totalTransactionsCount = transactions.length;
  const totalVolumeInCents = transactions
    .filter((t) => t.status === 'completed')
    .reduce((acc, t) => acc + t.amountInCents, 0);
  const totalSystemBalanceInCents = users.reduce((acc, u) => acc + u.balanceInCents, 0);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      {/* Cabecera Administrativa */}
      <View style={styles.adminHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={styles.avatarBorder}>
            <Avatar user={user} size={36} />
          </View>
          <View>
            <Txt variant="subtitle" color={colors.white} style={{ fontFamily: fonts.bold }}>
              EricPay Panel
            </Txt>
            <Txt variant="caption" color={colors.cyan400}>
              Administración General
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Pressable
            onPress={fetchDashboardData}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="refresh" size={20} color={colors.white} />
            <Txt variant="caption" color={colors.white} style={{ fontFamily: fonts.semibold }}>
              Actualizar
            </Txt>
          </Pressable>

          <Pressable
            onPress={() => router.push('/home')}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="home" size={20} color={colors.white} />
            <Txt variant="caption" color={colors.white} style={{ fontFamily: fonts.semibold }}>
              Ir a App
            </Txt>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: 'rgba(229, 72, 77, 0.2)' }, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="logout" size={18} color={colors.red500} />
            <Txt variant="caption" color={colors.red500} style={{ fontFamily: fonts.semibold }}>
              Salir
            </Txt>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        {error && (
          <Card style={{ borderColor: colors.red500, backgroundColor: '#FCECEC', padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MaterialIcons name="error-outline" size={24} color={colors.red500} />
              <Txt variant="body" color={colors.red500} style={{ fontFamily: fonts.semibold, flex: 1 }}>
                {error}
              </Txt>
            </View>
          </Card>
        )}

        {/* Fila de KPIs */}
        <View style={styles.kpiRow}>
          <Card style={StyleSheet.flatten([styles.kpiCard, { flex: 1 }])}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="caption" color={colors.gray500} style={{ fontFamily: fonts.semibold }}>
                Volumen Transaccionado
              </Txt>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#E4F6ED' }]}>
                <MaterialIcons name="trending-up" size={20} color={colors.green500} />
              </View>
            </View>
            <Txt variant="display" color={colors.green500} style={{ marginTop: spacing.xs, fontSize: 26 }}>
              {formatEuros(totalVolumeInCents)}
            </Txt>
            <Txt variant="caption" color={colors.gray500} style={{ marginTop: spacing.xs }}>
              Solo transacciones completadas
            </Txt>
          </Card>

          <Card style={StyleSheet.flatten([styles.kpiCard, { flex: 1 }])}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="caption" color={colors.gray500} style={{ fontFamily: fonts.semibold }}>
                Saldos en el Sistema
              </Txt>
              <View style={[styles.kpiIconWrapper, { backgroundColor: colors.yellow100 }]}>
                <MaterialIcons name="account-balance" size={20} color={colors.navy900} />
              </View>
            </View>
            <Txt variant="display" color={colors.navy900} style={{ marginTop: spacing.xs, fontSize: 26 }}>
              {formatEuros(totalSystemBalanceInCents)}
            </Txt>
            <Txt variant="caption" color={colors.gray500} style={{ marginTop: spacing.xs }}>
              Suma de balances de usuarios
            </Txt>
          </Card>

          <Card style={StyleSheet.flatten([styles.kpiCard, { flex: 1 }])}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="caption" color={colors.gray500} style={{ fontFamily: fonts.semibold }}>
                Total Usuarios
              </Txt>
              <View style={[styles.kpiIconWrapper, { backgroundColor: colors.gray100 }]}>
                <MaterialIcons name="people" size={20} color={colors.blue600} />
              </View>
            </View>
            <Txt variant="display" color={colors.blue600} style={{ marginTop: spacing.xs, fontSize: 26 }}>
              {totalUsersCount}
            </Txt>
            <Txt variant="caption" color={colors.gray500} style={{ marginTop: spacing.xs }}>
              Usuarios registrados
            </Txt>
          </Card>

          <Card style={StyleSheet.flatten([styles.kpiCard, { flex: 1 }])}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="caption" color={colors.gray500} style={{ fontFamily: fonts.semibold }}>
                Total Transacciones
              </Txt>
              <View style={[styles.kpiIconWrapper, { backgroundColor: colors.gray100 }]}>
                <MaterialIcons name="swap-horiz" size={20} color={colors.blue600} />
              </View>
            </View>
            <Txt variant="display" color={colors.gray900} style={{ marginTop: spacing.xs, fontSize: 26 }}>
              {totalTransactionsCount}
            </Txt>
            <Txt variant="caption" color={colors.gray500} style={{ marginTop: spacing.xs }}>
              Movimientos totales registrados
            </Txt>
          </Card>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 100, alignItems: 'center' }}>
            <ActivityIndicator color={colors.blue600} size="large" />
            <Txt variant="body" color={colors.gray500} style={{ marginTop: spacing.md }}>
              Cargando base de datos en vivo...
            </Txt>
          </View>
        ) : (
          /* Contenido Principal: Responsive Layout */
          <View style={[styles.contentLayout, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
            {/* Columna Izquierda: Usuarios */}
            <Card style={StyleSheet.flatten([styles.columnCard, { flex: isLargeScreen ? 1 : undefined }])}>
              <View style={styles.columnHeader}>
                <View>
                  <Txt variant="subtitle" color={colors.navy900} style={{ fontFamily: fonts.bold }}>
                    Usuarios del Sistema
                  </Txt>
                  <Txt variant="caption" color={colors.gray500}>
                    {filteredUsers.length} de {users.length} usuarios mostrados
                  </Txt>
                </View>
              </View>

              {/* Filtro Usuarios */}
              <View style={styles.searchWrapper}>
                <MaterialIcons name="search" size={18} color={colors.gray500} style={styles.searchIcon} />
                <TextInput
                  value={userQuery}
                  onChangeText={setUserQuery}
                  placeholder="Buscar usuario por nombre, email o ID..."
                  placeholderTextColor={colors.gray500}
                  style={styles.searchInput}
                />
              </View>

              <ScrollView style={{ maxHeight: 600 }}>
                {filteredUsers.length === 0 ? (
                  <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                    <Txt variant="body" color={colors.gray500}>
                      No se encontraron usuarios.
                    </Txt>
                  </View>
                ) : (
                  filteredUsers.map((u) => (
                    <View key={u.id} style={styles.userListItem}>
                      <Avatar user={u} size={36} />
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Txt variant="body" color={colors.navy900} style={{ fontFamily: fonts.semibold }}>
                          {u.displayName}
                        </Txt>
                        <Txt variant="caption" color={colors.gray500}>
                          {u.email || 'Sin correo electrónico'}
                        </Txt>
                        <Txt variant="caption" color={colors.gray500} style={{ fontSize: 11, color: colors.gray200 }}>
                          ID: {u.id}
                        </Txt>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Txt variant="body" color={colors.navy900} style={{ fontFamily: fonts.bold }}>
                          {formatEuros(u.balanceInCents)}
                        </Txt>
                        <Txt variant="caption" color={colors.gray500}>
                          Saldo
                        </Txt>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </Card>

            {/* Columna Derecha: Transacciones */}
            <Card style={StyleSheet.flatten([styles.columnCard, { flex: isLargeScreen ? 1.6 : undefined }])}>
              <View style={styles.columnHeader}>
                <View>
                  <Txt variant="subtitle" color={colors.navy900} style={{ fontFamily: fonts.bold }}>
                    Registro de Transacciones
                  </Txt>
                  <Txt variant="caption" color={colors.gray500}>
                    {filteredTransactions.length} de {transactions.length} transacciones mostradas
                  </Txt>
                </View>
              </View>

              {/* Filtro Transacciones */}
              <View style={styles.searchWrapper}>
                <MaterialIcons name="search" size={18} color={colors.gray500} style={styles.searchIcon} />
                <TextInput
                  value={txQuery}
                  onChangeText={setTxQuery}
                  placeholder="Buscar transacciones por concepto, ID, pagador o receptor..."
                  placeholderTextColor={colors.gray500}
                  style={styles.searchInput}
                />
              </View>

              <ScrollView style={{ maxHeight: 600 }}>
                {filteredTransactions.length === 0 ? (
                  <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                    <Txt variant="body" color={colors.gray500}>
                      No se encontraron transacciones.
                    </Txt>
                  </View>
                ) : (
                  filteredTransactions.map((t) => {
                    const payer = usersMap[t.payerId];
                    const recipient = usersMap[t.recipientId];
                    const date = new Date(t.createdAt).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    let qrTypeLabel = 'Desconocido';
                    if (t.qrType === 'one_time') qrTypeLabel = 'QR Puntual';
                    else if (t.qrType === 'personal') qrTypeLabel = 'QR Personal';
                    else if (t.qrType === 'reusable') qrTypeLabel = 'QR Reutilizable';

                    return (
                      <View key={t.id} style={styles.txListItem}>
                        <View style={{ gap: spacing.xs, flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                            <Txt variant="body" color={colors.navy900} style={{ fontFamily: fonts.semibold }}>
                              {t.concept || 'Pago'}
                            </Txt>
                            <Badge status={t.status === 'completed' ? 'paid' : 'pending'} label={t.status === 'completed' ? 'Completado' : t.status} />
                            <View style={styles.qrTypeBadge}>
                              <Txt variant="caption" color={colors.gray500} style={{ fontSize: 10, fontFamily: fonts.semibold }}>
                                {qrTypeLabel}
                              </Txt>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                            <Txt variant="caption" color={colors.gray500}>
                              De:
                            </Txt>
                            <Txt variant="caption" color={colors.navy900} style={{ fontFamily: fonts.semibold }}>
                              {payer?.displayName || t.payerId.slice(0, 8)}
                            </Txt>
                            <Txt variant="caption" color={colors.gray500}>
                              Para:
                            </Txt>
                            <Txt variant="caption" color={colors.navy900} style={{ fontFamily: fonts.semibold }}>
                              {recipient?.displayName || t.recipientId.slice(0, 8)}
                            </Txt>
                          </View>

                          <Txt variant="caption" color={colors.gray500} style={{ fontSize: 11, color: colors.gray200 }}>
                            ID: {t.id} • {date}
                          </Txt>
                        </View>

                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Txt variant="subtitle" color={colors.navy900} style={{ fontFamily: fonts.bold, fontSize: 18 }}>
                            {formatEuros(t.amountInCents)}
                          </Txt>
                          <Txt variant="caption" color={colors.gray500}>
                            {t.currency}
                          </Txt>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  warningIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.navy900,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: colors.cyan400,
    borderRadius: 20,
    padding: 2,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  kpiCard: {
    minWidth: 200,
    padding: spacing.lg,
  },
  kpiIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentLayout: {
    gap: spacing.xl,
  },
  columnCard: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    paddingBottom: spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.gray900,
    fontFamily: fonts.regular,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  txListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  qrTypeBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
