import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { NOTIFICATION_STORAGE_KEYS } from './constants';

export interface NotificationPreferences {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  pushEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  hapticsEnabled: true,
  pushEnabled: true,
};

interface NotificationPreferencesValue {
  preferences: NotificationPreferences;
  loaded: boolean;
  updatePreference: <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => void;
  pushStatus: PushRegistrationStatus;
  reportPushStatus: (status: PushRegistrationStatus) => void;
}

export type PushRegistrationStatus = 'idle' | 'registering' | 'ready' | 'denied' | 'unsupported' | 'error';

const NotificationPreferencesContext = createContext<NotificationPreferencesValue | null>(null);

function isStoredPreferences(value: unknown): value is Partial<NotificationPreferences> {
  return typeof value === 'object' && value !== null;
}

export function NotificationPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushRegistrationStatus>('idle');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(NOTIFICATION_STORAGE_KEYS.preferences)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (isStoredPreferences(parsed)) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      })
      .catch(() => {
        // Conservamos valores seguros por defecto si el almacenamiento local falla.
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function updatePreference<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      AsyncStorage.setItem(NOTIFICATION_STORAGE_KEYS.preferences, JSON.stringify(next)).catch(() => {
        // La preferencia se mantiene durante la sesión aunque la persistencia falle.
      });
      return next;
    });
  }

  const value = useMemo(
    () => ({ preferences, loaded, updatePreference, pushStatus, reportPushStatus: setPushStatus }),
    [preferences, loaded, pushStatus],
  );

  return <NotificationPreferencesContext.Provider value={value}>{children}</NotificationPreferencesContext.Provider>;
}

export function useNotificationPreferences() {
  const value = useContext(NotificationPreferencesContext);
  if (!value) throw new Error('useNotificationPreferences debe usarse dentro de NotificationPreferencesProvider.');
  return value;
}
