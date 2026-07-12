import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { ActivityIndicator, PixelRatio, Platform, Pressable, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { BrandHeader, Txt } from '../../src/components/ui';
import { useProtectedUser } from '../../src/domain/store';
import { QrPayload } from '../../src/domain/types';
import {
  releasePersonalQrImage,
  savePersonalQrImage,
  sharePersonalQrImage,
} from '../../src/qr/personal-qr-image';
import { colors, fonts, spacing } from '../../src/theme/theme';

type QrActionType = 'share' | 'save';
type QrFeedback = { message: string; tone: 'error' | 'success' };

const QR_EXPORT_PIXELS = 1024;

// QR personal de monto abierto (SPEC-001 §5, RF-001 §8). Estable y reutilizable —
// no cambia de estado con cada pago.
export default function PersonalQr() {
  const user = useProtectedUser();
  const qrCaptureRef = useRef<View | null>(null);
  const [activeAction, setActiveAction] = useState<QrActionType | null>(null);
  const [feedback, setFeedback] = useState<QrFeedback | null>(null);
  if (!user) return null;

  const payload: QrPayload = { app: 'ericpay', type: 'personal', userId: user.id };
  const handle = '@' + user.displayName.trim().toLowerCase().replace(/\s+/g, '.');
  const exportSize = Platform.OS === 'ios'
    ? Math.round(QR_EXPORT_PIXELS / PixelRatio.get())
    : QR_EXPORT_PIXELS;

  async function handleQrAction(action: QrActionType) {
    if (activeAction) return;

    const startedAt = Date.now();
    let imageUri: string | null = null;
    setActiveAction(action);
    setFeedback(null);
    console.info({
      event: 'personal_qr_image_action',
      provider: Platform.OS,
      status: 'started',
      step: action,
    });

    try {
      if (!qrCaptureRef.current) throw new Error('qr/capture-not-ready');
      imageUri = await captureRef(qrCaptureRef, {
        format: 'png',
        height: exportSize,
        quality: 1,
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
        width: exportSize,
      });

      const outcome = action === 'share'
        ? await sharePersonalQrImage(imageUri)
        : await savePersonalQrImage(imageUri);

      setFeedback({
        message: outcome === 'downloaded'
          ? 'Tu navegador no permite compartir archivos; descargamos el QR.'
          : action === 'share'
            ? 'QR listo para compartir.'
            : Platform.OS === 'web'
              ? 'QR descargado.'
              : 'QR guardado en Fotos.',
        tone: 'success',
      });
      console.info({
        durationMs: Date.now() - startedAt,
        event: 'personal_qr_image_action',
        provider: Platform.OS,
        status: 'completed',
        step: action,
      });
    } catch (error) {
      const errorCode = qrActionErrorCode(error);
      if (errorCode === 'AbortError') {
        console.info({
          durationMs: Date.now() - startedAt,
          errorCode: 'cancelled',
          event: 'personal_qr_image_action',
          provider: Platform.OS,
          status: 'degraded',
          step: action,
        });
      } else {
        console.warn({
          durationMs: Date.now() - startedAt,
          errorCode,
          event: 'personal_qr_image_action',
          provider: Platform.OS,
          status: 'failed',
          step: action,
        });
        setFeedback({ message: qrActionErrorMessage(errorCode, action), tone: 'error' });
      }
    } finally {
      setActiveAction(null);
      if (imageUri) releasePersonalQrImage(imageUri);
    }
  }

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
            <View
              collapsable={false}
              ref={qrCaptureRef}
              style={{ backgroundColor: colors.white, borderRadius: 12, padding: spacing.md }}
            >
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
            disabled={activeAction !== null}
            loading={activeAction === 'share'}
            onPress={() => handleQrAction('share')}
          />
          <QrAction
            icon="download"
            label="Guardar"
            disabled={activeAction !== null}
            loading={activeAction === 'save'}
            onPress={() => handleQrAction('save')}
          />
        </View>

        {feedback ? (
          <View
            accessibilityLiveRegion="polite"
            style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}
          >
            <MaterialIcons
              name={feedback.tone === 'success' ? 'check-circle-outline' : 'error-outline'}
              size={18}
              color={feedback.tone === 'success' ? colors.green500 : colors.red500}
            />
            <Txt
              variant="caption"
              color={feedback.tone === 'success' ? colors.green500 : colors.red500}
              style={{ maxWidth: 280, textAlign: 'center' }}
            >
              {feedback.message}
            </Txt>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function qrActionErrorCode(error: unknown) {
  if (!(error instanceof Error)) return 'unknown';
  return error.message.startsWith('qr/') ? error.message.slice(3) : error.name;
}

function qrActionErrorMessage(errorCode: string, action: QrActionType) {
  if (errorCode === 'permission-denied') {
    return 'Necesito permiso para guardar el QR en Fotos.';
  }
  if (errorCode === 'sharing-unavailable') {
    return 'Este dispositivo no permite compartir archivos.';
  }
  if (errorCode === 'media-library-unavailable') {
    return 'No encuentro una galería disponible para guardar el QR.';
  }
  if (errorCode === 'capture-not-ready') {
    return 'El QR todavía se está preparando. Inténtalo de nuevo.';
  }
  if (errorCode === 'download-unavailable') {
    return 'Este navegador no permite descargar el QR.';
  }
  return action === 'share'
    ? 'No se pudo compartir el QR. Inténtalo de nuevo.'
    : 'No se pudo guardar el QR. Inténtalo de nuevo.';
}

function QrAction({
  icon,
  label,
  disabled,
  loading,
  onPress,
}: {
  icon: 'share' | 'download';
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { alignItems: 'center', gap: spacing.xs, opacity: disabled && !loading ? 0.55 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.92 }] },
      ]}
    >
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
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <MaterialIcons name={icon} size={22} color={colors.white} />
        )}
      </View>
      <Txt variant="caption" color="rgba(255,255,255,0.7)" style={{ fontFamily: fonts.semibold }}>{label}</Txt>
    </Pressable>
  );
}
