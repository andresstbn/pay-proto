import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Card, formatEuros, Screen, Txt } from '../src/components/ui';
import { liveStatus, useProtectedUser, useStore } from '../src/domain/store';
import { QrPayload } from '../src/domain/types';
import { colors, radius, spacing } from '../src/theme/theme';

// Pantalla 9: escanear QR (SPEC-001 §5, RF-001 §10). Cámara real con expo-camera, más un
// atajo de "simular escaneo" (SPEC-001 §6) para no depender de que enfoque en la demo.
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
      // No es un QR de EricPay: se ignora, la cámara sigue escaneando.
    }
  }

  const otherUsers = Object.values(users).filter((u) => u.id !== user.id);
  const pendingRequests = Object.values(oneTimeRequests).filter(
    (r) => r.recipientId !== user.id && liveStatus(r) === 'pending'
  );
  const activeReusables = Object.values(reusableQrs).filter((q) => q.ownerId !== user.id && q.status === 'active');

  return (
    <Screen style={{ gap: spacing.lg }}>
      <Txt variant="title">Escanear QR</Txt>

      <View style={{ height: 260, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.navy900 }}>
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned}
          />
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

      <Txt variant="subtitle">Simular escaneo</Txt>
      <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
        {otherUsers.map((u) => (
          <Pressable key={`p-${u.id}`} onPress={() => route({ app: 'ericpay', type: 'personal', userId: u.id })}>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt variant="body">QR personal de {u.displayName}</Txt>
              <Txt variant="caption" color={colors.gray500}>Monto libre</Txt>
            </Card>
          </Pressable>
        ))}

        {pendingRequests.map((r) => (
          <Pressable key={`r-${r.id}`} onPress={() => route({ app: 'ericpay', type: 'one_time', id: r.id })}>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt variant="body">Cobro de {users[r.recipientId]?.displayName}{r.concept ? ` — ${r.concept}` : ''}</Txt>
              <Txt variant="subtitle">{formatEuros(r.amountInCents)}</Txt>
            </Card>
          </Pressable>
        ))}

        {activeReusables.map((q) => (
          <Pressable key={`q-${q.id}`} onPress={() => route({ app: 'ericpay', type: 'reusable', id: q.id })}>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt variant="body">{q.name} · {users[q.ownerId]?.displayName}</Txt>
              <Txt variant="subtitle">{formatEuros(q.amountInCents)}</Txt>
            </Card>
          </Pressable>
        ))}

        {otherUsers.length + pendingRequests.length + activeReusables.length === 0 && (
          <Txt variant="caption" color={colors.gray500}>No hay nada para escanear todavía.</Txt>
        )}
      </ScrollView>
    </Screen>
  );
}
