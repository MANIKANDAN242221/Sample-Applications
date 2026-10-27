import { z } from 'zod';
import { PROJECT_STATUSES } from '../../../domain/constants.js';
import { idParams, nonEmpty, paginationQuery, uuid } from './common.schemas.js';

const name = z.string().trim().min(2).max(150);
const description = z.string().trim().max(5000).nullable();

export const listProjectsSchema = {
  query: z.object({
    ...paginationQuery,
    status: z.enum(PROJECT_STATUSES).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  }),
};

export const getProjectSchema = { params: idParams };

export const createProjectSchema = {
  body: z.object({ name, description: description.optional() }).strict(),
};

export const updateProjectSchema = {
  params: idParams,
  body: nonEmpty(
    z
      .object({
        name: name.optional(),
        description: description.optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
      })
      .strict(),
  ),
};

export const addMemberSchema = {
  params: idParams,
  body: z.object({ userId: uuid }).strict(),
};

export const removeMemberSchema = {
  params: z.object({ id: uuid, userId: uuid }),
};
