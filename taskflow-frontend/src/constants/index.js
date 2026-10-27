// Must match the backend's src/domain/roles.js. The server remains the source of truth:
// /auth/me returns the user's effective permissions, and every endpoint re-checks them.
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

export const ROLES = ['admin', 'manager', 'member'];

export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'done', label: 'Done' },
];

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;

export const PAGE_SIZE = 10;
