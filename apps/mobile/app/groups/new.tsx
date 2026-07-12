import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Button, Card, Screen, ScreenHeader, Txt } from '../../src/components/ui';
import { useProtectedUser } from '../../src/domain/store';
import { GROUP_LIMITS } from '../../src/groups/constants';
import { useGroups } from '../../src/groups/GroupProvider';
import { colors, radius, spacing, typography } from '../../src/theme/theme';

export default function CreateGroupScreen() {
  const user = useProtectedUser();
  const router = useRouter();
  const { createGroup } = useGroups();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const cleanName = name.trim();
  const valid = cleanName.length >= 2 && cleanName.length <= GROUP_LIMITS.MAX_NAME_LENGTH;

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await createGroup(cleanName);
    if (result.ok) router.replace(`/groups/${result.id}`);
    else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: spacing.lg, gap: spacing.xl }}
      >
        <ScreenHeader title="Crear grupo" />
        <View style={{ gap: spacing.xs }}>
          <Txt variant="display" color={colors.navy900} style={{ fontSize: 28 }}>Cobrar juntos, sin cuentas</Txt>
          <Txt variant="body" color={colors.gray500} style={{ lineHeight: 22 }}>
            Cada ingreso se dividirá entre las personas que estén activas en ese momento.
          </Txt>
        </View>
        <Card style={{ gap: spacing.sm }}>
          <Txt variant="caption" color={colors.gray500}>Nombre del grupo</Txt>
          <TextInput
            accessibilityLabel="Nombre del grupo"
            autoFocus
            value={name}
            onChangeText={setName}
            maxLength={GROUP_LIMITS.MAX_NAME_LENGTH}
            placeholder="Por ejemplo, Equipo terraza"
            placeholderTextColor={colors.gray500}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={{
              ...typography.body,
              minHeight: 52,
              paddingHorizontal: spacing.md,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: error ? colors.red500 : colors.gray200,
              color: colors.gray900,
              backgroundColor: colors.gray50,
            }}
          />
          <Txt variant="caption" color={colors.gray500}>{cleanName.length}/{GROUP_LIMITS.MAX_NAME_LENGTH} caracteres</Txt>
        </Card>
        {error ? <Txt color={colors.red500} style={{ textAlign: 'center' }}>{error}</Txt> : null}
        <View style={{ marginTop: 'auto', gap: spacing.md }}>
          <Button title={submitting ? 'Creando…' : 'Crear grupo'} onPress={submit} disabled={!valid || submitting} />
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} disabled={submitting} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
