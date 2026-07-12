import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Txt } from './ui';
import { colors, fonts, spacing } from '../theme/theme';

export function AnimatedLaunchScreen({ ready, onComplete }: { ready: boolean; onComplete: () => void }) {
  const intro = useRef(new Animated.Value(0)).current;
  const outro = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const completed = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: reduceMotion ? 0 : 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [intro, reduceMotion]);

  useEffect(() => {
    if (!ready || completed.current) return;
    completed.current = true;
    Animated.timing(outro, {
      toValue: 0,
      duration: reduceMotion ? 0 : 220,
      delay: reduceMotion ? 0 : 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(onComplete);
  }, [onComplete, outro, ready, reduceMotion]);

  const scale = intro.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const translateY = intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View style={[styles.container, { opacity: outro }]}>
      <View style={styles.glow} />
      <Animated.View style={[styles.brand, { opacity: intro, transform: [{ scale }, { translateY }] }]}>
        <Image source={require('../../assets/brand/ericpay-mark.png')} style={styles.mark} />
        <Txt variant="display" color={colors.white} style={styles.wordmark}>EricPay</Txt>
        <Txt variant="body" color={colors.cyan400} style={styles.tagline}>Tu dinero, en movimiento</Txt>
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
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.blue600,
    opacity: 0.16,
    transform: [{ scaleX: 1.4 }],
  },
  brand: { alignItems: 'center', gap: spacing.sm },
  mark: { width: 132, height: 132, marginBottom: spacing.md },
  wordmark: { fontSize: 36, fontFamily: fonts.extrabold, letterSpacing: -1 },
  tagline: { letterSpacing: 0.4 },
});
