import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, parseEuros, Screen, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { colors, radius, spacing } from '../../src/theme/theme';

// Pantalla 4: crear cobro puntual (SPEC-001 §5, RF-001 §7).
export default function NewCharge() {
  const user = useProtectedUser();
  const { createOneTimeRequest } = useStore();
  const router = useRouter();
  const [amountText, setAmountText] = useState('');
  const [concept, setConcept] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!user) return null;

  const amountInCents = parseEuros(amountText);

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await createOneTimeRequest({ amountInCents, concept });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace({ pathname: '/charge/[id]', params: { id: result.id } });
  }

  return (
    <Screen style={{ gap: spacing.xl }}>
      <Txt variant="title">Cobrar</Txt>

      <View style={{ gap: spacing.xs }}>
        <Txt variant="caption" color={colors.gray500}>Monto (EUR)</Txt>
        <TextInput
          value={amountText}
          onChangeText={(t) => { setAmountText(t); setError(null); }}
          placeholder="0,00"
          keyboardType="decimal-pad"
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
          placeholder="Almuerzo"
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

      {error && <Txt variant="caption" color={colors.red500}>{error}</Txt>}

      <Button title={loading ? 'Generando...' : 'Generar QR'} onPress={submit} disabled={loading || amountInCents <= 0} />
    </Screen>
  );
}
