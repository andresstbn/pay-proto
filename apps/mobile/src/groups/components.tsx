import { MaterialIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Button, Card, Txt } from '../components/ui';
import { colors, fonts, radius, spacing } from '../theme/theme';
import { GROUP_ROLE } from './constants';
import { GroupRole } from './types';

const ROLE_LABEL: Record<GroupRole, string> = {
  [GROUP_ROLE.OWNER]: 'Propietario',
  [GROUP_ROLE.ADMIN]: 'Administrador',
  [GROUP_ROLE.MEMBER]: 'Miembro',
};

export function GroupMark({ name, size = 48 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'G';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.navy900,
        borderWidth: 2,
        borderColor: colors.cyan400,
      }}
    >
      <Txt color={colors.white} style={{ fontFamily: fonts.bold, fontSize: size * 0.4 }}>{initial}</Txt>
    </View>
  );
}

export function RoleBadge({ role }: { role: GroupRole }) {
  const highlighted = role !== GROUP_ROLE.MEMBER;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: highlighted ? colors.yellow100 : colors.gray100,
      }}
    >
      <Txt variant="caption" color={highlighted ? colors.navy900 : colors.gray500} style={{ fontFamily: fonts.semibold }}>
        {ROLE_LABEL[role]}
      </Txt>
    </View>
  );
}

export function GroupState({
  icon,
  title,
  description,
  loading = false,
  actionTitle,
  onAction,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  loading?: boolean;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xxl }}>
      {loading
        ? <ActivityIndicator size="large" color={colors.blue600} />
        : <MaterialIcons name={icon} size={44} color={colors.blue600} />}
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Txt variant="subtitle" color={colors.navy900}>{title}</Txt>
        <Txt variant="body" color={colors.gray500} style={{ textAlign: 'center', lineHeight: 21 }}>{description}</Txt>
      </View>
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} style={{ alignSelf: 'stretch' }} /> : null}
    </Card>
  );
}

export function GroupSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <Txt variant="title" color={colors.navy900} style={{ fontSize: 19 }}>{title}</Txt>
        {action}
      </View>
      {children}
    </View>
  );
}

export function TextAction({ title, onPress, destructive = false }: { title: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [{ padding: spacing.xs }, pressed && { opacity: 0.65 }]}
    >
      <Txt variant="caption" color={destructive ? colors.red500 : colors.blue600} style={{ fontFamily: fonts.bold }}>{title}</Txt>
    </Pressable>
  );
}
