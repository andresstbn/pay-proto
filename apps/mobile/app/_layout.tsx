import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { StoreProvider } from '../src/domain/store';
import { NotificationExperience } from '../src/notifications/NotificationExperience';
import { NotificationPreferencesProvider } from '../src/notifications/notification-preferences';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 180, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <NotificationPreferencesProvider>
      <StoreProvider>
        <NotificationExperience>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </NotificationExperience>
      </StoreProvider>
    </NotificationPreferencesProvider>
  );
}
