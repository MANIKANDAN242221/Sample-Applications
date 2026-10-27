import { buildUpdateSet, escapeLike, toPage, WhereBuilder } from '../database/sqlHelpers.js';

const COLUMNS = `
  p.id, p.name, p.description, p.status,
  p.owner_id   AS "ownerId",
  o.name       AS "ownerName",
  p.created_at AS "createdAt",
  p.updated_at AS "updatedAt"`;

const UPDATABLE = { name: 'name', description: 'description', status: 'status' };

const SORTABLE = { createdAt: 'p.created_at', updatedAt: 'p.updated_at', name: 'p.name' };

export function createProjectRepository({ db }) {
  return {
    async findById(id) {
      const { rows } = await db.query(
        `SELECT ${COLUMNS}
         FROM projects p JOIN users o ON o.id = p.owner_id
         WHERE p.id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async create({ name, description, ownerId }, executor) {
      const { rows } = await db.query(
        `INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id`,
        [name, description ?? null, ownerId],
        executor,
      );
      return rows[0].id;
    },

    async update(id, fields) {
      const { clause, values } = buildUpdateSet(fields, UPDATABLE, 2);
      if (clause) {
        const { rowCount } = await db.query(`UPDATE projects SET ${clause} WHERE id = $1`, [
          id,
          ...values,
        ]);
        if (rowCount === 0) return null;
      }
      return this.findById(id);
    },

    async delete(id) {
      const { rowCount } = await db.query('DELETE FROM projects WHERE id = $1', [id]);
      return rowCount > 0;
    },

    /**
     * List projects visible to a user. When `userId` is null, all projects are returned (admins).
     */
    async list({ userId, page, limit, search, status, sortBy = 'createdAt', sortOrder = 'desc' }) {
      const where = new WhereBuilder().addIf(status, 'p.status = ?', status);
      if (userId) {
        const p = where.next(userId);
        where.addRaw(
          `(p.owner_id = ${p} OR EXISTS (
             SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ${p}))`,
        );
      }
      if (search) where.add('p.name ILIKE ?', `%${escapeLike(search)}%`);

      const orderBy = `${SORTABLE[sortBy] ?? 'p.created_at'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
      const limitP = where.next(limit);
      const offsetP = where.next((page - 1) * limit);

      const { rows } = await db.query(
        `SELECT ${COLUMNS},
                COALESCE(tc.total, 0)::int AS "taskCount",
                COALESCE(tc.open, 0)::int  AS "openTaskCount",
                COUNT(*) OVER()::int       AS "totalCount"
         FROM projects p
         JOIN users o ON o.id = p.owner_id
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE t.status <> 'done') AS open
           FROM tasks t WHERE t.project_id = p.id
         ) tc ON TRUE
         ${where.toSql()}
         ORDER BY ${orderBy}, p.id
         LIMIT ${limitP} OFFSET ${offsetP}`,
        where.values,
      );
      return toPage(rows, { page, limit });
    },

    async isMember(projectId, userId) {
      const { rowCount } = await db.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId],
      );
      return rowCount > 0;
    },

    async addMember(projectId, userId, executor) {
      await db.query(
        `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [projectId, userId],
        executor,
      );
    },

    async removeMember(projectId, userId) {
      const { rowCount } = await db.query(
        'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId],
      );
      return rowCount > 0;
    },

    async listMembers(projectId) {
      const { rows } = await db.query(
        `SELECT u.id, u.name, u.email, u.role, pm.added_at AS "addedAt"
         FROM project_members pm JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1
         ORDER BY u.name`,
        [projectId],
      );
      return rows;
    },
  };
}
