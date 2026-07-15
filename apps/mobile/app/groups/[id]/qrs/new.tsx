import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Button, Card, parseEuros, Screen, ScreenHeader, Txt } from '../../../../src/components/ui';
import { useProtectedUser } from '../../../../src/domain/store';
import { GROUP_LIMITS } from '../../../../src/groups/constants';
import { useGroup } from '../../../../src/groups/GroupProvider';
import { colors, radius, spacing, typography } from '../../../../src/theme/theme';

export default function NewGroupQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useProtectedUser();
  const router = useRouter();
  const { group, createGroupQr } = useGroup(id);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const amountInCents = parseEuros(amount);
  const valid = Boolean(group && name.trim().length >= 2 && amountInCents > 0 && concept.length <= GROUP_LIMITS.MAX_CONCEPT_LENGTH);

  async function submit() {
    if (!group || !valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await createGroupQr({ groupId: group.id, name: name.trim(), concept: concept.trim(), amountInCents });
    if (result.ok) router.back();
    else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Nuevo QR fijo" />
        <View style={{ gap: spacing.xs }}>
          <Txt variant="display" color={colors.brown700} style={{ fontSize: 28 }}>Un importe, todos los cobros</Txt>
          <Txt variant="body" color={colors.gray500}>Este QR seguirá activo hasta que un administrador lo desactive.</Txt>
        </View>
        <Card style={{ gap: spacing.lg }}>
          <Field label="Nombre">
            <TextInput accessibilityLabel="Nombre del QR" autoFocus value={name} onChangeText={setName} maxLength={60} placeholder="Menú del día" placeholderTextColor={colors.gray500} style={inputStyle} />
          </Field>
          <Field label="Importe (EUR)">
            <TextInput accessibilityLabel="Importe del QR" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.gray500} style={[inputStyle, { fontSize: 24 }]} />
          </Field>
          <Field label="Concepto (opcional)">
            <TextInput accessibilityLabel="Concepto del QR" value={concept} onChangeText={setConcept} maxLength={GROUP_LIMITS.MAX_CONCEPT_LENGTH} placeholder="Comida y bebida" placeholderTextColor={colors.gray500} style={inputStyle} />
          </Field>
        </Card>
        {error ? <Txt color={colors.red500} style={{ textAlign: 'center' }}>{error}</Txt> : null}
        <Button title={submitting ? 'Creando…' : 'Crear QR fijo'} onPress={submit} disabled={!valid || submitting} />
        <Button title="Cancelar" variant="outline" onPress={() => router.back()} disabled={submitting} />
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: spacing.xs }}><Txt variant="caption" color={colors.gray500}>{label}</Txt>{children}</View>;
}

const inputStyle = {
  ...typography.body,
  minHeight: 52,
  paddingHorizontal: spacing.md,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: colors.gray200,
  color: colors.gray900,
  backgroundColor: colors.gray50,
};
