import { z } from 'zod';
import { email, password, personName } from './common.schemas.js';

export const registerSchema = {
  body: z.object({ email, name: personName, password }).strict(),
};

export const loginSchema = {
  body: z.object({ email, password: z.string().min(1).max(72) }).strict(),
};

export const updateProfileSchema = {
  body: z.object({ name: personName }).strict(),
};

export const changePasswordSchema = {
  body: z
    .object({ currentPassword: z.string().min(1).max(72), newPassword: password })
    .strict()
    .refine((b) => b.currentPassword !== b.newPassword, {
      message: 'New password must differ from the current password',
      path: ['newPassword'],
    }),
};
