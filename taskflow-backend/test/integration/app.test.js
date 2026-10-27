import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { NotFoundError } from '../../src/domain/errors.js';
import { ROLES } from '../../src/domain/roles.js';
import { createTokenService } from '../../src/infrastructure/security/tokenService.js';
import {
  createFakeSessionStore,
  createMemoryRateLimitStore,
  silentLogger,
  testConfig,
} from '../helpers/fakes.js';

const users = {
  admin: { id: '11111111-1111-4111-8111-111111111111', email: 'a@x.io', name: 'Admin', role: ROLES.ADMIN, isActive: true },
  member: { id: '22222222-2222-4222-8222-222222222222', email: 'm@x.io', name: 'Member', role: ROLES.MEMBER, isActive: true },
};

describe('HTTP app', () => {
  let app;
  let tokens;

  before(async () => {
    const tokenService = createTokenService({ config: testConfig });
    const sessionStore = createFakeSessionStore();

    tokens = {};
    for (const [key, user] of Object.entries(users)) {
      const sid = `sid-${key}`;
      await sessionStore.create(sid, { userId: user.id, jti: 'j' });
      tokens[key] = tokenService.signAccessToken(user, sid).token;
    }

    const userService = {
      async getActiveUser(id) {
        return Object.values(users).find((u) => u.id === id);
      },
      async list() {
        return { items: Object.values(users), meta: { page: 1, limit: 20, total: 2, totalPages: 1 } };
      },
      async getById() {
        throw new NotFoundError('User');
      },
    };

    app = createApp({
      config: testConfig,
      logger: silentLogger,
      tokenService,
      sessionStore,
      rateLimitStore: createMemoryRateLimitStore(),
      db: { ping: async () => {} },
      redis: { ping: async () => 'PONG' },
      services: {
        userService,
        authService: { login: async () => { throw new Error('boom'); } },
        projectService: {},
        taskService: {},
      },
    });
  });

  it('GET /health and /health/ready', async () => {
    await request(app).get('/health').expect(200);
    const res = await request(app).get('/health/ready').expect(200);
    assert.equal(res.body.checks.postgres.status, 'up');
  });

  it('returns 404 envelope with request id for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope').expect(404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.requestId);
    assert.equal(res.headers['x-request-id'], res.body.error.requestId);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/users').expect(401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
    await request(app).get('/api/v1/users').set('Authorization', 'Bearer garbage').expect(401);
  });

  it('enforces RBAC', async () => {
    await request(app).get('/api/v1/users').set('Authorization', `Bearer ${tokens.member}`).expect(403);
    const res = await request(app)
      .get('/api/v1/users?page=1&limit=20')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.meta.total, 2);
  });

  it('validates input', async () => {
    const res = await request(app)
      .get('/api/v1/users/not-a-uuid')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.details[0].location, 'params');
  });

  it('rejects malformed JSON', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
  });

  it('hides internal error details behind a 500 envelope', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'x@y.io', password: 'whatever' })
      .expect(500);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
    assert.equal(res.body.error.message, 'An unexpected error occurred');
  });

  it('rate limits auth endpoints', async () => {
    let last;
    for (let i = 0; i < 3; i += 1) {
      last = await request(app).post('/api/v1/auth/login').send({});
    }
    assert.equal(last.status, 429);
    assert.ok(last.headers['retry-after']);
  });

  it('requires the CSRF header on refresh', async () => {
    await request(app).post('/api/v1/auth/refresh').expect(403);
  });
});
