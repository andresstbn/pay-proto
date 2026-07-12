import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { formatEuros, Txt } from '../components/ui';
import { useStore } from '../domain/store';
import { Transaction } from '../domain/types';
import { colors, radius, shadow, spacing } from '../theme/theme';
import { incomingCompletedTransactions } from './incoming-transfer-policy';
import { useNotificationPreferences } from './notification-preferences';

interface TransferNotice {
  transaction: Transaction;
  payerName: string;
}

export function NotificationExperience({ children }: { children: ReactNode }) {
  const { currentUserId, transactions, users, receivedTransactionsReady } = useStore();
  const { preferences } = useNotificationPreferences();
  const player = useAudioPlayer(require('../../assets/sounds/ericpay-received.wav'));
  const knownIds = useRef(new Set<string>());
  const initialized = useRef(false);
  const sessionUserId = useRef<string | null>(null);
  const queue = useRef<TransferNotice[]>([]);
  const [notice, setNotice] = useState<TransferNotice | null>(null);

  const showNext = useCallback(() => {
    setNotice((current) => current ?? queue.current.shift() ?? null);
  }, []);

  const enqueue = useCallback((transaction: Transaction) => {
    queue.current.push({
      transaction,
      payerName: users[transaction.payerId]?.displayName ?? 'Alguien',
    });
    showNext();
  }, [showNext, users]);

  useEffect(() => {
    if (sessionUserId.current !== currentUserId) {
      sessionUserId.current = currentUserId;
      initialized.current = false;
      knownIds.current.clear();
      queue.current = [];
      setNotice(null);
    }
    if (!currentUserId || !receivedTransactionsReady) return;

    if (!initialized.current) {
      transactions.forEach((transaction) => knownIds.current.add(transaction.id));
      initialized.current = true;
      return;
    }

    const incoming = incomingCompletedTransactions(transactions, currentUserId, knownIds.current);
    transactions.forEach((transaction) => knownIds.current.add(transaction.id));
    incoming.reverse().forEach(enqueue);
  }, [currentUserId, enqueue, receivedTransactionsReady, transactions]);

  useEffect(() => {
    if (!notice) return;
    if (preferences.soundEnabled) {
      player.seekTo(0).then(() => player.play()).catch(() => undefined);
    }
    if (preferences.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, [notice, player, preferences.hapticsEnabled, preferences.soundEnabled]);

  return (
    <View style={styles.root}>
      {children}
      {notice ? (
        <TransferBanner
          notice={notice}
          onDismiss={() => {
            setNotice(null);
            requestAnimationFrame(showNext);
          }}
        />
      ) : null}
    </View>
  );
}

function TransferBanner({ notice, onDismiss }: { notice: TransferNotice; onDismiss: () => void }) {
  const router = useRouter();
  const translateY = useRef(new Animated.Value(-140)).current;
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.timing(translateY, { toValue: -140, duration: 160, useNativeDriver: true }).start(onDismiss);
  }, [onDismiss, translateY]);

  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 190, useNativeDriver: true }).start();
    const timer = setTimeout(dismiss, 4200);
    return () => clearTimeout(timer);
  }, [dismiss, translateY]);

  return (
    <Animated.View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={[styles.bannerWrap, { transform: [{ translateY }] }]}
    >
      <Pressable
        style={styles.banner}
        onPress={() => {
          router.push('/history');
          dismiss();
        }}
      >
        <View style={styles.badge}><Txt variant="title" color={colors.white}>E</Txt></View>
        <View style={styles.bannerCopy}>
          <Txt variant="caption" color={colors.cyan400}>TRANSFERENCIA RECIBIDA</Txt>
          <Txt variant="subtitle" color={colors.white}>{formatEuros(notice.transaction.amountInCents)}</Txt>
          <Txt variant="caption" color={colors.gray200}>De {notice.payerName}</Txt>
        </View>
        <Txt variant="caption" color={colors.cyan400}>Ver</Txt>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bannerWrap: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  banner: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(90,216,240,0.35)',
    backgroundColor: colors.navy700,
    ...shadow.card,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue600,
  },
  bannerCopy: { flex: 1, gap: 1 },
});
