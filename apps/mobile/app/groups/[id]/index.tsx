import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { Alert, PixelRatio, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Avatar, Button, Card, formatEuros, Screen, ScreenHeader, Txt } from '../../../src/components/ui';
import { useProtectedUser, useStore } from '../../../src/domain/store';
import { GROUP_QR_KIND, GROUP_QR_STATUS, GROUP_ROLE, GROUP_STATUS } from '../../../src/groups/constants';
import { GroupMark, GroupSection, GroupState, RoleBadge, TextAction } from '../../../src/groups/components';
import { groupFixedQrPayload, groupOpenQrPayload } from '../../../src/groups/qr';
import { useGroup } from '../../../src/groups/GroupProvider';
import { Group, GroupActivity, GroupRole } from '../../../src/groups/types';
import { releaseQrImage, shareGroupQrImage } from '../../../src/qr/personal-qr-image';
import { colors, fonts, spacing } from '../../../src/theme/theme';

const GROUP_QR_EXPORT_PIXELS = 1024;

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useProtectedUser();
  const { users } = useStore();
  const router = useRouter();
  const {
    group,
    qrs,
    activity,
    role,
    loading,
    currentUserId,
    setParticipation,
    setMemberRole,
    removeMember,
    leaveGroup,
    transferOwnership,
    archiveGroup,
    deactivateGroupQr,
  } = useGroup(id);
  const groupQrCaptureRef = useRef<View | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sharingGroupQr, setSharingGroupQr] = useState(false);
  if (!user) return null;

  if (loading && !group) {
    return (
      <Screen style={{ justifyContent: 'center', padding: spacing.lg }}>
        <GroupState loading icon="groups" title="Cargando grupo" description="Estamos recuperando sus miembros y actividad." />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen style={{ justifyContent: 'center', padding: spacing.lg }}>
        <GroupState icon="group-off" title="Grupo no disponible" description="Es posible que ya no pertenezcas a este grupo." actionTitle="Volver a grupos" onAction={() => router.replace('/groups')} />
      </Screen>
    );
  }

  const isArchived = group.status === GROUP_STATUS.ARCHIVED;
  const groupId = group.id;
  const groupName = group.name;
  const isActive = Boolean(currentUserId && group.activeMemberIds.includes(currentUserId));
  const canManage = role === GROUP_ROLE.OWNER || role === GROUP_ROLE.ADMIN;
  const fixedQrs = qrs.filter((qr) => qr.type === GROUP_QR_KIND.FIXED);

  async function runAction(key: string, task: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    if (pending) return false;
    setPending(key);
    setActionError(null);
    const result = await task();
    if (!result.ok) setActionError(result.error);
    setPending(null);
    return result.ok;
  }

  function confirmLeave() {
    Alert.alert('Abandonar grupo', 'Dejarás de recibir futuros repartos y perderás acceso al grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Abandonar',
        style: 'destructive',
        onPress: async () => {
          if (await runAction('leave', () => leaveGroup(groupId))) router.replace('/groups');
        },
      },
    ]);
  }

  function confirmArchive() {
    Alert.alert('Archivar grupo', 'Se desactivarán sus cobros y ningún miembro recibirá nuevos repartos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Archivar',
        style: 'destructive',
        onPress: () => runAction('archive', () => archiveGroup(groupId)),
      },
    ]);
  }

  async function shareOpenGroupQr() {
    if (sharingGroupQr) return;

    const startedAt = Date.now();
    const exportSize = Platform.OS === 'ios'
      ? Math.round(GROUP_QR_EXPORT_PIXELS / PixelRatio.get())
      : GROUP_QR_EXPORT_PIXELS;
    let imageUri: string | null = null;
    setSharingGroupQr(true);
    setActionError(null);
    console.info({
      event: 'group_qr_image_share',
      provider: Platform.OS,
      status: 'started',
      step: 'capture',
    });

    try {
      if (!groupQrCaptureRef.current) throw new Error('qr/capture-not-ready');
      imageUri = await captureRef(groupQrCaptureRef, {
        format: 'png',
        height: exportSize,
        quality: 1,
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
        width: exportSize,
      });
      await shareGroupQrImage(imageUri, groupName);
      console.info({
        durationMs: Date.now() - startedAt,
        event: 'group_qr_image_share',
        provider: Platform.OS,
        status: 'completed',
        step: 'share',
      });
    } catch (error) {
      console.warn({
        durationMs: Date.now() - startedAt,
        errorCode: groupQrShareErrorCode(error),
        event: 'group_qr_image_share',
        provider: Platform.OS,
        status: 'failed',
        step: imageUri ? 'share' : 'capture',
      });
      setActionError('No se pudo compartir la imagen del QR. Inténtalo de nuevo.');
    } finally {
      setSharingGroupQr(false);
      if (imageUri) releaseQrImage(imageUri);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl }}>
        <ScreenHeader title="Detalle del grupo" />

        <Card style={{ backgroundColor: colors.brown700, borderWidth: 0, gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GroupMark name={group.name} size={58} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Txt variant="title" color={colors.white}>{group.name}</Txt>
              <RoleBadge role={role} />
            </View>
            {isArchived ? <MaterialIcons name="archive" size={26} color={colors.gray500} /> : null}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <Metric value={String(group.activeMemberIds.length)} label="activos" />
            <Metric value={String(group.memberIds.length)} label="miembros" />
            <Metric value={String(fixedQrs.filter((qr) => qr.status === GROUP_QR_STATUS.ACTIVE).length + (isArchived ? 0 : 1))} label="QR activos" />
          </View>
        </Card>

        {!isArchived ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Txt variant="subtitle" color={colors.brown700}>{isActive ? 'Participas en el reparto' : 'Participación en pausa'}</Txt>
              <Txt variant="caption" color={colors.gray500} style={{ lineHeight: 18 }}>
                {isActive ? 'Recibirás una parte de los próximos ingresos.' : 'No recibirás ingresos hasta que vuelvas a activarte.'}
              </Txt>
            </View>
            <Switch
              accessibilityLabel={isActive ? 'Pausar mi participación' : 'Activar mi participación'}
              value={isActive}
              disabled={pending === 'participation'}
              onValueChange={(active) => { void runAction('participation', () => setParticipation(groupId, active)); }}
              trackColor={{ false: colors.gray200, true: colors.brown500 }}
            />
          </Card>
        ) : (
          <GroupState icon="archive" title="Grupo archivado" description="El historial permanece visible, pero ya no admite ingresos ni cambios." />
        )}

        {actionError ? (
          <Card style={{ flexDirection: 'row', gap: spacing.sm, borderColor: colors.red500 }}>
            <MaterialIcons name="error-outline" size={20} color={colors.red500} />
            <Txt variant="caption" color={colors.red500} style={{ flex: 1 }}>{actionError}</Txt>
          </Card>
        ) : null}

        {!isArchived ? (
          <GroupSection
            title="QR de monto libre"
            action={canManage ? <TextAction title="Invitar" onPress={() => router.push(`/groups/${group.id}/invite`)} /> : undefined}
          >
            <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
              <View
                collapsable={false}
                ref={groupQrCaptureRef}
                style={{ backgroundColor: colors.white, padding: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: colors.gray200 }}
              >
                <QRCode value={JSON.stringify(groupOpenQrPayload(group.id))} size={172} color={colors.brown700} backgroundColor={colors.white} />
              </View>
              <View style={{ alignItems: 'center', gap: spacing.xs }}>
                <Txt variant="subtitle">El cliente decide el importe</Txt>
                <Txt variant="caption" color={colors.gray500}>Los miembros activos se reparten el total.</Txt>
              </View>
              <Button
                title={sharingGroupQr ? 'Preparando QR…' : 'Compartir QR'}
                variant="outline"
                style={{ alignSelf: 'stretch' }}
                disabled={sharingGroupQr}
                onPress={() => { void shareOpenGroupQr(); }}
              />
            </Card>
          </GroupSection>
        ) : null}

        <GroupSection
          title="QRs fijos"
          action={canManage && !isArchived ? <TextAction title="Crear QR" onPress={() => router.push(`/groups/${group.id}/qrs/new`)} /> : undefined}
        >
          {fixedQrs.length === 0 ? (
            <Card style={{ alignItems: 'center', gap: spacing.sm }}>
              <MaterialIcons name="qr-code-2" size={32} color={colors.gray500} />
              <Txt variant="caption" color={colors.gray500}>Todavía no hay QRs con importe fijo.</Txt>
            </Card>
          ) : fixedQrs.map((qr) => (
            <Card key={qr.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: qr.status === GROUP_QR_STATUS.ACTIVE ? 1 : 0.6 }}>
              <View style={{ padding: spacing.xs, backgroundColor: colors.white }}>
                <QRCode value={JSON.stringify(groupFixedQrPayload(qr.id))} size={70} color={colors.brown700} backgroundColor={colors.white} />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Txt variant="subtitle">{qr.name}</Txt>
                <Txt variant="body" color={colors.brown700} style={{ fontFamily: fonts.bold }}>{formatEuros(qr.amountInCents)}</Txt>
                {qr.concept ? <Txt variant="caption" color={colors.gray500}>{qr.concept}</Txt> : null}
              </View>
              {canManage && qr.status === GROUP_QR_STATUS.ACTIVE && !isArchived ? (
                <TextAction
                  destructive
                  title={pending === `qr-${qr.id}` ? 'Desactivando…' : 'Desactivar'}
                  onPress={() => runAction(`qr-${qr.id}`, () => deactivateGroupQr(group.id, qr.id))}
                />
              ) : (
                <Txt variant="caption" color={colors.gray500}>{qr.status === GROUP_QR_STATUS.ACTIVE ? 'Activo' : 'Inactivo'}</Txt>
              )}
            </Card>
          ))}
        </GroupSection>

        <GroupSection title="Miembros">
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {group.memberIds.map((memberId, index) => {
              const member = users[memberId];
              const memberRole = roleOf(group, memberId);
              const memberActive = group.activeMemberIds.includes(memberId);
              const isSelf = memberId === currentUserId;
              return (
                <View
                  key={memberId}
                  style={{
                    padding: spacing.lg,
                    gap: spacing.sm,
                    borderBottomWidth: index === group.memberIds.length - 1 ? 0 : 1,
                    borderBottomColor: colors.gray100,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Avatar user={member} size={42} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" style={{ fontFamily: fonts.semibold }}>{member?.displayName ?? 'Miembro'}</Txt>
                      <Txt variant="caption" color={memberActive ? colors.green500 : colors.gray500}>
                        {memberActive ? 'Activo en repartos' : 'En pausa'}{isSelf ? ' · Tú' : ''}
                      </Txt>
                    </View>
                    <RoleBadge role={memberRole} />
                  </View>
                  {!isArchived && !isSelf && memberRole !== GROUP_ROLE.OWNER && canManage ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm }}>
                      {role === GROUP_ROLE.OWNER ? (
                        <>
                          <TextAction
                            title={memberRole === GROUP_ROLE.ADMIN ? 'Quitar admin' : 'Hacer admin'}
                            onPress={() => runAction(`role-${memberId}`, () => setMemberRole(
                              group.id,
                              memberId,
                              memberRole === GROUP_ROLE.ADMIN ? GROUP_ROLE.MEMBER : GROUP_ROLE.ADMIN,
                            ))}
                          />
                          <TextAction
                            title="Transferir propiedad"
                            onPress={() => Alert.alert(
                              'Transferir propiedad',
                              `${member?.displayName ?? 'Este miembro'} pasará a controlar el grupo.`,
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Transferir', onPress: () => runAction(`owner-${memberId}`, () => transferOwnership(group.id, memberId)) },
                              ],
                            )}
                          />
                        </>
                      ) : null}
                      {role === GROUP_ROLE.OWNER || memberRole === GROUP_ROLE.MEMBER ? (
                        <TextAction
                          destructive
                          title="Eliminar"
                          onPress={() => Alert.alert(
                            'Eliminar miembro',
                            `${member?.displayName ?? 'Este miembro'} perderá acceso al grupo.`,
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Eliminar', style: 'destructive', onPress: () => runAction(`remove-${memberId}`, () => removeMember(group.id, memberId)) },
                            ],
                          )}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </GroupSection>

        <GroupSection title="Actividad">
          {activity.length === 0 ? (
            <Card><Txt variant="caption" color={colors.gray500}>La actividad aparecerá aquí.</Txt></Card>
          ) : activity.slice(0, 12).map((item) => (
            <Card key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 0 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={activityIcon(item)} size={20} color={colors.brown700} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="body">{activityLabel(item, users)}</Txt>
                <Txt variant="caption" color={colors.gray500}>{new Date(item.createdAt).toLocaleString('es-ES')}</Txt>
              </View>
              {typeof item.amountInCents === 'number' ? <Txt variant="subtitle" color={colors.green500}>{formatEuros(item.amountInCents)}</Txt> : null}
            </Card>
          ))}
        </GroupSection>

        {!isArchived ? (
          role === GROUP_ROLE.OWNER
            ? <Button title={pending === 'archive' ? 'Archivando…' : 'Archivar grupo'} variant="outline" textColor={colors.red500} style={{ borderColor: colors.red500 }} onPress={confirmArchive} disabled={Boolean(pending)} />
            : <Button title={pending === 'leave' ? 'Abandonando…' : 'Abandonar grupo'} variant="outline" textColor={colors.red500} style={{ borderColor: colors.red500 }} onPress={confirmLeave} disabled={Boolean(pending)} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt variant="title" color={colors.white}>{value}</Txt>
      <Txt variant="caption" color={colors.orange400}>{label}</Txt>
    </View>
  );
}

function roleOf(group: Group, userId: string): GroupRole {
  if (group.ownerId === userId) return GROUP_ROLE.OWNER;
  if (group.adminIds.includes(userId)) return GROUP_ROLE.ADMIN;
  return GROUP_ROLE.MEMBER;
}

function activityIcon(activity: GroupActivity): keyof typeof MaterialIcons.glyphMap {
  if (activity.transactionId || typeof activity.amountInCents === 'number') return 'payments';
  if (activity.type.includes('join')) return 'person-add';
  if (activity.type.includes('left') || activity.type.includes('removed')) return 'person-remove';
  if (activity.type.includes('qr')) return 'qr-code-2';
  return 'history';
}

function activityLabel(activity: GroupActivity, users: Record<string, { displayName: string }>): string {
  const actor = activity.actorId ? users[activity.actorId]?.displayName : undefined;
  if (activity.transactionId || typeof activity.amountInCents === 'number') {
    return `Ingreso repartido entre ${activity.recipientCount ?? 0} miembros`;
  }
  if (activity.type.includes('join')) return `${actor ?? 'Un miembro'} se unió al grupo`;
  if (activity.type.includes('left')) return `${actor ?? 'Un miembro'} abandonó el grupo`;
  if (activity.type.includes('participation')) return `${actor ?? 'Un miembro'} cambió su participación`;
  if (activity.type.includes('qr')) return `${actor ?? 'Un administrador'} actualizó los QRs`;
  if (activity.type.includes('archive')) return 'El grupo fue archivado';
  return actor ? `Actividad de ${actor}` : 'Actividad del grupo';
}

function groupQrShareErrorCode(error: unknown) {
  if (!(error instanceof Error)) return 'unknown';
  return error.message.startsWith('qr/') ? error.message.slice(3) : error.name;
}
