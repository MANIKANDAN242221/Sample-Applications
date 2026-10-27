import { BadRequestError, ForbiddenError, NotFoundError } from '../../domain/errors.js';
import { projectPolicy } from '../../domain/policies.js';
import { hasPermission, PERMISSIONS } from '../../domain/roles.js';
import { cacheKeys } from '../../infrastructure/redis/cacheService.js';

export function createProjectService({ db, projectRepository, userRepository, cache, logger }) {
  async function loadProject(id) {
    const project = await cache.wrap(cacheKeys.project(id), () => projectRepository.findById(id));
    if (!project) throw new NotFoundError('Project');
    return project;
  }

  async function assertCanView(user, projectId) {
    const project = await loadProject(projectId);
    const quickAllow = projectPolicy.canView(user, project, false);
    if (!quickAllow && !(await projectRepository.isMember(projectId, user.id))) {
      // 404 rather than 403 so project ids are not discoverable by non-members.
      throw new NotFoundError('Project');
    }
    return project;
  }

  async function assertCanManage(user, projectId) {
    const project = await assertCanView(user, projectId);
    if (!projectPolicy.canManage(user, project)) {
      throw new ForbiddenError('Only the project owner or an admin can manage this project');
    }
    return project;
  }

  return {
    assertCanView,
    assertCanManage,

    list(user, query) {
      const seesAll = hasPermission(user.role, PERMISSIONS.PROJECTS_MANAGE_ANY);
      return projectRepository.list({ ...query, userId: seesAll ? null : user.id });
    },

    getById: assertCanView,

    async create(user, { name, description }) {
      const id = await db.withTransaction(async (tx) => {
        const projectId = await projectRepository.create({ name, description, ownerId: user.id }, tx);
        await projectRepository.addMember(projectId, user.id, tx);
        return projectId;
      });
      logger.info({ userId: user.id, projectId: id }, 'Project created');
      return projectRepository.findById(id);
    },

    async update(user, id, changes) {
      await assertCanManage(user, id);
      const project = await projectRepository.update(id, changes);
      if (!project) throw new NotFoundError('Project');
      await cache.del(cacheKeys.project(id));
      return project;
    },

    async delete(user, id) {
      await assertCanManage(user, id);
      await projectRepository.delete(id);
      await cache.del(cacheKeys.project(id));
      logger.info({ userId: user.id, projectId: id }, 'Project deleted');
    },

    async listMembers(user, id) {
      await assertCanView(user, id);
      return projectRepository.listMembers(id);
    },

    async addMember(user, id, memberId) {
      await assertCanManage(user, id);
      const member = await userRepository.findById(memberId);
      if (!member || !member.isActive) throw new BadRequestError('User does not exist or is inactive');
      await projectRepository.addMember(id, memberId);
      return projectRepository.listMembers(id);
    },

    async removeMember(user, id, memberId) {
      const project = await assertCanManage(user, id);
      if (project.ownerId === memberId) throw new BadRequestError('The project owner cannot be removed');
      const removed = await projectRepository.removeMember(id, memberId);
      if (!removed) throw new NotFoundError('Project member');
    },
  };
}
