export interface CompletedTransaction {
  id: string;
  payerId: string;
  recipientId: string;
  amountInCents: number;
  currency: string;
  status: 'completed';
}

export interface PushTokenRegistration {
  id: string;
  token: string;
  soundEnabled: boolean;
}

export interface PushDeliveryResult {
  ok: boolean;
  receiptId?: string;
  errorCode?: string;
  retryable: boolean;
}

export interface PushTokenRepository {
  listEnabled(userId: string): Promise<PushTokenRegistration[]>;
  upsert(userId: string, registration: PushTokenRegistration & { platform: string }): Promise<void>;
  setEnabledForUser(userId: string, enabled: boolean): Promise<void>;
  disable(userId: string, tokenId: string): Promise<void>;
}

export interface PushDeliveryRepository {
  claim(transactionId: string, tokenId: string): Promise<boolean>;
  markSent(transactionId: string, tokenId: string, receiptId?: string): Promise<void>;
  markFailed(transactionId: string, tokenId: string, errorCode?: string): Promise<void>;
}

export interface UserProfileRepository {
  displayName(userId: string): Promise<string>;
}

export interface PushNotificationProvider {
  sendIncomingTransfer(input: {
    token: string;
    transaction: CompletedTransaction;
    payerName: string;
    soundEnabled: boolean;
  }): Promise<PushDeliveryResult>;
}
