import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ProfileRecord,
  ProfileRepository,
  ProfileService,
} from '../profile-service';

class FakeProfileRepository implements ProfileRepository {
  synced: ProfileRecord[] = [];
  ensured: ProfileRecord[] = [];

  async syncProfile(profile: ProfileRecord): Promise<void> {
    this.synced.push(profile);
  }

  async ensureProfile(profile: ProfileRecord): Promise<void> {
    this.ensured.push(profile);
  }
}

describe('ProfileService', () => {
  it('normalizes the social profile before synchronizing it', async () => {
    const repository = new FakeProfileRepository();
    const service = new ProfileService(repository);

    await service.syncOwnProfile(
      { userId: 'user-1', email: 'person@example.com' },
      { displayName: '  Person  ', photoUrl: '  https://example.com/photo  ' },
    );

    assert.deepEqual(repository.synced, [{
      userId: 'user-1',
      email: 'person@example.com',
      displayName: 'Person',
      photoUrl: 'https://example.com/photo',
    }]);
  });

  it('uses a safe fallback and creates missing profiles through the repository', async () => {
    const repository = new FakeProfileRepository();
    const service = new ProfileService(repository);

    await service.ensureProfile(
      { userId: 'user-2', email: 'fallback@example.com' },
      { displayName: null, photoUrl: undefined },
    );
    await service.ensureProfile(
      { userId: 'user-3', email: undefined },
      { displayName: '', photoUrl: '' },
    );

    assert.equal(repository.ensured[0]?.displayName, 'fallback');
    assert.equal(repository.ensured[1]?.displayName, 'Usuario');
  });

  it('rejects non-text and oversized profile fields', async () => {
    const service = new ProfileService(new FakeProfileRepository());

    assert.throws(
      () => service.syncOwnProfile(
        { userId: 'user-1', email: '' },
        { displayName: 42, photoUrl: '' },
      ),
      /displayName debe ser texto/,
    );
    assert.throws(
      () => service.syncOwnProfile(
        { userId: 'user-1', email: '' },
        { displayName: '', photoUrl: 'x'.repeat(501) },
      ),
      /photoUrl es demasiado largo/,
    );
  });
});
