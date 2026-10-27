/**
 * Optional scheduled serverless function: builds a digest of overdue tasks per assignee.
 * Plug the `digests` into your notification channel (email, Slack, ...) in `deliver`.
 *
 * A Redis lock guarantees a single run per day even if the scheduler fires more than once.
 */
import { getContainer, logger } from '../bootstrap.js';

const LOCK_TTL_SECONDS = 60 * 60 * 23;

async function deliver(digest) {
  // Integration point for a mailer / notification service.
  logger.info({ userId: digest.userId, overdue: digest.tasks.length }, 'Overdue digest prepared');
}

export async function handler(_event, context) {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  const { redis, repositories } = await getContainer();

  const today = new Date().toISOString().slice(0, 10);
  const acquired = await redis.set(`jobs:overdue-digest:${today}`, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
  if (!acquired) {
    logger.info({ day: today }, 'Overdue digest already processed');
    return { status: 'skipped', day: today };
  }

  const digests = await repositories.taskRepository.findOverdueGroupedByAssignee();
  const results = await Promise.allSettled(digests.map(deliver));
  const failed = results.filter((r) => r.status === 'rejected').length;

  logger.info({ users: digests.length, failed }, 'Overdue digest completed');
  return { status: 'ok', day: today, users: digests.length, failed };
}
