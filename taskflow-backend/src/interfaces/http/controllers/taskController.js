import { created, noContent, ok, paged } from '../utils/response.js';

export function createTaskController({ taskService }) {
  return {
    async listByProject(req, res) {
      paged(res, await taskService.listByProject(req.user, req.valid.params.projectId, req.valid.query));
    },

    async listMine(req, res) {
      paged(res, await taskService.listMine(req.user, req.valid.query));
    },

    async myStats(req, res) {
      ok(res, await taskService.myStats(req.user));
    },

    async getById(req, res) {
      ok(res, await taskService.getById(req.user, req.valid.params.id));
    },

    async create(req, res) {
      created(res, await taskService.create(req.user, req.valid.params.projectId, req.valid.body));
    },

    async update(req, res) {
      ok(res, await taskService.update(req.user, req.valid.params.id, req.valid.body));
    },

    async remove(req, res) {
      await taskService.delete(req.user, req.valid.params.id);
      noContent(res);
    },
  };
}
