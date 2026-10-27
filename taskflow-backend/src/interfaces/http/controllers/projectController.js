import { created, noContent, ok, paged } from '../utils/response.js';

export function createProjectController({ projectService }) {
  return {
    async list(req, res) {
      paged(res, await projectService.list(req.user, req.valid.query));
    },

    async getById(req, res) {
      ok(res, await projectService.getById(req.user, req.valid.params.id));
    },

    async create(req, res) {
      created(res, await projectService.create(req.user, req.valid.body));
    },

    async update(req, res) {
      ok(res, await projectService.update(req.user, req.valid.params.id, req.valid.body));
    },

    async remove(req, res) {
      await projectService.delete(req.user, req.valid.params.id);
      noContent(res);
    },

    async listMembers(req, res) {
      ok(res, await projectService.listMembers(req.user, req.valid.params.id));
    },

    async addMember(req, res) {
      created(res, await projectService.addMember(req.user, req.valid.params.id, req.valid.body.userId));
    },

    async removeMember(req, res) {
      const { id, userId } = req.valid.params;
      await projectService.removeMember(req.user, id, userId);
      noContent(res);
    },
  };
}
