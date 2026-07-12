import QRCode from 'react-native-qrcode-svg';
import { Pressable, Share, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandHeader, Txt } from '../../src/components/ui';
import { useProtectedUser } from '../../src/domain/store';
import { QrPayload } from '../../src/domain/types';
import { colors, fonts, spacing } from '../../src/theme/theme';

// QR personal de monto abierto (SPEC-001 §5, RF-001 §8). Estable y reutilizable —
// no cambia de estado con cada pago.
export default function PersonalQr() {
  const user = useProtectedUser();
  if (!user) return null;

  const payload: QrPayload = { app: 'ericpay', type: 'personal', userId: user.id };
  const handle = '@' + user.displayName.trim().toLowerCase().replace(/\s+/g, '.');

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900 }}>
      <BrandHeader user={user} />
      <LinearGradient
        colors={[colors.navy900, colors.navy700]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: colors.white,
            borderRadius: 32,
            padding: spacing.xl,
            alignItems: 'center',
            shadowColor: colors.cyan400,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 30,
            elevation: 8,
          }}
        >
          {/* Chip QR sobre el borde superior de la card */}
          <View
            style={{
              position: 'absolute',
              top: -24,
              alignSelf: 'center',
              backgroundColor: colors.cyan400,
              padding: spacing.md,
              borderRadius: 16,
            }}
          >
            <MaterialIcons name="qr-code-2" size={24} color={colors.navy900} />
          </View>

          <View style={{ backgroundColor: colors.gray100, borderRadius: 16, padding: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xl }}>
            <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: spacing.md }}>
              <QRCode value={JSON.stringify(payload)} size={190} color={colors.navy900} backgroundColor={colors.white} />
            </View>
          </View>

          <Txt variant="title" style={{ fontSize: 20 }}>{user.displayName}</Txt>
          <Txt variant="body" color={colors.gray500}>{handle}</Txt>
        </View>

        <Txt variant="body" color={colors.cyan400} style={{ marginTop: spacing.xxl, textAlign: 'center', letterSpacing: 0.5 }}>
          Muestra este código para recibir un pago
        </Txt>

        <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xl }}>
          <QrAction
            icon="share"
            label="Compartir"
            onPress={() => Share.share({ message: `Págame con EricPay — soy ${user.displayName} (${handle}). Escanea mi QR personal desde la app.` })}
          />
          {/* ponytail: Guardar decorativo — guardar imagen requiere media library, fuera de esta fase */}
          <QrAction icon="download" label="Guardar" />
        </View>
      </LinearGradient>
    </View>
  );
}

function QrAction({ icon, label, onPress }: { icon: 'share' | 'download'; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ alignItems: 'center', gap: spacing.xs }, pressed && !!onPress && { transform: [{ scale: 0.92 }] }]}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={22} color={colors.white} />
      </View>
      <Txt variant="caption" color="rgba(255,255,255,0.7)" style={{ fontFamily: fonts.semibold }}>{label}</Txt>
    </Pressable>
  );
}
