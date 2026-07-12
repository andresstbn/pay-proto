export const NOTIFICATION_CHANNELS = {
  incomingTransfers: 'incoming-transfers-v1',
} as const;

export const NOTIFICATION_SOUNDS = {
  incomingTransfer: 'ericpay-received.wav',
} as const;

export const NOTIFICATION_STORAGE_KEYS = {
  preferences: '@ericpay/notification-preferences-v1',
} as const;

export const NOTIFICATION_CALLABLES = {
  registerPushToken: 'registerPushToken',
  setPushEnabled: 'setPushEnabled',
} as const;
