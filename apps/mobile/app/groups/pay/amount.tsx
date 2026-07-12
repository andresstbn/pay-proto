import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Button, Card, parseEuros, Screen, ScreenHeader, Txt } from '../../../src/components/ui';
import { useProtectedUser } from '../../../src/domain/store';
import { colors, radius, spacing, typography } from '../../../src/theme/theme';

export default function GroupPayAmountScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const user = useProtectedUser();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  if (!user) return null;

  const amountInCents = parseEuros(amount);
  const valid = Boolean(groupId && amountInCents > 0);

  return (
    <Screen style={{ padding: 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: spacing.lg, gap: spacing.xl }}>
        <ScreenHeader title="Pago a grupo" />
        <View style={{ gap: spacing.xs }}>
          <Txt variant="display" color={colors.navy900} style={{ fontSize: 28 }}>¿Cuánto quieres pagar?</Txt>
          <Txt variant="body" color={colors.gray500}>Antes de confirmar verás cuántas personas recibirán el reparto.</Txt>
        </View>
        <Card style={{ gap: spacing.sm }}>
          <Txt variant="caption" color={colors.gray500}>Importe (EUR)</Txt>
          <TextInput
            accessibilityLabel="Importe del pago grupal"
            autoFocus
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={colors.gray500}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (valid) router.push({ pathname: '/groups/pay/confirm', params: { groupId, amount: String(amountInCents) } });
            }}
            style={{
              ...typography.display,
              minHeight: 76,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.gray200,
              color: colors.navy900,
              backgroundColor: colors.gray50,
              textAlign: 'center',
            }}
          />
        </Card>
        <View style={{ marginTop: 'auto', gap: spacing.md }}>
          <Button
            title="Revisar reparto"
            disabled={!valid}
            onPress={() => router.push({ pathname: '/groups/pay/confirm', params: { groupId, amount: String(amountInCents) } })}
          />
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
