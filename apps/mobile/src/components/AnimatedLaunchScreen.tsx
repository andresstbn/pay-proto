import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Txt } from './ui';
import { colors, fonts, radius, spacing } from '../theme/theme';

const MINIMUM_SCENE_DURATION_MS = 900;

export function AnimatedLaunchScreen({ ready, onComplete }: { ready: boolean; onComplete: () => void }) {
  const reduceMotion = useReducedMotion();
  const intro = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const payment = useRef(new Animated.Value(0)).current;
  const outro = useRef(new Animated.Value(1)).current;
  const completed = useRef(false);
  const [minimumElapsed, setMinimumElapsed] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      intro.setValue(1);
      scan.setValue(1);
      payment.setValue(1);
      setMinimumElapsed(true);
      return;
    }

    const introAnimation = Animated.timing(intro, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const scanAnimation = Animated.sequence([
      Animated.delay(120),
      Animated.timing(scan, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(payment, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const timer = setTimeout(() => setMinimumElapsed(true), MINIMUM_SCENE_DURATION_MS);

    introAnimation.start();
    scanAnimation.start();
    return () => {
      clearTimeout(timer);
      introAnimation.stop();
      scanAnimation.stop();
    };
  }, [intro, payment, reduceMotion, scan]);

  useEffect(() => {
    if (!ready || !minimumElapsed || completed.current) return;
    completed.current = true;
    Animated.timing(outro, {
      toValue: 0,
      duration: reduceMotion ? 0 : 180,
      delay: reduceMotion ? 0 : 120,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(onComplete);
  }, [minimumElapsed, onComplete, outro, ready, reduceMotion]);

  const brandScale = intro.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const brandTranslateY = intro.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const scanTranslateY = scan.interpolate({ inputRange: [0, 1], outputRange: [-48, 48] });
  const scanOpacity = scan.interpolate({
    inputRange: [0, 0.08, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });
  const paymentTranslateY = payment.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Animated.View style={[styles.container, { opacity: outro }]}>
      <Animated.View
        style={[
          styles.brand,
          { opacity: intro, transform: [{ scale: brandScale }, { translateY: brandTranslateY }] },
        ]}
      >
        <View style={styles.scannerStage}>
          <View style={styles.scannerHalo} />
          <View style={styles.qrCard}>
            <View style={[styles.finder, styles.finderTopLeft]}><View style={styles.finderCore} /></View>
            <View style={[styles.finder, styles.finderTopRight]}><View style={styles.finderCore} /></View>
            <View style={[styles.finder, styles.finderBottomLeft]}><View style={styles.finderCore} /></View>
            <View style={[styles.qrCell, styles.cellOne]} />
            <View style={[styles.qrCell, styles.cellTwo]} />
            <View style={[styles.qrCell, styles.cellThree]} />
            <View style={[styles.qrCell, styles.cellFour]} />
            <View style={[styles.qrCell, styles.cellFive]} />
            <Animated.View
              style={[
                styles.scanBeam,
                { opacity: scanOpacity, transform: [{ translateY: scanTranslateY }] },
              ]}
            />
          </View>
          <Animated.View
            style={[
              styles.paymentChip,
              { opacity: payment, transform: [{ translateY: paymentTranslateY }] },
            ]}
          >
            <View style={styles.checkCircle}>
              <Txt variant="caption" color={colors.white} style={styles.check}>✓</Txt>
            </View>
            <Txt variant="caption" color={colors.navy900} style={styles.paymentText}>Pago confirmado</Txt>
          </Animated.View>
        </View>

        <Txt variant="display" color={colors.white} style={styles.wordmark}>EricPay</Txt>
        <Txt variant="body" color={colors.cyan400} style={styles.tagline}>Escanea. Paga. Listo.</Txt>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy900,
    overflow: 'hidden',
  },
  brand: { alignItems: 'center' },
  scannerStage: {
    width: 188,
    height: 188,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  scannerHalo: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: colors.blue600,
    opacity: 0.16,
  },
  qrCard: {
    width: 132,
    height: 132,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 5,
    borderColor: 'rgba(90,216,240,0.8)',
  },
  finder: {
    position: 'absolute',
    width: 30,
    height: 30,
    padding: 5,
    borderWidth: 4,
    borderRadius: 5,
    borderColor: colors.navy900,
  },
  finderCore: { flex: 1, borderRadius: 2, backgroundColor: colors.navy900 },
  finderTopLeft: { left: 16, top: 16 },
  finderTopRight: { right: 16, top: 16 },
  finderBottomLeft: { left: 16, bottom: 16 },
  qrCell: { position: 'absolute', width: 10, height: 10, borderRadius: 2, backgroundColor: colors.navy900 },
  cellOne: { left: 58, top: 18 },
  cellTwo: { left: 58, top: 36 },
  cellThree: { right: 18, top: 58 },
  cellFour: { left: 58, bottom: 18 },
  cellFive: { right: 34, bottom: 30 },
  scanBeam: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.cyan400,
  },
  paymentChip: {
    position: 'absolute',
    bottom: 0,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green500,
  },
  check: { fontFamily: fonts.bold, lineHeight: 17 },
  paymentText: { fontFamily: fonts.bold },
  wordmark: { fontSize: 38, fontFamily: fonts.extrabold, letterSpacing: -1.2 },
  tagline: { marginTop: spacing.sm, fontFamily: fonts.semibold, letterSpacing: 0.3 },
});
