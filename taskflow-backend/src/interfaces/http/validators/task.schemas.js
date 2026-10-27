import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../../domain/constants.js';
import { idParams, nonEmpty, paginationQuery, uuid } from './common.schemas.js';

const title = z.string().trim().min(1).max(200);
const description = z.string().trim().max(10_000).nullable();
const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
  .nullable();

const filters = {
  ...paginationQuery,
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title']).default('createdAt'),
};

export const listProjectTasksSchema = {
  params: z.object({ projectId: uuid }),
  query: z.object({ ...filters, assigneeId: uuid.optional() }),
};

export const listMyTasksSchema = {
  query: z.object(filters),
};

export const getTaskSchema = { params: idParams };

export const createTaskSchema = {
  params: z.object({ projectId: uuid }),
  body: z
    .object({
      title,
      description: description.optional(),
      status: z.enum(TASK_STATUSES).optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      assigneeId: uuid.nullable().optional(),
      dueDate: dueDate.optional(),
    })
    .strict(),
};

export const updateTaskSchema = {
  params: idParams,
  body: nonEmpty(
    z
      .object({
        title: title.optional(),
        description: description.optional(),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
        assigneeId: uuid.nullable().optional(),
        dueDate: dueDate.optional(),
      })
      .strict(),
  ),
};
