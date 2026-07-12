import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
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

export default function RootLayout() {
  const reduceMotion = useReducedMotion();
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
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reduceMotion ? 'none' : 'fade_from_bottom',
              animationDuration: reduceMotion ? 0 : 260,
              animationTypeForReplace: 'push',
              gestureEnabled: true,
            }}
          />
        </NotificationExperience>
      </StoreProvider>
    </NotificationPreferencesProvider>
  );
}
