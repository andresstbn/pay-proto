import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, parseEuros, Screen, ScreenHeader, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { colors, radius, spacing } from '../../src/theme/theme';

// Pantalla 10: ingresar monto para un QR personal (SPEC-001 §5, RF-001 §10).
export default function PayAmount() {
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
  const user = useProtectedUser();
  const { users } = useStore();
  const router = useRouter();
  const [amountText, setAmountText] = useState('');
  const [concept, setConcept] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!user) return null;

  const recipient = users[recipientId];
  const amountInCents = parseEuros(amountText);

  if (!recipient) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Txt>Usuario receptor inexistente.</Txt>
        <Button title="Volver al inicio" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  return (
    <Screen style={{ gap: spacing.xl }}>
      <ScreenHeader title={`Pagar a ${recipient.displayName}`} />

      <View style={{ gap: spacing.xs }}>
        <Txt variant="caption" color={colors.gray500}>Monto (EUR)</Txt>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0,00"
          keyboardType="decimal-pad"
          autoFocus
          style={{
            borderWidth: 1,
            borderColor: colors.gray200,
            borderRadius: radius.card,
            padding: spacing.md,
            fontSize: 24,
            fontWeight: '700',
            backgroundColor: colors.white,
          }}
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Txt variant="caption" color={colors.gray500}>Concepto (opcional)</Txt>
        <TextInput
          value={concept}
          onChangeText={setConcept}
          placeholder="Café"
          style={{
            borderWidth: 1,
            borderColor: colors.gray200,
            borderRadius: radius.card,
            padding: spacing.md,
            fontSize: 15,
            backgroundColor: colors.white,
          }}
        />
      </View>

      <Button
        title="Continuar"
        disabled={amountInCents <= 0 || isSubmitting}
        onPress={() => {
          setIsSubmitting(true);
          router.push({
            pathname: '/pay/confirm',
            params: { kind: 'personal', recipientId, amount: String(amountInCents), concept },
          });
          setTimeout(() => setIsSubmitting(false), 1000);
        }}
      />
    </Screen>
  );
}
