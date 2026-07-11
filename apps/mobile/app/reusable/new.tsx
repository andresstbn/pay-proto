import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Screen, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { colors, radius, spacing } from '../../src/theme/theme';

function parseEuros(text: string): number {
  const value = Number.parseFloat(text.replace(',', '.').trim());
  return Number.isNaN(value) ? 0 : Math.round(value * 100);
}

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.gray200,
  borderRadius: radius.card,
  padding: spacing.md,
  backgroundColor: colors.white,
};

// Pantalla 8 (crear): QR reutilizable con monto definido (SPEC-001 §5, RF-001 §9).
export default function NewReusable() {
  const user = useProtectedUser();
  const { createReusableQr } = useStore();
  const router = useRouter();
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const amountInCents = parseEuros(amountText);

  async function submit() {
    setError(null);
    const result = await createReusableQr({ name, amountInCents, description });
    if (!result.ok) return setError(result.error);
    router.replace({ pathname: '/reusable/[id]', params: { id: result.id } });
  }

  return (
    <Screen style={{ gap: spacing.xl }}>
      <Txt variant="title">Nuevo QR reutilizable</Txt>

      <View style={{ gap: spacing.xs }}>
        <Txt variant="caption" color={colors.gray500}>Nombre</Txt>
        <TextInput value={name} onChangeText={(t) => { setName(t); setError(null); }} placeholder="Café" style={inputStyle as any} />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Txt variant="caption" color={colors.gray500}>Monto (EUR)</Txt>
        <TextInput
          value={amountText}
          onChangeText={(t) => { setAmountText(t); setError(null); }}
          placeholder="3,50"
          keyboardType="decimal-pad"
          style={[inputStyle, { fontSize: 24, fontWeight: '700' }] as any}
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Txt variant="caption" color={colors.gray500}>Descripción (opcional)</Txt>
        <TextInput value={description} onChangeText={setDescription} placeholder="Café americano" style={inputStyle as any} />
      </View>

      {error && <Txt variant="caption" color={colors.red500}>{error}</Txt>}

      <Button title="Crear QR" onPress={submit} disabled={amountInCents <= 0 || !name.trim()} />
    </Screen>
  );
}
