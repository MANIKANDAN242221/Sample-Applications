import { hasPermission, PERMISSIONS } from './roles.js';

/**
 * Resource-level authorization rules (who may act on *this* project / task).
 * Route-level permission checks live in the authorize middleware; these complement them.
 */
export const projectPolicy = Object.freeze({
  canView(user, project, isMember) {
    return (
      hasPermission(user.role, PERMISSIONS.PROJECTS_MANAGE_ANY) ||
      project.ownerId === user.id ||
      Boolean(isMember)
    );
  },

  canManage(user, project) {
    return hasPermission(user.role, PERMISSIONS.PROJECTS_MANAGE_ANY) || project.ownerId === user.id;
  },
});

export const taskPolicy = Object.freeze({
  canDelete(user, project, task) {
    return (
      projectPolicy.canManage(user, project) ||
      (hasPermission(user.role, PERMISSIONS.TASKS_DELETE) && task.createdBy === user.id)
    );
  },
});
