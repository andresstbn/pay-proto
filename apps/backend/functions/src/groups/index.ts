import { Firestore } from 'firebase-admin/firestore';
import { generateInviteCode, sha256 } from './crypto';
import { FirestoreGroupsRepository } from './firestore-repository';
import { createGroupHandlers } from './handlers';
import { GroupService } from './service';

export function createGroupFunctions(firestore: Firestore) {
  const service = new GroupService({
    repository: new FirestoreGroupsRepository(firestore),
    now: Date.now,
    generateInviteCode,
    hash: sha256,
  });
  return createGroupHandlers(service);
}

export * from './domain';
export * from './policy';
export * from './repository';
export * from './service';
