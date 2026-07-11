import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { Badge, Button, Card, formatEuros, Screen, Txt } from '../../src/components/ui';
import { useProtectedUser, useStore } from '../../src/domain/store';
import { colors, spacing } from '../../src/theme/theme';

// Pantalla 7: listado de QRs reutilizables (SPEC-001 §5, RF-001 §9).
export default function ReusableList() {
  const user = useProtectedUser();
  const { reusableQrs, deactivateReusable } = useStore();
  const router = useRouter();
  if (!user) return null;

  const own = Object.values(reusableQrs)
    .filter((q) => q.ownerId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Screen style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="title">QRs reutilizables</Txt>
        <Button title="Crear" onPress={() => router.push('/reusable/new')} style={{ paddingHorizontal: spacing.lg }} />
      </View>

      {own.length === 0 && <Txt variant="caption" color={colors.gray500}>Todavía no has creado ninguno.</Txt>}

      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        {own.map((q) => (
          <Pressable key={q.id} onPress={() => router.push({ pathname: '/reusable/[id]', params: { id: q.id } })}>
            <Card style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="subtitle">{q.name}</Txt>
                <Badge status={q.status === 'active' ? 'paid' : 'cancelled'} label={q.status === 'active' ? 'Activo' : 'Inactivo'} />
              </View>
              <Txt variant="title">{formatEuros(q.amountInCents)}</Txt>
              {q.status === 'active' && (
                <Button
                  title="Desactivar"
                  variant="outline"
                  onPress={() => deactivateReusable({ qrId: q.id, ownerId: user.id })}
                />
              )}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
