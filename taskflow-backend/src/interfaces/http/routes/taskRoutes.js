import { Router } from 'express';
import { PERMISSIONS } from '../../../domain/roles.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { getTaskSchema, listMyTasksSchema, updateTaskSchema } from '../validators/task.schemas.js';

export function createTaskRoutes({ taskController: c, authenticate }) {
  const router = Router();
  router.use(authenticate);

  const canRead = authorize(PERMISSIONS.TASKS_READ);

  // Static paths must be registered before "/:id".
  router.get('/mine', canRead, validate(listMyTasksSchema), c.listMine);
  router.get('/mine/stats', canRead, c.myStats);

  router.get('/:id', canRead, validate(getTaskSchema), c.getById);
  router.patch('/:id', authorize(PERMISSIONS.TASKS_WRITE), validate(updateTaskSchema), c.update);
  // Deletion rights (owner / admin / creating manager) are enforced by the task policy.
  router.delete('/:id', authorize(PERMISSIONS.TASKS_WRITE), validate(getTaskSchema), c.remove);

  return router;
}
