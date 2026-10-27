import { Router } from 'express';
import { PERMISSIONS } from '../../../domain/roles.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import {
  addMemberSchema,
  createProjectSchema,
  getProjectSchema,
  listProjectsSchema,
  removeMemberSchema,
  updateProjectSchema,
} from '../validators/project.schemas.js';
import { createTaskSchema, listProjectTasksSchema } from '../validators/task.schemas.js';

export function createProjectRoutes({ projectController: c, taskController: t, authenticate }) {
  const router = Router();
  router.use(authenticate);

  const canRead = authorize(PERMISSIONS.PROJECTS_READ);

  router.get('/', canRead, validate(listProjectsSchema), c.list);
  router.post('/', authorize(PERMISSIONS.PROJECTS_CREATE), validate(createProjectSchema), c.create);
  router.get('/:id', canRead, validate(getProjectSchema), c.getById);
  // Ownership (owner or admin) for update/delete/members is enforced by the project policy.
  router.patch('/:id', canRead, validate(updateProjectSchema), c.update);
  router.delete('/:id', canRead, validate(getProjectSchema), c.remove);

  router.get('/:id/members', canRead, validate(getProjectSchema), c.listMembers);
  router.post('/:id/members', canRead, validate(addMemberSchema), c.addMember);
  router.delete('/:id/members/:userId', canRead, validate(removeMemberSchema), c.removeMember);

  router.get('/:projectId/tasks', authorize(PERMISSIONS.TASKS_READ), validate(listProjectTasksSchema), t.listByProject);
  router.post('/:projectId/tasks', authorize(PERMISSIONS.TASKS_WRITE), validate(createTaskSchema), t.create);

  return router;
}
