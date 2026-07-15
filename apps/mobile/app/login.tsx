import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AuthResult,
  SocialProvider,
  pendingLinkSummary,
  providerLabel,
  signInWithEmail,
  useSocialLogin,
} from '../src/auth';
import { AppleSignInButton } from '../src/auth/apple-sign-in-button';
import { Txt } from '../src/components/ui';
import { safeGroupJoinReturnTarget } from '../src/groups/return-to';
import { colors, fonts, radius, shadow, spacing } from '../src/theme/theme';

type AuthAction = 'email' | SocialProvider;
type Feedback = { message: string; tone: 'error' | 'info' };

const SOCIAL_BUTTONS: Array<{
  provider: SocialProvider;
  icon: 'logo-google' | 'logo-facebook' | 'logo-apple';
  backgroundColor: string;
  foregroundColor: string;
  borderColor: string;
}> = [
  {
    provider: 'google',
    icon: 'logo-google',
    backgroundColor: colors.white,
    foregroundColor: colors.gray900,
    borderColor: colors.gray200,
  },
  {
    provider: 'facebook',
    icon: 'logo-facebook',
    backgroundColor: '#1877F2', // azul de marca de Facebook, no un token del tema
    foregroundColor: colors.white,
    borderColor: '#1877F2',
  },
  {
    provider: 'apple',
    icon: 'logo-apple',
    backgroundColor: colors.gray900,
    foregroundColor: colors.white,
    borderColor: colors.gray900,
  },
];

export default function Login() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const socialLogin = useSocialLogin();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const initialPendingLink = pendingLinkSummary();
  const [email, setEmail] = useState(initialPendingLink?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeAction, setActiveAction] = useState<AuthAction | null>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(
    initialPendingLink
      ? {
          tone: 'info',
          message: `Entra con ${initialPendingLink.email} para vincular ${providerLabel(initialPendingLink.provider)}.`,
        }
      : null,
  );

  const busy = activeAction !== null;
  const compact = width < 390;
  const visibleSocialButtons = SOCIAL_BUTTONS.filter(
    ({ provider }) => provider !== 'apple' || Platform.OS === 'web',
  );

  function handleResult(result: AuthResult) {
    if (result.ok) {
      const target = safeGroupJoinReturnTarget(returnTo);
      if (target) router.replace({ pathname: target.pathname, params: { code: target.code } });
      else router.replace('/home');
      return;
    }

    if (result.pendingLink) setEmail(result.pendingLink.email);
    setFeedback({
      message: result.message,
      tone: result.code === 'cancelled' ? 'info' : 'error',
    });
  }

  async function handleSocialLogin(provider: SocialProvider) {
    if (busy) return;
    setActiveAction(provider);
    setFeedback(null);
    try {
      handleResult(await socialLogin.signIn(provider));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleEmailLogin() {
    if (busy) return;
    setActiveAction('email');
    setFeedback(null);
    try {
      handleResult(await signInWithEmail(email, password));
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <LinearGradient
      colors={[colors.brown700, colors.orange500]}
      locations={[0, 1]}
      style={styles.background}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoider}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: height,
              paddingTop: Math.max(insets.top + spacing.lg, spacing.xxl),
              paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xxl),
              paddingHorizontal: compact ? spacing.lg : spacing.xl,
            },
          ]}
        >
          <View style={styles.pageWidth}>
            <View style={styles.brandBlock}>
              <View style={styles.markShell}>
                <Image
                  accessibilityIgnoresInvertColors
                  source={require('../assets/brand/propi-mark.png')}
                  style={styles.mark}
                />
              </View>
              <View style={styles.wordmarkRow}>
                <Txt variant="display" color={colors.white} style={styles.wordmark}>Propi</Txt>
              </View>
              <Txt variant="body" color={colors.peach100} style={styles.tagline}>
                Tu dinero, a un toque de distancia
              </Txt>
            </View>

            <View style={[styles.card, compact && styles.cardCompact]}>
              <View style={styles.cardHeading}>
                <Txt variant="title" color={colors.brown700} style={styles.cardTitle}>Entra en segundos</Txt>
                <Txt variant="body" color={colors.gray500} style={styles.cardSubtitle}>
                  Entra con tu correo y contraseña. También puedes usar tu cuenta favorita.
                </Txt>
              </View>

              <View style={styles.form}>
                <View
                  style={[
                    styles.inputShell,
                    focusedField === 'email' && styles.inputShellFocused,
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={colors.gray500} />
                  <TextInput
                    accessibilityLabel="Correo electrónico"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!busy}
                    keyboardType="email-address"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(value) => {
                      setEmail(value);
                      setFeedback(null);
                    }}
                    onFocus={() => setFocusedField('email')}
                    placeholder="Correo electrónico"
                    placeholderTextColor={colors.gray500}
                    returnKeyType="next"
                    style={styles.input}
                    textContentType="emailAddress"
                    value={email}
                  />
                </View>

                <View
                  style={[
                    styles.inputShell,
                    focusedField === 'password' && styles.inputShellFocused,
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={colors.gray500} />
                  <TextInput
                    accessibilityLabel="Contraseña"
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!busy}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(value) => {
                      setPassword(value);
                      setFeedback(null);
                    }}
                    onFocus={() => setFocusedField('password')}
                    onSubmitEditing={handleEmailLogin}
                    placeholder="Contraseña"
                    placeholderTextColor={colors.gray500}
                    returnKeyType="go"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    textContentType="password"
                    value={password}
                  />
                  <Pressable
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    accessibilityRole="button"
                    disabled={busy}
                    hitSlop={10}
                    onPress={() => setShowPassword((visible) => !visible)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={21}
                      color={colors.gray500}
                    />
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={handleEmailLogin}
                  style={({ pressed }) => [
                    styles.emailButton,
                    pressed && !busy && styles.buttonPressed,
                    busy && styles.buttonDisabled,
                  ]}
                >
                  {activeAction === 'email' ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Txt variant="subtitle" color={colors.white}>
                        {pendingLinkSummary() ? 'Entrar y vincular' : 'Entrar con email'}
                      </Txt>
                      <Ionicons name="arrow-forward" size={20} color={colors.white} />
                    </>
                  )}
                </Pressable>

                <Txt variant="caption" color={colors.gray500} style={styles.autoCreateHint}>
                  Si todavía no tienes cuenta, la crearemos automáticamente.
                </Txt>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Txt variant="caption" color={colors.gray500}>o continúa con</Txt>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialStack}>
                {visibleSocialButtons.map((button) => (
                  <SocialButton
                    key={button.provider}
                    {...button}
                    disabled={busy}
                    loading={activeAction === button.provider}
                    onPress={() => handleSocialLogin(button.provider)}
                  />
                ))}
                <AppleSignInButton
                  disabled={busy}
                  loading={activeAction === 'apple'}
                  onPress={() => handleSocialLogin('apple')}
                />
              </View>

              {feedback ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.feedback,
                    feedback.tone === 'info' ? styles.feedbackInfo : styles.feedbackError,
                  ]}
                >
                  <Ionicons
                    name={feedback.tone === 'info' ? 'information-circle-outline' : 'alert-circle-outline'}
                    size={20}
                    color={feedback.tone === 'info' ? colors.brown700 : colors.red500}
                  />
                  <Txt
                    variant="caption"
                    color={feedback.tone === 'info' ? colors.brown700 : colors.red500}
                    style={styles.feedbackText}
                  >
                    {feedback.message}
                  </Txt>
                </View>
              ) : null}
            </View>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.orange400} />
              <Txt variant="caption" color={colors.white} style={styles.securityText}>
                Pagos protegidos y cifrados
              </Txt>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function SocialButton({
  provider,
  icon,
  backgroundColor,
  foregroundColor,
  borderColor,
  disabled,
  loading,
  onPress,
}: {
  provider: SocialProvider;
  icon: 'logo-google' | 'logo-facebook' | 'logo-apple';
  backgroundColor: string;
  foregroundColor: string;
  borderColor: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Continuar con ${providerLabel(provider)}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        { backgroundColor, borderColor },
        pressed && !disabled && styles.buttonPressed,
        disabled && !loading && styles.buttonDisabled,
      ]}
    >
      <View style={styles.socialIconSlot}>
        {loading ? (
          <ActivityIndicator color={foregroundColor} size="small" />
        ) : (
          <Ionicons name={icon} size={21} color={foregroundColor} />
        )}
      </View>
      <Txt variant="subtitle" color={foregroundColor} style={styles.socialButtonLabel}>
        Continuar con {providerLabel(provider)}
      </Txt>
      <View style={styles.socialIconSlot} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageWidth: {
    width: '100%',
    maxWidth: 480,
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  markShell: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.orange400,
    borderRadius: 38,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  mark: {
    height: 68,
    width: 68,
  },
  wordmarkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wordmark: {
    fontFamily: fonts.extrabold,
    fontSize: 38,
    letterSpacing: -1.2,
  },
  tagline: {
    textAlign: 'center',
  },
  card: {
    ...shadow.card,
    backgroundColor: colors.white,
    borderRadius: 24,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  cardCompact: {
    paddingHorizontal: spacing.lg,
  },
  cardHeading: {
    gap: spacing.xs,
  },
  cardTitle: {
    textAlign: 'center',
  },
  cardSubtitle: {
    lineHeight: 21,
    textAlign: 'center',
  },
  socialStack: {
    gap: spacing.sm,
  },
  socialButton: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  socialButtonLabel: {
    flex: 1,
    fontSize: 15,
    textAlign: 'center',
  },
  socialIconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  dividerLine: {
    backgroundColor: colors.gray200,
    flex: 1,
    height: 1,
  },
  form: {
    gap: spacing.md,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderColor: colors.gray200,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  inputShellFocused: {
    borderColor: colors.brown700,
    borderWidth: 2,
    paddingHorizontal: spacing.md - 1,
  },
  input: {
    color: colors.gray900,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  emailButton: {
    alignItems: 'center',
    backgroundColor: colors.brown700,
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  autoCreateHint: {
    lineHeight: 18,
    textAlign: 'center',
  },
  feedback: {
    alignItems: 'flex-start',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  feedbackInfo: {
    backgroundColor: colors.gray50,
    borderColor: colors.brown500,
  },
  feedbackError: {
    backgroundColor: colors.gray50,
    borderColor: colors.red500,
  },
  feedbackText: {
    flex: 1,
    lineHeight: 18,
  },
  securityNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  securityText: {
    opacity: 0.82,
    textAlign: 'center',
  },
});
