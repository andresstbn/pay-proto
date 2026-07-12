import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Button, Card, Screen, ScreenHeader, Txt } from '../../../src/components/ui';
import { useProtectedUser } from '../../../src/domain/store';
import { useGroup } from '../../../src/groups/GroupProvider';
import { colors, fonts, spacing } from '../../../src/theme/theme';

export default function GroupInviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useProtectedUser();
  const router = useRouter();
  const { group, rotateInvite } = useGroup(id);
  const [invite, setInvite] = useState<{ code: string; link: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  async function generate() {
    if (!group || loading) return;
    setLoading(true);
    setError(null);
    const result = await rotateInvite(group.id);
    if (result.ok) setInvite({ code: result.code, link: result.link });
    else setError(result.error);
    setLoading(false);
  }

  if (!group) {
    return (
      <Screen style={{ justifyContent: 'center', gap: spacing.lg }}>
        <Txt>Grupo no disponible.</Txt>
        <Button title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen style={{ gap: spacing.xl }}>
      <ScreenHeader title="Invitar miembros" />
      <View style={{ gap: spacing.xs }}>
        <Txt variant="display" color={colors.navy900} style={{ fontSize: 28 }}>{group.name}</Txt>
        <Txt variant="body" color={colors.gray500}>Genera un código nuevo y compártelo de forma privada.</Txt>
      </View>
      <Card style={{ gap: spacing.lg, alignItems: 'center', paddingVertical: spacing.xxl }}>
        <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="vpn-key" size={28} color={colors.navy900} />
        </View>
        {invite ? (
          <>
            <Txt variant="caption" color={colors.gray500}>CÓDIGO ACTIVO</Txt>
            <Txt variant="display" color={colors.navy900} style={{ letterSpacing: 4, fontFamily: fonts.extrabold }}>{invite.code}</Txt>
            <Button
              title="Compartir invitación"
              style={{ alignSelf: 'stretch' }}
              onPress={() => Share.share({ message: `Únete a ${group.name} en EricPay con el código ${invite.code}: ${invite.link}` })}
            />
            <Button title="Generar otro código" variant="outline" style={{ alignSelf: 'stretch' }} onPress={generate} disabled={loading} />
          </>
        ) : (
          <>
            <Txt variant="body" color={colors.gray500} style={{ textAlign: 'center', lineHeight: 21 }}>
              Al generar uno nuevo, cualquier invitación anterior dejará de funcionar inmediatamente.
            </Txt>
            <Button title={loading ? 'Generando…' : 'Generar invitación'} style={{ alignSelf: 'stretch' }} onPress={generate} disabled={loading} />
          </>
        )}
      </Card>
      {error ? <Txt color={colors.red500} style={{ textAlign: 'center' }}>{error}</Txt> : null}
    </Screen>
  );
}
