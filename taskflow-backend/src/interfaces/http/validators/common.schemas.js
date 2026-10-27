import { z } from 'zod';
import { PAGINATION } from '../../../domain/constants.js';

export const uuid = z.string().uuid('Must be a valid UUID');

export const idParams = z.object({ id: uuid });

export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().max(100).optional().transform((v) => v || undefined),
};

export const booleanQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const email = z.string().trim().toLowerCase().email().max(255);

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a digit');

export const personName = z.string().trim().min(2).max(120);

export const nonEmpty = (schema) =>
  schema.refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
