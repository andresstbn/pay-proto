import assert from 'node:assert/strict';
import { before, test } from 'node:test';

const projectId = process.env.GCLOUD_PROJECT ?? 'ericpay-7626c';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;

if (!firestoreHost) {
  throw new Error('Este test requiere el emulador de Firestore.');
}

const firestoreBase = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;
const identities = new Map();

before(async () => {
  for (const name of ['member', 'recipient', 'payer', 'outsider']) {
    identities.set(name, createIdentity(name));
  }

  const memberId = identities.get('member').uid;
  const recipientId = identities.get('recipient').uid;
  const payerId = identities.get('payer').uid;

  await seed('groups/group-1', {
    name: 'Grupo de prueba',
    ownerId: memberId,
    adminIds: [],
    memberIds: [memberId, recipientId],
    activeMemberIds: [memberId, recipientId],
  });
  await seed('groupQrs/qr-1', { groupId: 'group-1', type: 'fixed', status: 'active' });
  await seed('groupActivity/activity-1', { groupId: 'group-1', type: 'group_created' });
  await seed('groupInvites/invite-hash', { groupId: 'group-1', status: 'active' });
  await seed('groupPaymentRequests/request-hash', { payerId, requestFingerprint: 'fixture' });
  await seed('transactions/group-payment', {
    groupName: 'Grupo de prueba',
    payerId,
    recipientCount: 2,
    amountInCents: 100,
  });
  await seed('groupReceipts/receipt-member', {
    transactionId: 'group-payment',
    groupName: 'Grupo de prueba',
    payerId,
    recipientId: memberId,
    amountInCents: 50,
    totalAmountInCents: 100,
    recipientCount: 2,
  });
  await seed('groupReceipts/receipt-recipient', {
    transactionId: 'group-payment',
    groupName: 'Grupo de prueba',
    payerId,
    recipientId,
    amountInCents: 50,
    totalAmountInCents: 100,
    recipientCount: 2,
  });
  await seed('transactions/individual-payment', {
    payerId,
    recipientId,
    amountInCents: 100,
  });
});

test('group documents, QRs and activity are private to current members', async () => {
  assert.equal((await read('groups/group-1', token('member'))).status, 200);
  assert.equal((await read('groupQrs/qr-1', token('member'))).status, 200);
  assert.equal((await read('groupActivity/activity-1', token('recipient'))).status, 200);
  assert.equal((await read('groups/group-1', token('outsider'))).status, 403);
  assert.equal((await read('groupQrs/qr-1', token('outsider'))).status, 403);
  assert.equal((await read('groups/group-1')).status, 403);
});

test('the listener query shapes used by the client satisfy the rules', async () => {
  assert.equal((await runQuery('memberIds', 'ARRAY_CONTAINS', identities.get('member').uid, token('member'), 'groups')).status, 200);
  assert.equal((await runQuery('groupId', 'EQUAL', 'group-1', token('member'), 'groupQrs')).status, 200);
  assert.equal((await runQuery('groupId', 'EQUAL', 'group-1', token('member'), 'groupActivity')).status, 200);
  assert.equal((await runQuery('groupId', 'EQUAL', 'group-1', token('outsider'), 'groupQrs')).status, 403);
  assert.equal((await runQuery('recipientId', 'EQUAL', identities.get('member').uid, token('member'), 'groupReceipts')).status, 200);
  assert.equal((await runQuery('recipientId', 'EQUAL', identities.get('member').uid, token('payer'), 'groupReceipts')).status, 403);
  assert.equal((await runQuery('payerId', 'EQUAL', identities.get('payer').uid, token('payer'), 'transactions')).status, 200);
  assert.equal((await runQuery('recipientId', 'EQUAL', identities.get('recipient').uid, token('recipient'), 'transactions')).status, 200);
});

test('all client writes remain forbidden', async () => {
  const response = await request('groups/group-1', token('member'), {
    method: 'PATCH',
    body: JSON.stringify({ fields: encodeFields({ name: 'Manipulado' }) }),
  });
  assert.equal(response.status, 403);
  const receiptWrite = await request('groupReceipts/receipt-member', token('member'), {
    method: 'PATCH',
    body: JSON.stringify({ fields: encodeFields({ amountInCents: 999 }) }),
  });
  assert.equal(receiptWrite.status, 403);
});

test('invite hashes and idempotency records are never client-readable', async () => {
  assert.equal((await read('groupInvites/invite-hash', token('member'))).status, 403);
  assert.equal((await read('groupPaymentRequests/request-hash', token('payer'))).status, 403);
});

test('group transaction exposes no recipients and private receipts are recipient-only', async () => {
  const payerTransaction = await read('transactions/group-payment', token('payer'));
  assert.equal(payerTransaction.status, 200);
  const payerPayload = await payerTransaction.json();
  assert.equal('recipientIds' in payerPayload.fields, false);
  assert.equal('allocations' in payerPayload.fields, false);
  assert.equal(payerPayload.fields.groupName.stringValue, 'Grupo de prueba');
  assert.equal((await read('transactions/group-payment', token('member'))).status, 403);
  assert.equal((await read('transactions/group-payment', token('recipient'))).status, 403);
  assert.equal((await read('transactions/group-payment', token('outsider'))).status, 403);
  const memberReceipt = await read('groupReceipts/receipt-member', token('member'));
  assert.equal(memberReceipt.status, 200);
  const memberReceiptPayload = await memberReceipt.json();
  assert.equal(memberReceiptPayload.fields.payerId.stringValue, identities.get('payer').uid);
  assert.equal(memberReceiptPayload.fields.groupName.stringValue, 'Grupo de prueba');
  assert.equal((await read('groupReceipts/receipt-member', token('recipient'))).status, 403);
  assert.equal((await read('groupReceipts/receipt-member', token('payer'))).status, 403);
  assert.equal((await read('groupReceipts/receipt-member', token('outsider'))).status, 403);
  assert.equal((await read('transactions/individual-payment', token('recipient'))).status, 200);
});

function createIdentity(name) {
  const uid = `test-${name}`;
  const nowInSeconds = Math.floor(Date.now() / 1_000);
  const header = base64Url({ alg: 'none', typ: 'JWT' });
  const payload = base64Url({
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    auth_time: nowInSeconds,
    user_id: uid,
    sub: uid,
    iat: nowInSeconds,
    exp: nowInSeconds + 3_600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
  });
  return { uid, token: `${header}.${payload}.` };
}

async function seed(path, value) {
  const response = await request(path, 'owner', {
    method: 'PATCH',
    body: JSON.stringify({ fields: encodeFields(value) }),
  });
  assert.equal(response.status, 200);
}

function read(path, idToken) {
  return request(path, idToken, { method: 'GET' });
}

function request(path, idToken, init) {
  return fetch(`${firestoreBase}/${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
    },
  });
}

function runQuery(fieldPath, operation, value, idToken, collectionId) {
  return fetch(`${firestoreBase}:runQuery`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: operation,
            value: { stringValue: value },
          },
        },
      },
    }),
  });
}

function token(name) {
  return identities.get(name).token;
}

function encodeFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)]));
}

function encodeValue(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  throw new Error('Tipo de fixture no compatible.');
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
