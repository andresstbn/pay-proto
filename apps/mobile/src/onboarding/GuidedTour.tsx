import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../components/ui';
import { colors, fonts, radius, spacing } from '../theme/theme';

const TOUR_STORAGE_KEY = '@ericpay/guided-tour-v1';

const TOUR_STEPS = [
  {
    eyebrow: 'TODO BAJO CONTROL',
    title: 'Tu dinero, en un vistazo',
    description: 'Consulta tu saldo y tus últimos movimientos apenas abras EricPay.',
    icon: 'account-balance-wallet',
  },
  {
    eyebrow: 'RÁPIDO Y SIMPLE',
    title: 'Envía en segundos',
    description: 'Escanea, confirma el importe y mueve dinero sin pasos innecesarios.',
    icon: 'send',
  },
  {
    eyebrow: 'TU QR, TU NEGOCIO',
    title: 'Cobra donde estés',
    description: 'Comparte tu QR personal y recibe pagos al instante, sin efectivo.',
    icon: 'qr-code-2',
  },
  {
    eyebrow: 'LO SABES AL INSTANTE',
    title: 'Confirmación inmediata',
    description: 'Sonido, vibración y una alerta clara cada vez que recibes dinero.',
    icon: 'notifications-active',
  },
] as const;

export function GuidedTour({
  forceVisible = false,
  onClose,
}: {
  forceVisible?: boolean;
  onClose?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const contentProgress = useRef(new Animated.Value(0)).current;
  const completedInSession = useRef(false);
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (forceVisible) {
      setStepIndex(0);
      setVisible(true);
      return () => {
        active = false;
      };
    }
    if (completedInSession.current) return;

    AsyncStorage.getItem(TOUR_STORAGE_KEY)
      .then((completed) => {
        if (active && !completed) setVisible(true);
      })
      .catch(() => {
        // Si el almacenamiento falla, no interrumpimos el acceso al Home.
      });
    return () => {
      active = false;
    };
  }, [forceVisible]);

  const revealStep = useCallback(() => {
    contentProgress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(contentProgress, {
      toValue: 1,
      duration: reduceMotion ? 0 : 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setTransitioning(false));
  }, [contentProgress, reduceMotion]);

  useEffect(() => {
    if (visible) revealStep();
  }, [revealStep, stepIndex, visible]);

  const closeTour = useCallback(() => {
    completedInSession.current = true;
    AsyncStorage.setItem(TOUR_STORAGE_KEY, 'completed').catch(() => undefined);
    setVisible(false);
    setStepIndex(0);
    setTransitioning(false);
    onClose?.();
  }, [onClose]);

  function dismiss() {
    if (transitioning) return;
    setTransitioning(true);
    Animated.timing(contentProgress, {
      toValue: 0,
      duration: reduceMotion ? 0 : 140,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(closeTour);
  }

  function advance() {
    if (transitioning) return;
    if (stepIndex === TOUR_STEPS.length - 1) {
      dismiss();
      return;
    }

    setTransitioning(true);
    Animated.timing(contentProgress, {
      toValue: 0,
      duration: reduceMotion ? 0 : 140,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setStepIndex((current) => current + 1));
  }

  const step = TOUR_STEPS[stepIndex];
  const translateY = contentProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const scale = contentProgress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  return (
    <Modal
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={[
          styles.backdrop,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Txt variant="subtitle" color={colors.white} style={styles.brandLetter}>E</Txt>
          </View>
          <Txt variant="subtitle" color={colors.white} style={styles.brandName}>EricPay</Txt>
          <Pressable
            accessibilityLabel="Omitir recorrido"
            disabled={transitioning}
            hitSlop={8}
            onPress={dismiss}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Txt variant="caption" color={colors.gray200} style={styles.skipText}>Omitir</Txt>
          </Pressable>
        </View>

        <Animated.View
          style={[
            styles.content,
            { opacity: contentProgress, transform: [{ translateY }, { scale }] },
          ]}
        >
          <FeaturePreview stepIndex={stepIndex} icon={step.icon} />
          <View style={styles.copy}>
            <Txt variant="caption" color={colors.cyan400} style={styles.eyebrow}>{step.eyebrow}</Txt>
            <Txt variant="display" color={colors.white} style={styles.title}>{step.title}</Txt>
            <Txt variant="body" color={colors.gray200} style={styles.description}>{step.description}</Txt>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <View
            accessibilityLabel={`Paso ${stepIndex + 1} de ${TOUR_STEPS.length}`}
            accessibilityRole="progressbar"
            style={styles.progress}
          >
            {TOUR_STEPS.map((item, index) => (
              <View
                key={item.title}
                style={[styles.progressDot, index === stepIndex && styles.progressDotActive]}
              />
            ))}
          </View>
          <Pressable
            accessibilityLabel={stepIndex === TOUR_STEPS.length - 1 ? 'Empezar a usar EricPay' : 'Siguiente paso'}
            disabled={transitioning}
            onPress={advance}
            style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
          >
            <Txt variant="subtitle" color={colors.navy900} style={styles.nextText}>
              {stepIndex === TOUR_STEPS.length - 1 ? 'Empezar' : 'Siguiente'}
            </Txt>
            <MaterialIcons name="arrow-forward" size={20} color={colors.navy900} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function FeaturePreview({
  stepIndex,
  icon,
}: {
  stepIndex: number;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.previewShell}>
      <View style={styles.previewGlow} />
      <View style={styles.previewCard}>
        <View style={styles.previewIcon}>
          <MaterialIcons name={icon} size={38} color={colors.white} />
        </View>
        {stepIndex === 0 && (
          <View style={styles.balancePreview}>
            <Txt variant="caption" color={colors.cyan400} style={styles.previewLabel}>SALDO DISPONIBLE</Txt>
            <Txt variant="display" color={colors.white} style={styles.previewAmount}>€1.280,50</Txt>
            <View style={styles.growthChip}>
              <MaterialIcons name="trending-up" size={16} color={colors.green500} />
              <Txt variant="caption" color={colors.white}>Todo al día</Txt>
            </View>
          </View>
        )}
        {stepIndex === 1 && (
          <View style={styles.transferPreview}>
            <View style={styles.transferParty}>
              <View style={styles.senderIcon}>
                <MaterialIcons name="account-circle" size={30} color={colors.blue600} />
              </View>
              <Txt variant="caption" color={colors.gray200} style={styles.partyLabel}>Tú</Txt>
            </View>
            <View style={styles.transferPath}>
              <View style={styles.transferLine} />
              <View style={styles.sendIcon}>
                <MaterialIcons name="send" size={22} color={colors.white} />
              </View>
              <Txt variant="caption" color={colors.cyan400} style={styles.transferAmount}>€25</Txt>
            </View>
            <View style={styles.transferParty}>
              <View style={styles.receiverIcon}>
                <MaterialIcons name="storefront" size={27} color={colors.navy900} />
              </View>
              <Txt variant="caption" color={colors.gray200} style={styles.partyLabel}>Destino</Txt>
            </View>
          </View>
        )}
        {stepIndex === 2 && (
          <View style={styles.qrPreview}>
            <MaterialIcons name="qr-code-2" size={104} color={colors.navy900} />
            <View style={styles.scanLine} />
          </View>
        )}
        {stepIndex === 3 && (
          <View style={styles.notificationPreview}>
            <View style={styles.successIcon}><MaterialIcons name="check" size={22} color={colors.white} /></View>
            <View style={{ flex: 1 }}>
              <Txt variant="caption" color={colors.gray500}>Pago recibido</Txt>
              <Txt variant="subtitle" color={colors.navy900}>+ €45,00</Txt>
            </View>
            <View style={styles.liveDot} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(7,14,40,0.98)',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue600,
    borderWidth: 1,
    borderColor: 'rgba(90,216,240,0.6)',
  },
  brandLetter: { fontFamily: fonts.extrabold },
  brandName: { marginLeft: spacing.sm, fontFamily: fonts.bold },
  skip: { marginLeft: 'auto', paddingVertical: spacing.sm, paddingLeft: spacing.lg },
  skipText: { fontFamily: fonts.semibold },
  pressed: { opacity: 0.65 },
  content: { flex: 1, justifyContent: 'center' },
  previewShell: {
    height: 286,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  previewGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: colors.blue600,
    opacity: 0.2,
  },
  previewCard: {
    width: '100%',
    minHeight: 224,
    borderRadius: 28,
    padding: spacing.xl,
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.navy700,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewIcon: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue600,
  },
  balancePreview: { gap: spacing.sm },
  previewLabel: { fontFamily: fonts.bold, letterSpacing: 1.5 },
  previewAmount: { fontSize: 36 },
  growthChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  transferPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  transferParty: { alignItems: 'center', gap: spacing.sm },
  senderIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: 'rgba(74,107,255,0.28)',
  },
  receiverIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow300,
    borderWidth: 3,
    borderColor: 'rgba(246,217,143,0.24)',
  },
  partyLabel: { fontFamily: fonts.semibold },
  transferPath: { width: 92, height: 84, alignItems: 'center', justifyContent: 'center' },
  transferLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(90,216,240,0.3)' },
  sendIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue600,
    transform: [{ rotate: '-8deg' }],
  },
  transferAmount: {
    position: 'absolute',
    bottom: -2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontFamily: fonts.bold,
    backgroundColor: 'rgba(90,216,240,0.12)',
  },
  qrPreview: {
    width: 144,
    height: 144,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  scanLine: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: 70,
    height: 2,
    backgroundColor: colors.cyan400,
  },
  notificationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.white,
  },
  successIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green500,
  },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.cyan400 },
  copy: { gap: spacing.md },
  eyebrow: { fontFamily: fonts.bold, letterSpacing: 1.8 },
  title: { fontSize: 34, lineHeight: 39, letterSpacing: -0.8 },
  description: { maxWidth: 330, lineHeight: 23, opacity: 0.82 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.24)' },
  progressDotActive: { width: 25, backgroundColor: colors.cyan400 },
  next: {
    minWidth: 146,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.cyan400,
  },
  nextPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  nextText: { fontFamily: fonts.bold },
});
