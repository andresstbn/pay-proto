import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, formatEuros, Screen, Txt } from '../src/components/ui';
import { liveStatus, useProtectedUser, useStore } from '../src/domain/store';
import { QrPayload } from '../src/domain/types';
import { colors, radius, spacing } from '../src/theme/theme';

export default function Scan() {
  const user = useProtectedUser();
  const { users, oneTimeRequests, reusableQrs } = useStore();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const locked = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  if (!user) return null;

  function route(payload: QrPayload) {
    if (payload.app !== 'ericpay') return;
    if (payload.type === 'one_time') {
      router.push({ pathname: '/pay/confirm', params: { kind: 'one_time', requestId: payload.id } });
    } else if (payload.type === 'personal') {
      router.push({ pathname: '/pay/amount', params: { recipientId: payload.userId } });
    } else {
      router.push({ pathname: '/pay/confirm', params: { kind: 'reusable', qrId: payload.id } });
    }
  }

  function onBarcodeScanned({ data }: { data: string }) {
    if (locked.current) return;
    try {
      const payload = JSON.parse(data) as QrPayload;
      if (payload.app !== 'ericpay') return;
      locked.current = true;
      route(payload);
    } catch {
      // Ignorar QRs ajenos
    }
  }

  const otherUsers = Object.values(users).filter((u) => u.id !== user.id);
  const pendingRequests = Object.values(oneTimeRequests).filter(
    (r) => r.recipientId !== user.id && liveStatus(r) === 'pending'
  );
  const activeReusables = Object.values(reusableQrs).filter((q) => q.ownerId !== user.id && q.status === 'active');

  return (
    <Screen style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs }}>
        <Ionicons name="scan-outline" size={24} color={colors.blue600} />
        <Txt variant="title" style={{ fontWeight: '700' }}>Escanear QR</Txt>
      </View>

      {/* Visor de Cámara con Máscara Estilizada */}
      <View style={{ height: 260, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.navy900, position: 'relative' }}>
        {permission?.granted ? (
          <>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcodeScanned}
            />
            {/* Máscara de escaneo (viewfinder) tipo HUD móvil */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(11, 20, 54, 0.4)',
            }}>
              <View style={{
                width: 150,
                height: 150,
                borderWidth: 2,
                borderColor: colors.cyan400,
                borderRadius: 20,
                position: 'relative',
              }}>
                {/* Esquinas decorativas iluminadas */}
                <View style={[styles.corner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 }]} />
                <View style={[styles.corner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 }]} />
                <View style={[styles.corner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
                <View style={[styles.corner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 }]} />
              </View>
            </View>
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
            <Txt variant="caption" color={colors.white} style={{ textAlign: 'center' }}>
              {cameraError ?? 'Se necesita acceso a la cámara para escanear.'}
            </Txt>
            <Button
              title="Activar cámara"
              onPress={async () => {
                const res = await requestPermission();
                if (!res.granted) setCameraError('Cámara no disponible — usa "simular escaneo" abajo.');
              }}
            />
          </View>
        )}
      </View>

      {/* Atajo de Simulación de Escaneo */}
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: spacing.xs }}>
          <Ionicons name="sparkles-outline" size={18} color={colors.blue600} />
          <Txt variant="subtitle" style={{ fontWeight: '700' }}>Simular escaneo</Txt>
        </View>

        <ScrollView contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
          {/* QRs Personales */}
          {otherUsers.map((u) => (
            <Pressable key={`p-${u.id}`} onPress={() => route({ app: 'ericpay', type: 'personal', userId: u.id })}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar user={u} size={36} />
                  <View>
                    <Txt variant="body" style={{ fontWeight: '700' }}>QR Personal de {u.displayName}</Txt>
                    <Txt variant="caption" color={colors.gray500}>Pagar monto libre</Txt>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.gray500} />
              </Card>
            </Pressable>
          ))}

          {/* Cobros Puntuales */}
          {pendingRequests.map((r) => {
            const recipient = users[r.recipientId];
            return (
              <Pressable key={`r-${r.id}`} onPress={() => route({ app: 'ericpay', type: 'one_time', id: r.id })}>
                <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.yellow300 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Avatar user={recipient} size={36} />
                    <View>
                      <Txt variant="body" style={{ fontWeight: '700' }}>
                        Cobro de {recipient?.displayName || 'Usuario'}
                      </Txt>
                      <Txt variant="caption" color={colors.gray500}>
                        {r.concept || 'Cobro puntual'} · {new Date(r.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Txt>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Txt variant="subtitle" style={{ fontWeight: '700' }}>{formatEuros(r.amountInCents)}</Txt>
                    <Ionicons name="time-outline" size={14} color={colors.yellow300} />
                  </View>
                </Card>
              </Pressable>
            );
          })}

          {/* QRs Reutilizables */}
          {activeReusables.map((q) => {
            const owner = users[q.ownerId];
            return (
              <Pressable key={`q-${q.id}`} onPress={() => route({ app: 'ericpay', type: 'reusable', id: q.id })}>
                <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.cyan400 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Avatar user={owner} size={36} />
                    <View>
                      <Txt variant="body" style={{ fontWeight: '700' }}>{q.name}</Txt>
                      <Txt variant="caption" color={colors.gray500}>De {owner?.displayName || 'Usuario'}{q.description ? ` · ${q.description}` : ''}</Txt>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Txt variant="subtitle" style={{ fontWeight: '700' }}>{formatEuros(q.amountInCents)}</Txt>
                    <Ionicons name="cafe-outline" size={14} color={colors.cyan400} />
                  </View>
                </Card>
              </Pressable>
            );
          })}

          {otherUsers.length + pendingRequests.length + activeReusables.length === 0 && (
            <Card style={{ alignItems: 'center', padding: spacing.xl }}>
              <Txt variant="caption" color={colors.gray500}>No hay nada para escanear en este momento.</Txt>
            </Card>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.cyan400,
    backgroundColor: 'transparent',
  },
});
