import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { projectPolicy, taskPolicy } from '../../src/domain/policies.js';
import { hasPermission, PERMISSIONS, permissionsForRole, ROLES } from '../../src/domain/roles.js';

describe('roles', () => {
  it('grants admins every permission', () => {
    for (const p of Object.values(PERMISSIONS)) assert.ok(hasPermission(ROLES.ADMIN, p), p);
  });

  it('restricts members', () => {
    assert.ok(hasPermission(ROLES.MEMBER, PERMISSIONS.TASKS_WRITE));
    assert.ok(!hasPermission(ROLES.MEMBER, PERMISSIONS.PROJECTS_CREATE));
    assert.ok(!hasPermission(ROLES.MEMBER, PERMISSIONS.USERS_READ));
  });

  it('lets managers read but not manage users', () => {
    assert.ok(hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_READ));
    assert.ok(!hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_MANAGE));
  });

  it('returns no permissions for unknown roles', () => {
    assert.equal(hasPermission('ghost', PERMISSIONS.TASKS_READ), false);
    assert.deepEqual(permissionsForRole('ghost'), []);
  });
});

describe('policies', () => {
  const owner = { id: 'u1', role: ROLES.MANAGER };
  const other = { id: 'u2', role: ROLES.MEMBER };
  const admin = { id: 'u3', role: ROLES.ADMIN };
  const project = { id: 'p1', ownerId: 'u1' };

  it('project visibility', () => {
    assert.ok(projectPolicy.canView(owner, project, false));
    assert.ok(projectPolicy.canView(admin, project, false));
    assert.ok(projectPolicy.canView(other, project, true));
    assert.ok(!projectPolicy.canView(other, project, false));
  });

  it('project management', () => {
    assert.ok(projectPolicy.canManage(owner, project));
    assert.ok(projectPolicy.canManage(admin, project));
    assert.ok(!projectPolicy.canManage(other, project));
  });

  it('task deletion', () => {
    const manager = { id: 'u4', role: ROLES.MANAGER };
    assert.ok(taskPolicy.canDelete(manager, project, { createdBy: 'u4' }));
    assert.ok(!taskPolicy.canDelete(manager, project, { createdBy: 'u2' }));
    assert.ok(!taskPolicy.canDelete(other, project, { createdBy: 'u2' }));
    assert.ok(taskPolicy.canDelete(owner, project, { createdBy: 'u2' }));
  });
});
