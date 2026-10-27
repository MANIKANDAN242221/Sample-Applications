import { z } from 'zod';
import { ALL_ROLES } from '../../../domain/roles.js';
import { booleanQuery, idParams, nonEmpty, paginationQuery, personName } from './common.schemas.js';

export const listUsersSchema = {
  query: z.object({
    ...paginationQuery,
    role: z.enum(ALL_ROLES).optional(),
    isActive: booleanQuery,
    sortBy: z.enum(['createdAt', 'name', 'email', 'role']).default('createdAt'),
  }),
};

export const getUserSchema = { params: idParams };

export const updateUserSchema = {
  params: idParams,
  body: nonEmpty(
    z
      .object({
        name: personName.optional(),
        role: z.enum(ALL_ROLES).optional(),
        isActive: z.boolean().optional(),
      })
      .strict(),
  ),
};
