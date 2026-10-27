import { buildUpdateSet, escapeLike, toPage, WhereBuilder } from '../database/sqlHelpers.js';

const COLUMNS = `
  id, email, name, role,
  is_active     AS "isActive",
  last_login_at AS "lastLoginAt",
  created_at    AS "createdAt",
  updated_at    AS "updatedAt"`;

const UPDATABLE = { name: 'name', role: 'role', isActive: 'is_active' };

const SORTABLE = { createdAt: 'created_at', name: 'name', email: 'email', role: 'role' };

export function createUserRepository({ db }) {
  return {
    async findById(id) {
      const { rows } = await db.query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async findByEmailWithPassword(email) {
      const { rows } = await db.query(
        `SELECT ${COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
        [email],
      );
      return rows[0] ?? null;
    },

    async findPasswordHash(id) {
      const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [id]);
      return rows[0]?.password_hash ?? null;
    },

    async create({ email, name, passwordHash, role }, executor) {
      const { rows } = await db.query(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLUMNS}`,
        [email, name, passwordHash, role],
        executor,
      );
      return rows[0];
    },

    async update(id, fields) {
      const { clause, values } = buildUpdateSet(fields, UPDATABLE, 2);
      if (!clause) return this.findById(id);
      const { rows } = await db.query(
        `UPDATE users SET ${clause} WHERE id = $1 RETURNING ${COLUMNS}`,
        [id, ...values],
      );
      return rows[0] ?? null;
    },

    async updatePassword(id, passwordHash) {
      await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
    },

    async touchLastLogin(id) {
      await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
    },

    async delete(id) {
      const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async list({ page, limit, search, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' }) {
      const where = new WhereBuilder()
        .addIf(role, 'role = ?', role)
        .addIf(isActive !== undefined, 'is_active = ?', isActive);
      if (search) {
        const p = where.next(`%${escapeLike(search)}%`);
        where.addRaw(`(name ILIKE ${p} OR email ILIKE ${p})`);
      }
      const orderBy = `${SORTABLE[sortBy] ?? 'created_at'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
      const limitP = where.next(limit);
      const offsetP = where.next((page - 1) * limit);

      const { rows } = await db.query(
        `SELECT ${COLUMNS}, COUNT(*) OVER()::int AS "totalCount"
         FROM users ${where.toSql()}
         ORDER BY ${orderBy}, id
         LIMIT ${limitP} OFFSET ${offsetP}`,
        where.values,
      );
      return toPage(rows, { page, limit });
    },
  };
}
