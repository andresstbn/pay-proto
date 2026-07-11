import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View, Platform, ActivityIndicator } from 'react-native';
import { Button, Txt } from '../src/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/domain/store';
import { colors, radius, spacing } from '../src/theme/theme';

const inputStyle = {
  backgroundColor: colors.white,
  color: colors.gray900,
  borderRadius: radius.card,
  padding: spacing.md,
  fontSize: 15,
  borderWidth: 1,
  borderColor: colors.gray200,
} as const;

// Pantalla 2: Login con Firebase Auth.
// Google Sign-in en Web; email y contraseña en móvil (registra la cuenta si no existe).
export default function Login() {
  const { loginWithGoogle, loginWithEmail } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    if (Platform.OS !== 'web' && !email.trim()) {
      return setError('Escribe tu email para continuar con Google.');
    }
    setLoading(true);
    setError(null);
    const res = await loginWithGoogle(email);
    setLoading(false);
    if (res.ok) {
      router.replace('/home');
    } else {
      setError(res.error);
    }
  }

  async function handleEmailLogin() {
    setLoading(true);
    setError(null);
    const res = await loginWithEmail(email, password);
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
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              placeholder="Correo electrónico"
              placeholderTextColor={colors.gray500}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={inputStyle}
            />
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="Contraseña"
              placeholderTextColor={colors.gray500}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              style={inputStyle}
            />
            <Button title="Entrar" onPress={handleEmailLogin} />
            <Txt variant="caption" color={colors.gray500} style={{ textAlign: 'center' }}>
              Si no tienes cuenta, se creará automáticamente.
            </Txt>

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
