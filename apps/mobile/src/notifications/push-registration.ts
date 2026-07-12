import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import { functions } from '../domain/firebase';
import { NOTIFICATION_CALLABLES, NOTIFICATION_CHANNELS, NOTIFICATION_SOUNDS } from './constants';
import { PushRegistrationStatus } from './notification-preferences';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.incomingTransfers, {
    name: 'Transferencias recibidas',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: '#5AD8F0',
    sound: NOTIFICATION_SOUNDS.incomingTransfer,
  });
}

export async function registerForPushNotifications(soundEnabled: boolean): Promise<PushRegistrationStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';

  try {
    await configureAndroidChannel();
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return 'denied';

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return 'error';

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const register = httpsCallable(functions, NOTIFICATION_CALLABLES.registerPushToken);
    await register({ token, platform: Platform.OS, soundEnabled });
    return 'ready';
  } catch {
    return 'error';
  }
}

export async function disablePushNotifications(): Promise<void> {
  const disable = httpsCallable(functions, NOTIFICATION_CALLABLES.setPushEnabled);
  await disable({ enabled: false });
}
