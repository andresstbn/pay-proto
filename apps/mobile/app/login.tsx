import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View, Platform, ActivityIndicator } from 'react-native';
import { Button, Txt } from '../src/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/domain/store';
import { colors, radius, spacing } from '../src/theme/theme';

// Pantalla 2: Login con Firebase Auth.
// Utiliza Google Sign-in real en Web y un fallback de simulación por email en móvil.
export default function Login() {
  const { loginWithGoogle, loginWithEmailSimulated } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const res = await loginWithGoogle();
    setLoading(false);
    if (res.ok) {
      router.replace('/home');
    } else {
      setError(res.error);
    }
  }

  async function handleEmailSimulatedLogin() {
    const trimmed = email.trim();
    if (!trimmed) {
      return setError('Por favor, ingresa un correo electrónico.');
    }
    setLoading(true);
    setError(null);
    const res = await loginWithEmailSimulated(trimmed);
    setLoading(false);
    if (res.ok) {
      router.replace('/home');
    } else {
      setError(res.error);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, padding: spacing.xl, justifyContent: 'center', gap: spacing.xxxl }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Txt variant="display" color={colors.white}>EricPay</Txt>
        <Txt variant="body" color={colors.cyan400}>Pagos por QR</Txt>
      </View>

      <View style={{ gap: spacing.md }}>
        {loading ? (
          <ActivityIndicator color={colors.cyan400} size="large" />
        ) : (
          <>
            {Platform.OS === 'web' ? (
              <Pressable
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.md,
                    backgroundColor: colors.white,
                    borderRadius: radius.pill,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.blue600,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="logo-google" size={16} color={colors.white} />
                </View>
                <Txt variant="subtitle" color={colors.gray900}>Continuar con Google</Txt>
              </Pressable>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Txt variant="caption" color={colors.cyan400} style={{ textAlign: 'center', marginBottom: spacing.xs }}>
                  Simulación de Google Login (Móvil)
                </Txt>
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  placeholder="Introduce tu email de Google"
                  placeholderTextColor={colors.gray500}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.white,
                    color: colors.gray900,
                    borderRadius: radius.card,
                    padding: spacing.md,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: colors.gray200,
                  }}
                />
                <Button title="Iniciar sesión con Google (Simulado)" onPress={handleEmailSimulatedLogin} />
              </View>
            )}

            {error && (
              <Txt variant="caption" color={colors.red500} style={{ textAlign: 'center', marginTop: spacing.xs }}>
                {error}
              </Txt>
            )}
          </>
        )}
      </View>
    </View>
  );
}
