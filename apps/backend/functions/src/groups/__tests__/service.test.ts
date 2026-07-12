import * as assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { generateInviteCode, sha256 } from '../crypto';
import {
  Group,
  GroupActivity,
  GroupError,
  GroupInvite,
  GroupPaymentRequest,
  GroupPaymentTransaction,
  GroupQr,
  GroupReceipt,
  MAX_GROUP_FIXED_QRS,
  UserBalance,
} from '../domain';
import {
  assertActiveGroup,
  assertManager,
  assertMember,
  assertOwner,
  assertValidAmount,
  distributeAmount,
  roleFor,
} from '../policy';
import { GroupCollection, GroupsRepository, GroupTransaction } from '../repository';
import { GroupService } from '../service';

const FIRST_CODE = '2345-6789-ABCD-EFGH-JKMN-PQRS';
const SECOND_CODE = 'TUVW-XYZ2-3456-789A-BCDE-FGHJ';

describe('group distribution policy', () => {
  test('excludes the payer and preserves the total', () => {
    const result = distributeAmount(5, ['payer', 'one', 'two'], 'payer', 0);

    assert.deepEqual(result.allocations, [
      { recipientId: 'one', amountInCents: 3 },
      { recipientId: 'two', amountInCents: 2 },
    ]);
    assert.equal(result.allocations.reduce((sum, item) => sum + item.amountInCents, 0), 5);
  });

  test('rotates remainder cents with the cursor', () => {
    const first = distributeAmount(7, ['one', 'two', 'three'], 'external', 0);
    const second = distributeAmount(7, ['one', 'two', 'three'], 'external', first.nextCursor);

    assert.deepEqual(first.allocations.map((item) => item.amountInCents), [3, 2, 2]);
    assert.deepEqual(second.allocations.map((item) => item.amountInCents), [2, 3, 2]);
  });

  test('rejects empty and zero-cent allocations', () => {
    assertGroupError(
      () => distributeAmount(10, ['payer'], 'payer', 0),
      'failed-precondition',
    );
    assertGroupError(
      () => distributeAmount(1, ['one', 'two'], 'payer', 0),
      'failed-precondition',
    );
    assertGroupError(() => distributeAmount(1.5, ['one'], 'payer', 0), 'invalid-argument');
  });

  test('covers roles, archived groups and defensive cursor normalization', () => {
    const group = groupFixture();
    assert.equal(roleFor(group, 'owner'), 'owner');
    assert.equal(roleFor(group, 'admin'), 'admin');
    assert.equal(roleFor(group, 'member'), 'member');
    assert.equal(roleFor(group, 'outsider'), null);
    assert.equal(assertMember(group, 'member'), 'member');
    assert.equal(assertManager(group, 'admin'), 'admin');
    assert.doesNotThrow(() => assertOwner(group, 'owner'));
    assertGroupError(() => assertMember(group, 'outsider'), 'permission-denied');
    assertGroupError(() => assertManager(group, 'member'), 'permission-denied');
    assertGroupError(() => assertOwner(group, 'member'), 'permission-denied');
    assertGroupError(() => assertActiveGroup({ ...group, status: 'archived' }), 'failed-precondition');
    assertGroupError(() => assertValidAmount('100'), 'invalid-argument');
    assertGroupError(() => assertValidAmount(100_000_001), 'invalid-argument');
    assert.equal(distributeAmount(4, ['one', 'two'], 'payer', -1).nextCursor, 1);
  });

  test('generates a high-entropy shaped code and stable hashes', () => {
    const code = generateInviteCode();
    assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}(?:-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){5}$/);
    assert.equal(sha256('same'), sha256('same'));
    assert.notEqual(sha256('same'), sha256('other'));
  });
});

describe('GroupService integration with repository contract', () => {
  test('creates a private group, open QR and hashed invitation atomically', async () => {
    const context = setup(['owner']);

    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });

    const group = context.repository.state.groups.get(created.groupId);
    assert.equal(group?.ownerId, 'owner');
    assert.deepEqual(group?.memberIds, ['owner']);
    assert.equal(context.repository.state.qrs.get(created.openQrId)?.type, 'open');
    assert.equal(context.repository.state.invites.has(sha256(FIRST_CODE.replaceAll('-', ''))), true);
    assert.equal([...context.repository.state.invites.keys()].includes(FIRST_CODE), false);
    assert.match(created.joinUrl, /^ericpay:\/\/groups\/join\?code=/);
  });

  test('rotates invitations and joins a member only once', async () => {
    const context = setup(['owner', 'member']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    const rotated = await context.service.rotateInvite('owner', { groupId: created.groupId });

    await assertRejectsCode(
      context.service.joinGroup('member', { code: created.inviteCode }),
      'not-found',
    );
    assert.equal(rotated.inviteCode, SECOND_CODE);
    assert.deepEqual(
      await context.service.joinGroup('member', { code: rotated.inviteCode }),
      { groupId: created.groupId, alreadyMember: false },
    );
    assert.deepEqual(
      await context.service.joinGroup('member', { code: rotated.inviteCode }),
      { groupId: created.groupId, alreadyMember: true },
    );
    assert.deepEqual(context.repository.state.groups.get(created.groupId)?.activeMemberIds, [
      'owner',
      'member',
    ]);
  });

  test('enforces the 20-member limit', async () => {
    const ids = ['owner', ...Array.from({ length: 20 }, (_, index) => `member-${index}`)];
    const context = setup(ids);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });

    for (const memberId of ids.slice(1, 20)) {
      await context.service.joinGroup(memberId, { code: created.inviteCode });
    }

    await assertRejectsCode(
      context.service.joinGroup(ids[20], { code: created.inviteCode }),
      'failed-precondition',
    );
    assert.equal(context.repository.state.groups.get(created.groupId)?.memberIds.length, 20);
  });

  test('lets members pause themselves while only managers create fixed QRs', async () => {
    const context = setup(['owner', 'member']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    await context.service.joinGroup('member', { code: created.inviteCode });

    assert.equal(
      await context.service.setParticipation('member', { groupId: created.groupId, active: false }),
      false,
    );
    await assertRejectsCode(
      context.service.createFixedQr('member', {
        groupId: created.groupId,
        name: 'Cuota',
        amountInCents: 500,
      }),
      'permission-denied',
    );
    const qrId = await context.service.createFixedQr('owner', {
      groupId: created.groupId,
      name: 'Cuota',
      concept: 'Cuota mensual',
      amountInCents: 500,
    });
    assert.equal(context.repository.state.qrs.get(qrId)?.amountInCents, 500);
    await context.service.deactivateQr('owner', { groupId: created.groupId, qrId });
    assert.equal(context.repository.state.qrs.get(qrId)?.status, 'inactive');
  });

  test('previews and pays an open QR atomically with idempotent replay', async () => {
    const context = setup(['owner', 'member', 'payer']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    await context.service.joinGroup('member', { code: created.inviteCode });

    const preview = await context.service.previewPayment('payer', {
      groupId: created.groupId,
      amountInCents: 101,
    });
    assert.equal(preview.recipientCount, 2);
    assert.equal(preview.baseShareInCents, 50);
    assert.equal(preview.extraCentRecipients, 1);

    const first = await context.service.payGroup('payer', {
      groupId: created.groupId,
      amountInCents: 101,
      clientRequestId: 'request-0001',
    });
    const replay = await context.service.payGroup('payer', {
      groupId: created.groupId,
      amountInCents: 101,
      clientRequestId: 'request-0001',
    });

    assert.equal(first.replayed, false);
    assert.equal(replay.replayed, true);
    assert.equal(replay.transactionId, first.transactionId);
    assert.equal(first.payerBalanceInCentsAfter, 999_899);
    assert.equal(replay.payerBalanceInCentsAfter, first.payerBalanceInCentsAfter);
    assert.equal('allocations' in first, false);
    assert.equal('recipientIds' in first, false);
    assert.equal(context.repository.state.transactions.size, 1);
    assert.equal(context.repository.state.receipts.size, 2);
    assert.equal(
      [...context.repository.state.receipts.values()]
        .reduce((sum, receipt) => sum + receipt.amountInCents, 0),
      101,
    );
    assert.equal(
      [...context.repository.state.receipts.values()].every((receipt) => (
        receipt.payerId === 'payer' && receipt.groupName === 'Equipo Norte'
      )),
      true,
    );
    const publicPayment = context.repository.state.transactions.get(first.transactionId)! as unknown as Record<string, unknown>;
    assert.equal(publicPayment.recipientCount, 2);
    assert.equal(publicPayment.groupName, 'Equipo Norte');
    assert.equal('recipientIds' in publicPayment, false);
    assert.equal('allocations' in publicPayment, false);
    const persistedRequest = [...context.repository.state.paymentRequests.values()][0] as unknown as Record<string, unknown>;
    assert.equal('allocations' in (persistedRequest.result as Record<string, unknown>), false);
    const paymentActivity = [...context.repository.state.activities.values()]
      .find((item) => item.transactionId === first.transactionId);
    assert.equal(paymentActivity?.actorId, undefined);
    assert.equal(context.repository.state.users.get('payer')?.balanceInCents, 999_899);
    assert.equal(context.repository.state.users.get('owner')?.balanceInCents, 1_000_051);
    assert.equal(context.repository.state.users.get('member')?.balanceInCents, 1_000_050);

    await assertRejectsCode(
      context.service.payGroup('payer', {
        groupId: created.groupId,
        amountInCents: 102,
        clientRequestId: 'request-0001',
      }),
      'already-exists',
    );
  });

  test('excludes a member payer and rotates the extra cent on later payments', async () => {
    const context = setup(['owner', 'member', 'third']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    await context.service.joinGroup('member', { code: created.inviteCode });
    await context.service.joinGroup('third', { code: created.inviteCode });

    const paid = await context.service.payGroup('owner', {
      groupId: created.groupId,
      amountInCents: 5,
      clientRequestId: 'request-0002',
    });
    assert.deepEqual(receiptAmounts(context.repository, paid.transactionId), {
      member: 3,
      third: 2,
    });

    const second = await context.service.payGroup('owner', {
      groupId: created.groupId,
      amountInCents: 5,
      clientRequestId: 'request-0003',
    });
    assert.deepEqual(receiptAmounts(context.repository, second.transactionId), {
      member: 2,
      third: 3,
    });
  });

  test('validates fixed QR amount, balance and active recipients before writing', async () => {
    const context = setup(['owner', 'payer']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    const qrId = await context.service.createFixedQr('owner', {
      groupId: created.groupId,
      name: 'Cuota',
      amountInCents: 500,
    });

    await assertRejectsCode(
      context.service.previewPayment('payer', { qrId, amountInCents: 501 }),
      'invalid-argument',
    );
    context.repository.state.users.get('payer')!.balanceInCents = 100;
    await assertRejectsCode(
      context.service.payGroup('payer', { qrId, clientRequestId: 'request-0004' }),
      'failed-precondition',
    );
    assert.equal(context.repository.state.transactions.size, 0);

    await context.service.setParticipation('owner', { groupId: created.groupId, active: false });
    await assertRejectsCode(
      context.service.previewPayment('payer', { qrId }),
      'failed-precondition',
    );
  });

  test('supports role changes, removal, ownership transfer, leave and archive', async () => {
    const context = setup(['owner', 'admin', 'member']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    await context.service.joinGroup('admin', { code: created.inviteCode });
    await context.service.joinGroup('member', { code: created.inviteCode });
    await context.service.setMemberRole('owner', {
      groupId: created.groupId,
      memberId: 'admin',
      role: 'admin',
    });
    await context.service.removeMember('admin', {
      groupId: created.groupId,
      memberId: 'member',
    });
    await assertRejectsCode(
      context.service.joinGroup('member', { code: created.inviteCode }),
      'not-found',
    );
    await context.service.transferOwnership('owner', {
      groupId: created.groupId,
      newOwnerId: 'admin',
    });
    await context.service.leaveGroup('owner', { groupId: created.groupId });
    await context.service.archiveGroup('admin', { groupId: created.groupId });

    const group = context.repository.state.groups.get(created.groupId);
    assert.equal(group?.ownerId, 'admin');
    assert.deepEqual(group?.memberIds, ['admin']);
    assert.equal(group?.status, 'archived');
    assert.deepEqual(group?.activeMemberIds, []);
    assert.equal(context.repository.state.qrs.get(created.openQrId)?.status, 'inactive');
  });

  test('caps total fixed QRs so archive remains below the Firestore write limit', async () => {
    const context = setup(['owner']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });

    for (let index = 0; index < MAX_GROUP_FIXED_QRS; index += 1) {
      await context.service.createFixedQr('owner', {
        groupId: created.groupId,
        name: `QR ${index}`,
        amountInCents: 100,
      });
    }

    await assertRejectsCode(
      context.service.createFixedQr('owner', {
        groupId: created.groupId,
        name: 'QR excedente',
        amountInCents: 100,
      }),
      'failed-precondition',
    );
    assert.equal(context.repository.state.qrs.size, MAX_GROUP_FIXED_QRS + 1);
    await context.service.archiveGroup('owner', { groupId: created.groupId });
    assert.equal(
      [...context.repository.state.qrs.values()].every((qr) => qr.status === 'inactive'),
      true,
    );
  });

  test('rejects invalid targets and unauthorized lifecycle operations', async () => {
    const context = setup(['owner', 'member', 'outsider']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    await context.service.joinGroup('member', { code: created.inviteCode });

    await assertRejectsCode(
      context.service.previewPayment('outsider', {
        groupId: created.groupId,
        qrId: created.openQrId,
        amountInCents: 100,
      }),
      'invalid-argument',
    );
    await assertRejectsCode(
      context.service.leaveGroup('owner', { groupId: created.groupId }),
      'failed-precondition',
    );
    await assertRejectsCode(
      context.service.archiveGroup('member', { groupId: created.groupId }),
      'permission-denied',
    );
    await assertRejectsCode(
      context.service.removeMember('member', {
        groupId: created.groupId,
        memberId: 'owner',
      }),
      'permission-denied',
    );
  });

  test('validates malformed input and inconsistent persisted state', async () => {
    const context = setup(['owner', 'admin', 'member', 'payer']);
    const created = await context.service.createGroup('owner', { name: 'Equipo Norte' });
    await context.service.joinGroup('admin', { code: created.inviteCode });
    await context.service.joinGroup('member', { code: created.inviteCode });

    await assertRejectsCode(context.service.joinGroup('payer', { code: 'short' }), 'invalid-argument');
    await assertRejectsCode(
      context.service.setParticipation('member', { groupId: created.groupId, active: 'yes' }),
      'invalid-argument',
    );
    await context.service.setParticipation('member', { groupId: created.groupId, active: false });
    await context.service.setParticipation('member', { groupId: created.groupId, active: true });
    await context.service.setParticipation('member', { groupId: created.groupId, active: true });
    await assertRejectsCode(
      context.service.setMemberRole('owner', {
        groupId: created.groupId,
        memberId: 'member',
        role: 'owner',
      }),
      'invalid-argument',
    );
    await assertRejectsCode(
      context.service.setMemberRole('owner', {
        groupId: created.groupId,
        memberId: 'owner',
        role: 'admin',
      }),
      'failed-precondition',
    );
    await context.service.setMemberRole('owner', {
      groupId: created.groupId,
      memberId: 'member',
      role: 'admin',
    });
    await context.service.setMemberRole('owner', {
      groupId: created.groupId,
      memberId: 'member',
      role: 'member',
    });
    await assertRejectsCode(
      context.service.removeMember('admin', { groupId: created.groupId, memberId: 'admin' }),
      'failed-precondition',
    );
    await assertRejectsCode(
      context.service.removeMember('owner', { groupId: created.groupId, memberId: 'payer' }),
      'permission-denied',
    );
    await assertRejectsCode(
      context.service.transferOwnership('owner', {
        groupId: created.groupId,
        newOwnerId: 'owner',
      }),
      'failed-precondition',
    );
    await assertRejectsCode(
      context.service.deactivateQr('owner', {
        groupId: created.groupId,
        qrId: created.openQrId,
      }),
      'failed-precondition',
    );
    await assertRejectsCode(
      context.service.payGroup('payer', {
        groupId: created.groupId,
        amountInCents: 100,
        clientRequestId: 'bad request!',
      }),
      'invalid-argument',
    );
    await assertRejectsCode(
      context.service.previewPayment('payer', { qrId: created.openQrId, amountInCents: 100 }),
      'invalid-argument',
    );
    await assertRejectsCode(
      context.service.setParticipation('member', { groupId: 'bad/id', active: true }),
      'invalid-argument',
    );
    await assertRejectsCode(context.service.createGroup('owner', { name: 42 }), 'invalid-argument');
    await assertRejectsCode(context.service.createGroup('owner', { name: ' ' }), 'invalid-argument');
    await assertRejectsCode(
      context.service.createFixedQr('owner', {
        groupId: created.groupId,
        name: 'Cuota',
        amountInCents: 100,
        concept: 42,
      }),
      'invalid-argument',
    );
    await assertRejectsCode(
      context.service.createFixedQr('owner', {
        groupId: created.groupId,
        name: 'Cuota',
        amountInCents: 100,
        concept: 'x'.repeat(121),
      }),
      'invalid-argument',
    );

    const group = context.repository.state.groups.get(created.groupId)!;
    group.activeInviteHash = sha256(SECOND_CODE.replaceAll('-', ''));
    await assertRejectsCode(
      context.service.joinGroup('payer', { code: created.inviteCode }),
      'not-found',
    );
    group.activeInviteHash = sha256(created.inviteCode.replaceAll('-', ''));
    const openQr = context.repository.state.qrs.get(created.openQrId)!;
    openQr.type = 'fixed';
    await assertRejectsCode(
      context.service.previewPayment('payer', { groupId: created.groupId, amountInCents: 100 }),
      'failed-precondition',
    );
    openQr.type = 'open';
    openQr.status = 'inactive';
    await assertRejectsCode(
      context.service.previewPayment('payer', { groupId: created.groupId, amountInCents: 100 }),
      'failed-precondition',
    );
    openQr.status = 'active';
    context.repository.state.users.get('payer')!.balanceInCents = Number.NaN;
    await assertRejectsCode(
      context.service.payGroup('payer', {
        groupId: created.groupId,
        amountInCents: 100,
        clientRequestId: 'request-0005',
      }),
      'failed-precondition',
    );
  });

  test('fails closed when the invitation provider violates its contract', async () => {
    const repository = new InMemoryGroupsRepository();
    repository.seedUser('owner');
    const service = new GroupService({
      repository,
      now: () => 1,
      generateInviteCode: () => 'bad',
      hash: sha256,
    });

    await assert.rejects(service.createGroup('owner', { name: 'Equipo Norte' }), /proveedor/);
    assert.equal(repository.state.groups.size, 0);
  });
});

interface RepositoryState {
  groups: Map<string, Group>;
  qrs: Map<string, GroupQr>;
  invites: Map<string, GroupInvite>;
  users: Map<string, UserBalance>;
  paymentRequests: Map<string, GroupPaymentRequest>;
  transactions: Map<string, GroupPaymentTransaction>;
  receipts: Map<string, GroupReceipt>;
  activities: Map<string, GroupActivity>;
}

class InMemoryGroupsRepository implements GroupsRepository {
  state: RepositoryState = emptyState();
  private nextId = 0;

  createId(collection: GroupCollection): string {
    this.nextId += 1;
    return `${collection}-${this.nextId}`;
  }

  seedUser(id: string, balanceInCents = 1_000_000): void {
    this.state.users.set(id, { id, balanceInCents });
  }

  async runTransaction<T>(work: (transaction: GroupTransaction) => Promise<T>): Promise<T> {
    const working = structuredClone(this.state);
    const result = await work(new InMemoryGroupTransaction(working));
    this.state = working;
    return result;
  }
}

class InMemoryGroupTransaction implements GroupTransaction {
  constructor(private readonly state: RepositoryState) {}

  async getGroup(groupId: string) { return this.state.groups.get(groupId) ?? null; }
  async getQr(qrId: string) { return this.state.qrs.get(qrId) ?? null; }
  async getInvite(inviteHash: string) { return this.state.invites.get(inviteHash) ?? null; }
  async getUserBalance(userId: string) { return this.state.users.get(userId) ?? null; }
  async getPaymentRequest(requestId: string) {
    return this.state.paymentRequests.get(requestId) ?? null;
  }
  async listGroupQrs(groupId: string) {
    return [...this.state.qrs.values()].filter((qr) => qr.groupId === groupId);
  }

  createGroup(group: Group) { this.state.groups.set(group.id, group); }
  updateGroup(groupId: string, changes: Partial<Group>) {
    this.state.groups.set(groupId, { ...required(this.state.groups, groupId), ...changes });
  }
  createQr(qr: GroupQr) { this.state.qrs.set(qr.id, qr); }
  updateQr(qrId: string, changes: Partial<GroupQr>) {
    this.state.qrs.set(qrId, { ...required(this.state.qrs, qrId), ...changes });
  }
  createInvite(invite: GroupInvite) { this.state.invites.set(invite.id, invite); }
  updateInvite(inviteHash: string, changes: Partial<GroupInvite>) {
    this.state.invites.set(inviteHash, {
      ...required(this.state.invites, inviteHash),
      ...changes,
    });
  }
  updateUserBalance(userId: string, deltaInCents: number) {
    const user = required(this.state.users, userId);
    this.state.users.set(userId, { ...user, balanceInCents: user.balanceInCents + deltaInCents });
  }
  createPaymentTransaction(payment: GroupPaymentTransaction) {
    this.state.transactions.set(payment.id, payment);
  }
  createGroupReceipt(receipt: GroupReceipt) { this.state.receipts.set(receipt.id, receipt); }
  createPaymentRequest(request: GroupPaymentRequest) {
    this.state.paymentRequests.set(request.id, request);
  }
  createActivity(item: GroupActivity) { this.state.activities.set(item.id, item); }
}

function setup(userIds: string[]) {
  const repository = new InMemoryGroupsRepository();
  userIds.forEach((userId) => repository.seedUser(userId));
  const codes = [FIRST_CODE, SECOND_CODE];
  const service = new GroupService({
    repository,
    now: () => 1_700_000_000_000,
    generateInviteCode: () => codes.shift() ?? SECOND_CODE,
    hash: sha256,
  });
  return { repository, service };
}

function emptyState(): RepositoryState {
  return {
    groups: new Map(),
    qrs: new Map(),
    invites: new Map(),
    users: new Map(),
    paymentRequests: new Map(),
    transactions: new Map(),
    receipts: new Map(),
    activities: new Map(),
  };
}

function receiptAmounts(repository: InMemoryGroupsRepository, transactionId: string) {
  return Object.fromEntries(
    [...repository.state.receipts.values()]
      .filter((receipt) => receipt.transactionId === transactionId)
      .map((receipt) => [receipt.recipientId, receipt.amountInCents]),
  );
}

function groupFixture(): Group {
  return {
    id: 'group',
    name: 'Equipo',
    ownerId: 'owner',
    adminIds: ['admin'],
    memberIds: ['owner', 'admin', 'member'],
    activeMemberIds: ['owner', 'admin', 'member'],
    status: 'active',
    distributionCursor: 0,
    openQrId: 'open',
    activeInviteHash: 'hash',
    createdAt: 1,
    updatedAt: 1,
  };
}

function required<T>(map: Map<string, T>, id: string): T {
  const value = map.get(id);
  if (!value) throw new Error(`Missing fixture ${id}`);
  return value;
}

async function assertRejectsCode(promise: Promise<unknown>, code: GroupError['code']) {
  await assert.rejects(promise, (error: unknown) => (
    error instanceof GroupError && error.code === code
  ));
}

function assertGroupError(operation: () => unknown, code: GroupError['code']): void {
  assert.throws(operation, (error: unknown) => (
    error instanceof GroupError && error.code === code
  ));
}
