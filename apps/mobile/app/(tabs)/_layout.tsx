import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Easing } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { colors, fonts } from '../../src/theme/theme';

export default function TabsLayout() {
  const reduceMotion = useReducedMotion();

  return (
    <Tabs
      screenOptions={{
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
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gray200,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          height: 64,
          paddingTop: 6,
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
