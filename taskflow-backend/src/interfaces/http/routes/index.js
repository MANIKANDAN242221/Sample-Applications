import { Router } from 'express';
import { createAuthRoutes } from './authRoutes.js';
import { createProjectRoutes } from './projectRoutes.js';
import { createTaskRoutes } from './taskRoutes.js';
import { createUserRoutes } from './userRoutes.js';

export function createApiRouter(deps) {
  const router = Router();
  router.use('/auth', createAuthRoutes(deps));
  router.use('/users', createUserRoutes(deps));
  router.use('/projects', createProjectRoutes(deps));
  router.use('/tasks', createTaskRoutes(deps));
  return router;
}

export function createHealthRouter({ healthController }) {
  const router = Router();
  router.get('/', healthController.live);
  router.get('/ready', healthController.ready);
  return router;
}
