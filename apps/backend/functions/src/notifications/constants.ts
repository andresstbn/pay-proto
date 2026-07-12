export const PUSH_NOTIFICATION = {
  channelId: 'incoming-transfers-v1',
  soundName: 'ericpay-received.wav',
  deliveryLeaseMs: 2 * 60 * 1000,
  providerTimeoutMs: 8_000,
  maxProviderAttempts: 2,
  maxDeliveryAttempts: 4,
} as const;

export const PUSH_ERROR_CODES = {
  deviceNotRegistered: 'DeviceNotRegistered',
  messageRateExceeded: 'MessageRateExceeded',
  providerError: 'ProviderError',
  timeout: 'ProviderTimeout',
  unknown: 'UnknownProviderError',
} as const;
