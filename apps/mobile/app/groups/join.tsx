import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Button, Card, Screen, ScreenHeader, Txt } from '../../src/components/ui';
import { useProtectedUser } from '../../src/domain/store';
import { useGroups } from '../../src/groups/GroupProvider';
import { groupJoinReturnTo, normalizeGroupInviteCode } from '../../src/groups/return-to';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/theme';

export default function JoinGroupScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const user = useProtectedUser(groupJoinReturnTo(params.code ?? '') ?? undefined);
  const router = useRouter();
  const { joinGroup } = useGroups();
  const [code, setCode] = useState(() => normalizeGroupInviteCode(params.code ?? ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  async function submit() {
    if (code.length !== 24 || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await joinGroup(code);
    if (result.ok) router.replace(`/groups/${result.id}`);
    else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: spacing.lg, gap: spacing.xl }}>
        <ScreenHeader title="Entrar a un grupo" />
        <View style={{ gap: spacing.xs }}>
          <Txt variant="display" color={colors.brown700} style={{ fontSize: 28 }}>Usa tu invitación</Txt>
          <Txt variant="body" color={colors.gray500}>Escribe el código que te ha compartido un administrador.</Txt>
        </View>
        <Card style={{ gap: spacing.sm }}>
          <Txt variant="caption" color={colors.gray500}>Código de invitación</Txt>
          <TextInput
            accessibilityLabel="Código de invitación"
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(value) => setCode(normalizeGroupInviteCode(value))}
            placeholder="ABCD2345EFGH6789JKLMNPQR"
            placeholderTextColor={colors.gray500}
            returnKeyType="go"
            onSubmitEditing={submit}
            style={{
              ...typography.title,
              minHeight: 58,
              paddingHorizontal: spacing.md,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: error ? colors.red500 : colors.gray200,
              color: colors.brown700,
              backgroundColor: colors.gray50,
              textAlign: 'center',
              letterSpacing: 3,
              fontFamily: fonts.bold,
            }}
          />
        </Card>
        {error ? <Txt color={colors.red500} style={{ textAlign: 'center' }}>{error}</Txt> : null}
        <View style={{ marginTop: 'auto', gap: spacing.md }}>
          <Button title={submitting ? 'Entrando…' : 'Entrar al grupo'} onPress={submit} disabled={code.length !== 24 || submitting} />
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} disabled={submitting} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
