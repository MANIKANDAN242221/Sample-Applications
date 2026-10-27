import { BadRequestError, ForbiddenError, NotFoundError } from '../../domain/errors.js';
import { taskPolicy } from '../../domain/policies.js';
import { TASK_STATUSES } from '../../domain/constants.js';
import { cacheKeys } from '../../infrastructure/redis/cacheService.js';

const STATS_TTL_SECONDS = 60;

export function createTaskService({ taskRepository, projectRepository, projectService, cache }) {
  async function assertAssignable(project, assigneeId) {
    if (!assigneeId || assigneeId === project.ownerId) return;
    if (!(await projectRepository.isMember(project.id, assigneeId))) {
      throw new BadRequestError('Assignee must be a member of the project');
    }
  }

  async function loadTaskForUser(user, taskId) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new NotFoundError('Task');
    try {
      const project = await projectService.assertCanView(user, task.projectId);
      return { task, project };
    } catch (err) {
      if (err instanceof NotFoundError) throw new NotFoundError('Task');
      throw err;
    }
  }

  function invalidateStats(...userIds) {
    const keys = [...new Set(userIds.filter(Boolean))].map(cacheKeys.userTaskStats);
    return cache.del(...keys);
  }

  return {
    async listByProject(user, projectId, query) {
      await projectService.assertCanView(user, projectId);
      return taskRepository.listByProject(projectId, query);
    },

    listMine(user, query) {
      return taskRepository.listByAssignee(user.id, query);
    },

    async myStats(user) {
      return cache.wrap(
        cacheKeys.userTaskStats(user.id),
        async () => {
          const rows = await taskRepository.countByStatusForAssignee(user.id);
          const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
          let total = 0;
          let overdue = 0;
          for (const row of rows) {
            byStatus[row.status] = row.count;
            total += row.count;
            overdue += row.overdue;
          }
          return { total, overdue, byStatus };
        },
        STATS_TTL_SECONDS,
      );
    },

    async getById(user, taskId) {
      return (await loadTaskForUser(user, taskId)).task;
    },

    async create(user, projectId, data) {
      const project = await projectService.assertCanView(user, projectId);
      if (project.status === 'archived') throw new BadRequestError('Cannot add tasks to an archived project');
      await assertAssignable(project, data.assigneeId);
      const task = await taskRepository.create({ ...data, projectId, createdBy: user.id });
      await invalidateStats(task.assigneeId);
      return task;
    },

    async update(user, taskId, changes) {
      const { task, project } = await loadTaskForUser(user, taskId);
      if (changes.assigneeId !== undefined) await assertAssignable(project, changes.assigneeId);
      const updated = await taskRepository.update(taskId, changes);
      await invalidateStats(task.assigneeId, updated.assigneeId);
      return updated;
    },

    async delete(user, taskId) {
      const { task, project } = await loadTaskForUser(user, taskId);
      if (!taskPolicy.canDelete(user, project, task)) {
        throw new ForbiddenError('You are not allowed to delete this task');
      }
      await taskRepository.delete(taskId);
      await invalidateStats(task.assigneeId);
    },
  };
}
