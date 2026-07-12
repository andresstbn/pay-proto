import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Easing, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { colors, fonts } from '../../src/theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // Oculta el header por defecto en todas las pestañas. Cada pantalla lo gestiona si lo necesita.
        headerShown: false,
        animation: reduceMotion ? 'none' : 'shift',
        transitionSpec: {
          animation: 'timing',
          config: { duration: reduceMotion ? 0 : 220, easing: Easing.out(Easing.cubic) },
        },
        sceneStyle: { backgroundColor: colors.gray50 },
        tabBarActiveTintColor: colors.blue600,
        tabBarInactiveTintColor: colors.gray500,
        tabBarLabelStyle: { fontSize: 12, fontFamily: fonts.semibold },
        // Estilo de la barra de pestañas
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gray200,
          // Ajuste para la barra de navegación de Android
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Escanear',
          tabBarIcon: ({ color }) => <MaterialIcons name="qr-code-scanner" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="personal"
        options={{
          title: 'QR Personal',
          tabBarIcon: ({ color }) => <MaterialIcons name="qr-code" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color }) => <MaterialIcons name="history" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ color }) => <MaterialIcons name="groups" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
