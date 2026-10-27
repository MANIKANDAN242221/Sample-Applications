import { noContent, ok, paged } from '../utils/response.js';

export function createUserController({ userService }) {
  return {
    async list(req, res) {
      paged(res, await userService.list(req.valid.query));
    },

    async getById(req, res) {
      ok(res, await userService.getById(req.valid.params.id));
    },

    async update(req, res) {
      ok(res, await userService.updateByAdmin(req.user, req.valid.params.id, req.valid.body));
    },

    async remove(req, res) {
      await userService.delete(req.user, req.valid.params.id);
      noContent(res);
    },
  };
}
