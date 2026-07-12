import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, formatEuros, Txt } from '../../src/components/ui';
import { liveStatus, useProtectedUser, useStore } from '../../src/domain/store';
import { QrPayload } from '../../src/domain/types';
import { GROUP_QR_KIND, GROUP_QR_STATUS, GROUP_QR_TYPE } from '../../src/groups/constants';
import { useGroups } from '../../src/groups/GroupProvider';
import { groupFixedQrPayload, groupOpenQrPayload, parseEricPayQr } from '../../src/groups/qr';
import { colors, fonts, spacing } from '../../src/theme/theme';

const FRAME = 240;

export default function Scan() {
  const user = useProtectedUser();
  const { users, oneTimeRequests, reusableQrs } = useStore();
  const { groups, qrsByGroup } = useGroups();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const locked = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const scanY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      locked.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 1250, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 1250, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanY]);

  if (!user) return null;

  function route(payload: QrPayload) {
    if (locked.current) return;
    if (payload.app !== 'ericpay') return;
    locked.current = true;
    if (payload.type === 'one_time') {
      router.push({ pathname: '/pay/confirm', params: { kind: 'one_time', requestId: payload.id } });
    } else if (payload.type === 'personal') {
      router.push({ pathname: '/pay/amount', params: { recipientId: payload.userId } });
    } else if (payload.type === 'reusable') {
      router.push({ pathname: '/pay/confirm', params: { kind: 'reusable', qrId: payload.id } });
    } else if (payload.type === GROUP_QR_TYPE.OPEN) {
      router.push({ pathname: '/groups/pay/amount', params: { groupId: payload.groupId } });
    } else {
      router.push({ pathname: '/groups/pay/confirm', params: { qrId: payload.qrId } });
    }
  }

  function onBarcodeScanned({ data }: { data: string }) {
    const payload = parseEricPayQr(data);
    if (payload) route(payload);
  }

  const otherUsers = Object.values(users).filter((u) => u.id !== user.id);
  const pendingRequests = Object.values(oneTimeRequests).filter(
    (r) => r.recipientId !== user.id && liveStatus(r) === 'pending'
  );
  const activeReusables = Object.values(reusableQrs).filter((q) => q.ownerId !== user.id && q.status === 'active');
  const activeGroupQrs = groups.flatMap((group) => (qrsByGroup[group.id] ?? []).filter(
    (qr) => qr.type === GROUP_QR_KIND.FIXED && qr.status === GROUP_QR_STATUS.ACTIVE,
  ).map((qr) => ({ group, qr })));

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900 }}>
      {permission?.granted && (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,20,54,0.45)' }]} />
        </>
      )}

      <View style={{ flex: 1, paddingTop: insets.top + spacing.sm }}>
        {/* Header: cerrar y linterna */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
          <Pressable onPress={() => router.replace('/home')} style={({ pressed }) => [styles.roundBtn, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="close" size={24} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={() => setTorchOn((v) => !v)}
            style={({ pressed }) => [styles.roundBtn, torchOn && { backgroundColor: colors.cyan400 }, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="flashlight-on" size={24} color={torchOn ? colors.navy900 : colors.white} />
          </Pressable>
        </View>

        {/* Visor */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {permission?.granted ? (
            <>
              <View style={{ width: FRAME, height: FRAME }}>
                <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 24 }]} />
                <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 24 }]} />
                <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 24 }]} />
                <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 24 }]} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 24 }}>
                  <Animated.View
                    style={{
                      height: 2,
                      backgroundColor: colors.cyan400,
                      shadowColor: colors.cyan400,
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 0 },
                      transform: [{ translateY: scanY.interpolate({ inputRange: [0, 1], outputRange: [0, FRAME - 2] }) }],
                    }}
                  />
                </View>
              </View>
              <Txt variant="title" color={colors.white} style={{ fontSize: 20, marginTop: spacing.xl }}>Escanea un código QR</Txt>
              <Txt variant="body" color={colors.cyan400} style={{ marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.xxl }}>
                Apunta al código para pagar o transferir instantáneamente
              </Txt>
              {/* ponytail: botón decorativo — leer QR desde galería no existe en esta fase */}
              <View style={styles.galleryBtn}>
                <MaterialIcons name="image" size={18} color={colors.white} />
                <Txt variant="caption" color={colors.white} style={{ fontFamily: fonts.semibold }}>Subir desde galería</Txt>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl }}>
              <Txt variant="body" color={colors.white} style={{ textAlign: 'center' }}>
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

        {/* Simulador de escaneo (SPEC-001): imprescindible sin cámara/QRs físicos */}
        <View style={styles.simPanel}>
          <Txt variant="caption" color={colors.cyan400} style={{ fontFamily: fonts.bold, letterSpacing: 1.5, marginBottom: spacing.sm }}>
            SIMULAR ESCANEO
          </Txt>
          <ScrollView style={{ maxHeight: 190 }} contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
            {otherUsers.map((u) => (
              <SimRow key={`p-${u.id}`} onPress={() => route({ app: 'ericpay', type: 'personal', userId: u.id })}>
                <Avatar user={u} size={36} />
                <View style={{ flex: 1 }}>
                  <Txt variant="body" color={colors.white} style={{ fontFamily: fonts.semibold }}>QR Personal de {u.displayName}</Txt>
                  <Txt variant="caption" color="rgba(255,255,255,0.6)">Pagar monto libre</Txt>
                </View>
              </SimRow>
            ))}
            {pendingRequests.map((r) => {
              const recipient = users[r.recipientId];
              return (
                <SimRow key={`r-${r.id}`} onPress={() => route({ app: 'ericpay', type: 'one_time', id: r.id })}>
                  <Avatar user={recipient} size={36} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" color={colors.white} style={{ fontFamily: fonts.semibold }}>
                      Cobro de {recipient?.displayName || 'Usuario'}
                    </Txt>
                    <Txt variant="caption" color="rgba(255,255,255,0.6)">{r.concept || 'Cobro puntual'}</Txt>
                  </View>
                  <Txt variant="subtitle" color={colors.yellow300} style={{ fontSize: 15 }}>{formatEuros(r.amountInCents)}</Txt>
                </SimRow>
              );
            })}
            {activeReusables.map((q) => {
              const owner = users[q.ownerId];
              return (
                <SimRow key={`q-${q.id}`} onPress={() => route({ app: 'ericpay', type: 'reusable', id: q.id })}>
                  <Avatar user={owner} size={36} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" color={colors.white} style={{ fontFamily: fonts.semibold }}>{q.name}</Txt>
                    <Txt variant="caption" color="rgba(255,255,255,0.6)">De {owner?.displayName || 'Usuario'}</Txt>
                  </View>
                  <Txt variant="subtitle" color={colors.cyan400} style={{ fontSize: 15 }}>{formatEuros(q.amountInCents)}</Txt>
                </SimRow>
              );
            })}
            {groups.map((group) => (
              <SimRow
                key={`go-${group.id}`}
                onPress={() => route(groupOpenQrPayload(group.id))}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyan400 }}>
                  <MaterialIcons name="groups" size={20} color={colors.navy900} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" color={colors.white} style={{ fontFamily: fonts.semibold }}>{group.name}</Txt>
                  <Txt variant="caption" color="rgba(255,255,255,0.6)">QR grupal · monto libre</Txt>
                </View>
              </SimRow>
            ))}
            {activeGroupQrs.map(({ group, qr }) => (
              <SimRow
                key={`gf-${qr.id}`}
                onPress={() => route(groupFixedQrPayload(qr.id))}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.yellow300 }}>
                  <MaterialIcons name="qr-code-2" size={20} color={colors.navy900} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" color={colors.white} style={{ fontFamily: fonts.semibold }}>{qr.name}</Txt>
                  <Txt variant="caption" color="rgba(255,255,255,0.6)">{group.name}</Txt>
                </View>
                <Txt variant="subtitle" color={colors.yellow300} style={{ fontSize: 15 }}>{formatEuros(qr.amountInCents)}</Txt>
              </SimRow>
            ))}
            {otherUsers.length + pendingRequests.length + activeReusables.length + groups.length + activeGroupQrs.length === 0 && (
              <Txt variant="caption" color="rgba(255,255,255,0.6)">No hay nada para escanear en este momento.</Txt>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function SimRow({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: spacing.md,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(22,32,79,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderColor: colors.cyan400,
  },
  galleryBtn: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(22,32,79,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  simPanel: {
    backgroundColor: 'rgba(11,20,54,0.88)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
});
