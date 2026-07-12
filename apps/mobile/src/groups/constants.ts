export const GROUP_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const GROUP_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export const GROUP_QR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const GROUP_QR_TYPE = {
  OPEN: 'group_open',
  FIXED: 'group_fixed',
} as const;

export const GROUP_QR_KIND = {
  OPEN: 'open',
  FIXED: 'fixed',
} as const;

export const GROUP_TRANSACTION_STATUS = {
  COMPLETED: 'completed',
} as const;

export const GROUP_ACTIVITY_TYPE = {
  CREATED: 'group_created',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_REMOVED: 'member_removed',
  PARTICIPATION_CHANGED: 'participation_changed',
  ROLE_CHANGED: 'role_changed',
  OWNERSHIP_TRANSFERRED: 'ownership_transferred',
  QR_CREATED: 'qr_created',
  QR_DEACTIVATED: 'qr_deactivated',
  PAYMENT_COMPLETED: 'payment_completed',
  ARCHIVED: 'group_archived',
} as const;

export const GROUP_COLLECTION = {
  GROUPS: 'groups',
  QRS: 'groupQrs',
  ACTIVITY: 'groupActivity',
  TRANSACTIONS: 'transactions',
  RECEIPTS: 'groupReceipts',
} as const;

export const GROUP_CALLABLE = {
  CREATE: 'createGroup',
  ROTATE_INVITE: 'rotateGroupInvite',
  JOIN: 'joinGroup',
  SET_PARTICIPATION: 'setGroupParticipation',
  SET_MEMBER_ROLE: 'setGroupMemberRole',
  REMOVE_MEMBER: 'removeGroupMember',
  LEAVE: 'leaveGroup',
  TRANSFER_OWNERSHIP: 'transferGroupOwnership',
  ARCHIVE: 'archiveGroup',
  CREATE_QR: 'createGroupFixedQr',
  DEACTIVATE_QR: 'deactivateGroupQr',
  PREVIEW_PAYMENT: 'previewGroupPayment',
  PAY: 'payGroup',
} as const;

export const GROUP_LIMITS = {
  MAX_MEMBERS: 20,
  MAX_NAME_LENGTH: 60,
  MAX_CONCEPT_LENGTH: 120,
} as const;

export const ERICPAY_QR_APP = 'ericpay' as const;
export const ERICPAY_GROUP_QR_VERSION = 1 as const;
