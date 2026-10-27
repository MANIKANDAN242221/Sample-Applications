import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { requireCsrfHeader } from '../middlewares/requireCsrfHeader.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/auth.schemas.js';

export function createAuthRoutes({ authController: c, authenticate, authRateLimiter }) {
  const router = Router();

  router.post('/register', authRateLimiter, validate(registerSchema), c.register);
  router.post('/login', authRateLimiter, validate(loginSchema), c.login);
  router.post('/refresh', requireCsrfHeader, c.refresh);
  router.post('/logout', requireCsrfHeader, c.logout);

  router.post('/logout-all', authenticate, c.logoutAll);
  router.get('/me', authenticate, c.me);
  router.patch('/me', authenticate, validate(updateProfileSchema), c.updateMe);
  router.post('/change-password', authenticate, authRateLimiter, validate(changePasswordSchema), c.changePassword);

  return router;
}
