/**
 * Role-Based Access Control definitions.
 * Roles map to a fixed set of permissions; routes and policies check permissions, never roles,
 * so adding a role only requires editing ROLE_PERMISSIONS.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
});

export const PERMISSIONS = Object.freeze({
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',
  PROJECTS_READ: 'projects:read',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_MANAGE_ANY: 'projects:manage:any',
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',
  TASKS_DELETE: 'tasks:delete',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: new Set(Object.values(PERMISSIONS)),
  [ROLES.MANAGER]: new Set([
    PERMISSIONS.USERS_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.TASKS_DELETE,
  ]),
  [ROLES.MEMBER]: new Set([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
  ]),
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function permissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
