import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { BrandHeader, Card, Txt } from '../../src/components/ui';
import { useProtectedUser } from '../../src/domain/store';
import { GROUP_ROLE, GROUP_STATUS } from '../../src/groups/constants';
import { GroupMark, GroupState, RoleBadge } from '../../src/groups/components';
import { groupRole, useGroups } from '../../src/groups/GroupProvider';
import { colors, fonts, spacing } from '../../src/theme/theme';

export default function GroupsTab() {
  const user = useProtectedUser();
  const router = useRouter();
  const { groups, loading, error, retry, currentUserId } = useGroups();
  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BrandHeader user={user} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl }}>
        <View style={{ gap: spacing.xs }}>
          <Txt variant="display" color={colors.brown700} style={{ fontSize: 28 }}>Tus grupos</Txt>
          <Txt variant="body" color={colors.gray500}>Cobra en equipo y reparte cada ingreso automáticamente.</Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <QuickAction icon="group-add" label="Crear grupo" onPress={() => router.push('/groups/new')} />
          <QuickAction icon="vpn-key" label="Usar código" onPress={() => router.push('/groups/join')} />
        </View>

        {loading ? (
          <GroupState loading icon="groups" title="Cargando grupos" description="Estamos preparando tus equipos." />
        ) : error ? (
          <GroupState icon="cloud-off" title="No pudimos cargar tus grupos" description={error} actionTitle="Reintentar" onAction={retry} />
        ) : groups.length === 0 ? (
          <GroupState
            icon="groups"
            title="Tu primer grupo empieza aquí"
            description="Crea uno o entra con un código para repartir ingresos entre sus miembros activos."
            actionTitle="Crear grupo"
            onAction={() => router.push('/groups/new')}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {groups.map((group) => {
              const role = groupRole(group, currentUserId);
              const isActive = Boolean(currentUserId && group.activeMemberIds.includes(currentUserId));
              return (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir grupo ${group.name}`}
                  onPress={() => router.push(`/groups/${group.id}`)}
                  style={({ pressed }) => [pressed && { opacity: 0.78, transform: [{ scale: 0.99 }] }]}
                >
                  <Card style={{ gap: spacing.md, borderWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <GroupMark name={group.name} />
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Txt variant="subtitle" color={colors.brown700}>{group.name}</Txt>
                        <RoleBadge role={role} />
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color={colors.gray500} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <Meta icon="people" label={`${group.activeMemberIds.length} activos de ${group.memberIds.length}`} />
                      <Meta
                        icon={group.status === GROUP_STATUS.ARCHIVED ? 'archive' : isActive ? 'check-circle' : 'pause-circle'}
                        label={group.status === GROUP_STATUS.ARCHIVED ? 'Archivado' : isActive ? 'Participando' : 'En pausa'}
                        emphasized={group.status === GROUP_STATUS.ACTIVE && isActive}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        <Card style={{ flexDirection: 'row', gap: spacing.md, backgroundColor: colors.brown700, borderWidth: 0 }}>
          <MaterialIcons name="info-outline" size={22} color={colors.orange400} />
          <Txt variant="caption" color={colors.gray200} style={{ flex: 1, lineHeight: 19 }}>
            Solo los miembros activos reciben parte del siguiente ingreso. Puedes pausar tu participación cuando quieras.
          </Txt>
        </Card>
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 92,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderRadius: 16,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.gray200,
        },
        pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
    >
      <MaterialIcons name={icon} size={28} color={colors.brown700} />
      <Txt variant="caption" color={colors.brown700} style={{ fontFamily: fonts.bold }}>{label}</Txt>
    </Pressable>
  );
}

function Meta({ icon, label, emphasized = false }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; emphasized?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <MaterialIcons name={icon} size={16} color={emphasized ? colors.green500 : colors.gray500} />
      <Txt variant="caption" color={emphasized ? colors.green500 : colors.gray500}>{label}</Txt>
    </View>
  );
}
