import { buildUpdateSet, escapeLike, toPage, WhereBuilder } from '../database/sqlHelpers.js';

const COLUMNS = `
  t.id, t.title, t.description, t.status, t.priority,
  t.project_id   AS "projectId",
  p.name         AS "projectName",
  t.assignee_id  AS "assigneeId",
  a.name         AS "assigneeName",
  t.created_by   AS "createdBy",
  t.due_date     AS "dueDate",
  t.completed_at AS "completedAt",
  t.created_at   AS "createdAt",
  t.updated_at   AS "updatedAt"`;

const FROM = `
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  LEFT JOIN users a ON a.id = t.assignee_id`;

const UPDATABLE = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  assigneeId: 'assignee_id',
  dueDate: 'due_date',
};

// Priority sorts by severity, not alphabetically (enum order: low < medium < high < urgent).
const SORTABLE = {
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
  dueDate: 't.due_date',
  priority: 't.priority',
  title: 't.title',
};

function orderClause(sortBy, sortOrder) {
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return `${SORTABLE[sortBy] ?? 't.created_at'} ${dir} NULLS LAST, t.id`;
}

function applyFilters(where, { status, priority, assigneeId, search }) {
  where
    .addIf(status, 't.status = ?', status)
    .addIf(priority, 't.priority = ?', priority)
    .addIf(assigneeId, 't.assignee_id = ?', assigneeId);
  if (search) where.add('t.title ILIKE ?', `%${escapeLike(search)}%`);
  return where;
}

export function createTaskRepository({ db }) {
  async function paginate(where, { page, limit, sortBy, sortOrder }) {
    const limitP = where.next(limit);
    const offsetP = where.next((page - 1) * limit);
    const { rows } = await db.query(
      `SELECT ${COLUMNS}, COUNT(*) OVER()::int AS "totalCount"
       ${FROM} ${where.toSql()}
       ORDER BY ${orderClause(sortBy, sortOrder)}
       LIMIT ${limitP} OFFSET ${offsetP}`,
      where.values,
    );
    return toPage(rows, { page, limit });
  }

  return {
    async findById(id) {
      const { rows } = await db.query(`SELECT ${COLUMNS} ${FROM} WHERE t.id = $1`, [id]);
      return rows[0] ?? null;
    },

    async create({ projectId, title, description, status, priority, assigneeId, dueDate, createdBy }) {
      const { rows } = await db.query(
        `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date, created_by)
         VALUES ($1, $2, $3, COALESCE($4::task_status, 'todo'), COALESCE($5::task_priority, 'medium'), $6, $7, $8)
         RETURNING id`,
        [projectId, title, description ?? null, status ?? null, priority ?? null, assigneeId ?? null, dueDate ?? null, createdBy],
      );
      return this.findById(rows[0].id);
    },

    async update(id, fields) {
      const { clause, values } = buildUpdateSet(fields, UPDATABLE, 2);
      if (clause) {
        const { rowCount } = await db.query(`UPDATE tasks SET ${clause} WHERE id = $1`, [id, ...values]);
        if (rowCount === 0) return null;
      }
      return this.findById(id);
    },

    async delete(id) {
      const { rowCount } = await db.query('DELETE FROM tasks WHERE id = $1', [id]);
      return rowCount > 0;
    },

    listByProject(projectId, query) {
      const where = applyFilters(new WhereBuilder().add('t.project_id = ?', projectId), query);
      return paginate(where, query);
    },

    listByAssignee(userId, query) {
      const where = applyFilters(new WhereBuilder().add('t.assignee_id = ?', userId), query);
      return paginate(where, query);
    },

    async countByStatusForAssignee(userId) {
      const { rows } = await db.query(
        `SELECT status, COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'done')::int AS overdue
         FROM tasks WHERE assignee_id = $1
         GROUP BY status`,
        [userId],
      );
      return rows;
    },

    /** Overdue open tasks grouped per assignee (used by the scheduled digest function). */
    async findOverdueGroupedByAssignee() {
      const { rows } = await db.query(
        `SELECT u.id AS "userId", u.email, u.name,
                json_agg(json_build_object(
                  'id', t.id, 'title', t.title, 'dueDate', t.due_date, 'projectId', t.project_id
                ) ORDER BY t.due_date) AS tasks
         FROM tasks t JOIN users u ON u.id = t.assignee_id
         WHERE t.status <> 'done' AND t.due_date < CURRENT_DATE AND u.is_active
         GROUP BY u.id`,
      );
      return rows;
    },
  };
}
