export type Currency = 'EUR';

export interface User {
  id: string;
  displayName: string;
  balanceInCents: number;
  currency: Currency;
  photoUrl?: string;
}

export type OneTimeStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export interface OneTimeRequest {
  id: string;
  recipientId: string;
  amountInCents: number;
  currency: Currency;
  concept: string;
  status: OneTimeStatus;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  transactionId: string | null;
}

export interface ReusableQr {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  amountInCents: number;
  currency: Currency;
  status: 'active' | 'inactive';
  createdAt: number;
}

export type QrType = 'one_time' | 'personal' | 'reusable';

export interface Transaction {
  id: string;
  qrType: QrType;
  qrReferenceId: string;
  payerId: string;
  recipientId: string;
  amountInCents: number;
  currency: Currency;
  concept: string;
  status: 'completed';
  createdAt: number;
}

// Payload codificado en el QR físico. `app` valida que el QR pertenezca a EricPay (RF-001 §10).
export type QrPayload =
  | { app: 'ericpay'; type: 'one_time'; id: string }
  | { app: 'ericpay'; type: 'personal'; userId: string }
  | { app: 'ericpay'; type: 'reusable'; id: string };
