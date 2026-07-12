import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { View } from 'react-native';
import { Badge, Button, formatEuros, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { QrPayload } from '../../src/domain/types';
import { colors, spacing } from '../../src/theme/theme';

// Pantalla 8 (visualizar): QR reutilizable ya creado.
export default function ReusableQrScreen() {
  const { id: qrId } = useLocalSearchParams<{ id: string }>();
  const user = useProtectedUser();
  const { reusableQrs, deactivateReusable } = useStore();
  const router = useRouter();
  const [deactivating, setDeactivating] = useState(false);
  if (!user) return null;

  const qr = reusableQrs[qrId];
  if (!qr) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Txt color={colors.white}>QR no encontrado.</Txt>
        <Button title="Volver al inicio" onPress={() => router.replace('/home')} />
      </View>
    );
  }

  const payload: QrPayload = { app: 'ericpay', type: 'reusable', id: qr.id };
  const isOwner = qr.ownerId === user.id;

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, padding: spacing.xl, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
      <View style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: 20, borderWidth: 2, borderColor: colors.cyan400 }}>
        <QRCode value={JSON.stringify(payload)} size={220} color={colors.navy900} backgroundColor={colors.white} />
      </View>

      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Txt variant="title" color={colors.white}>{qr.name}</Txt>
        <Txt variant="display" color={colors.white}>{formatEuros(qr.amountInCents)}</Txt>
        {!!qr.description && <Txt variant="body" color={colors.cyan400}>{qr.description}</Txt>}
      </View>

      <Badge status={qr.status === 'active' ? 'paid' : 'cancelled'} label={qr.status === 'active' ? 'Activo' : 'Inactivo'} />

      {isOwner && qr.status === 'active' && (
        <Button
          title={deactivating ? 'Desactivando...' : 'Desactivar QR'}
          variant="accent"
          disabled={deactivating}
          onPress={async () => {
            if (deactivating) return;
            setDeactivating(true);
            const res = await deactivateReusable({ qrId: qr.id });
            setDeactivating(false);
            if (!res.ok) {
              alert(res.error);
            }
          }}
        />
      )}

      <Button title="Volver al inicio" variant="outline" onPress={() => router.replace('/home')} style={{ borderColor: colors.white }} textColor={colors.white} />
    </View>
  );
}
