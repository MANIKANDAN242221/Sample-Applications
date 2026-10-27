import { BadRequestError, NotFoundError, UnauthorizedError } from '../../domain/errors.js';
import { cacheKeys } from '../../infrastructure/redis/cacheService.js';
import { PG_ERROR } from '../../infrastructure/database/sqlHelpers.js';

export function createUserService({ userRepository, sessionStore, cache, logger }) {
  async function findCached(id) {
    return cache.wrap(cacheKeys.user(id), () => userRepository.findById(id));
  }

  async function getOrThrow(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  return {
    /** Used on every authenticated request; served from Redis to avoid a DB round-trip. */
    async getActiveUser(id) {
      const user = await findCached(id);
      if (!user || !user.isActive) throw new UnauthorizedError('Account is unavailable');
      return user;
    },

    getById: getOrThrow,

    list(query) {
      return userRepository.list(query);
    },

    async updateProfile(userId, { name }) {
      const user = await userRepository.update(userId, { name });
      await cache.del(cacheKeys.user(userId));
      return user;
    },

    async updateByAdmin(actor, id, changes) {
      if (actor.id === id && (changes.role !== undefined || changes.isActive === false)) {
        throw new BadRequestError('You cannot change your own role or deactivate yourself');
      }
      const user = await userRepository.update(id, changes);
      if (!user) throw new NotFoundError('User');
      await cache.del(cacheKeys.user(id));

      if (changes.isActive === false) await sessionStore.revokeAllForUser(id);
      logger.info({ actorId: actor.id, userId: id, changes }, 'User updated by admin');
      return user;
    },

    async delete(actor, id) {
      if (actor.id === id) throw new BadRequestError('You cannot delete your own account');
      try {
        const deleted = await userRepository.delete(id);
        if (!deleted) throw new NotFoundError('User');
      } catch (err) {
        if (err.code === PG_ERROR.FOREIGN_KEY_VIOLATION) {
          throw new BadRequestError(
            'User still owns projects; transfer or delete them first, or deactivate the user instead',
          );
        }
        throw err;
      }
      await Promise.all([cache.del(cacheKeys.user(id)), sessionStore.revokeAllForUser(id)]);
      logger.info({ actorId: actor.id, userId: id }, 'User deleted');
    },
  };
}
