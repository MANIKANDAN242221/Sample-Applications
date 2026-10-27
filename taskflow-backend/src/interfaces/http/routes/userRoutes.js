import { Router } from 'express';
import { PERMISSIONS } from '../../../domain/roles.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { getUserSchema, listUsersSchema, updateUserSchema } from '../validators/user.schemas.js';

export function createUserRoutes({ userController: c, authenticate }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', authorize(PERMISSIONS.USERS_READ), validate(listUsersSchema), c.list);
  router.get('/:id', authorize(PERMISSIONS.USERS_READ), validate(getUserSchema), c.getById);
  router.patch('/:id', authorize(PERMISSIONS.USERS_MANAGE), validate(updateUserSchema), c.update);
  router.delete('/:id', authorize(PERMISSIONS.USERS_MANAGE), validate(getUserSchema), c.remove);

  return router;
}
