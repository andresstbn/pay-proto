export function createGroupPaymentRequestId(now = Date.now, random = Math.random): string {
  const timestamp = now().toString(36);
  const entropy = random().toString(36).slice(2, 12).padEnd(10, '0');
  return `group-pay-${timestamp}-${entropy}`;
}
