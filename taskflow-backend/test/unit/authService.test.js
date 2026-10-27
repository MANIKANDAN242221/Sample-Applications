import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createAuthService } from '../../src/application/services/authService.js';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../src/domain/errors.js';
import { createPasswordHasher } from '../../src/infrastructure/security/passwordHasher.js';
import { createTokenService } from '../../src/infrastructure/security/tokenService.js';
import { createFakeSessionStore, silentLogger, testConfig } from '../helpers/fakes.js';

function createFakeUserRepository() {
  const users = new Map();
  return {
    users,
    async create({ email, name, passwordHash, role }) {
      if ([...users.values()].some((u) => u.email === email)) {
        throw Object.assign(new Error('duplicate'), { code: '23505' });
      }
      const user = { id: crypto.randomUUID(), email, name, role, isActive: true, passwordHash };
      users.set(user.id, user);
      const { passwordHash: _p, ...rest } = user;
      return rest;
    },
    async findByEmailWithPassword(email) {
      return [...users.values()].find((u) => u.email === email) ?? null;
    },
    async findPasswordHash(id) {
      return users.get(id)?.passwordHash ?? null;
    },
    async updatePassword(id, hash) {
      users.get(id).passwordHash = hash;
    },
    async touchLastLogin() {},
  };
}

describe('authService', () => {
  let service;
  let repo;
  let sessions;
  const meta = { ip: '127.0.0.1', userAgent: 'test' };
  const creds = { email: 'jane@example.com', name: 'Jane', password: 'Secret123' };

  beforeEach(() => {
    repo = createFakeUserRepository();
    sessions = createFakeSessionStore();
    const userService = {
      async getActiveUser(id) {
        const u = repo.users.get(id);
        if (!u?.isActive) throw new UnauthorizedError();
        return u;
      },
    };
    service = createAuthService({
      userRepository: repo,
      userService,
      passwordHasher: createPasswordHasher({ rounds: 4 }),
      tokenService: createTokenService({ config: testConfig }),
      sessionStore: sessions,
      logger: silentLogger,
    });
  });

  it('registers a member and opens a session', async () => {
    const result = await service.register(creds, meta);
    assert.equal(result.user.role, 'member');
    assert.ok(result.accessToken && result.refreshToken);
    assert.equal(sessions.sessions.size, 1);
    assert.ok(!('passwordHash' in result.user));
  });

  it('rejects duplicate emails with ConflictError', async () => {
    await service.register(creds, meta);
    await assert.rejects(service.register(creds, meta), ConflictError);
  });

  it('rejects bad credentials and disabled accounts', async () => {
    await service.register(creds, meta);
    await assert.rejects(service.login({ ...creds, password: 'Wrong1234' }, meta), UnauthorizedError);
    await assert.rejects(service.login({ email: 'nobody@example.com', password: 'x' }, meta), UnauthorizedError);

    [...repo.users.values()][0].isActive = false;
    await assert.rejects(service.login(creds, meta), ForbiddenError);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const { refreshToken } = await service.register(creds, meta);
    const rotated = await service.refresh(refreshToken);
    assert.notEqual(rotated.refreshToken, refreshToken);

    // Replaying the old token revokes the whole session.
    await assert.rejects(service.refresh(refreshToken), UnauthorizedError);
    await assert.rejects(service.refresh(rotated.refreshToken), UnauthorizedError);
    assert.equal(sessions.sessions.size, 0);
  });

  it('logout revokes the session and tolerates garbage tokens', async () => {
    const { refreshToken } = await service.register(creds, meta);
    await service.logout('not-a-token');
    await service.logout(refreshToken);
    assert.equal(sessions.sessions.size, 0);
  });

  it('changePassword verifies the current password and revokes sessions', async () => {
    const { user } = await service.register(creds, meta);
    await assert.rejects(
      service.changePassword(user.id, { currentPassword: 'Nope1234', newPassword: 'Newpass123' }),
      UnauthorizedError,
    );
    await service.changePassword(user.id, { currentPassword: creds.password, newPassword: 'Newpass123' });
    assert.equal(sessions.sessions.size, 0);
    await service.login({ email: creds.email, password: 'Newpass123' }, meta);
  });
});
