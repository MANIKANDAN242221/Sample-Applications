/**
 * Idempotent seed: creates the admin account and (optionally) demo users, a project and tasks.
 * Usage: npm run seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const {
  DATABASE_URL,
  BCRYPT_ROUNDS = '12',
  SEED_ADMIN_EMAIL = 'admin@taskflow.local',
  SEED_ADMIN_PASSWORD,
  SEED_ADMIN_NAME = 'System Admin',
  SEED_DEMO_DATA = 'false',
} = process.env;

async function upsertUser(client, { email, name, password, role }) {
  const hash = await bcrypt.hash(password, Number(BCRYPT_ROUNDS));
  const { rows } = await client.query(
    `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
     RETURNING id`,
    [email.toLowerCase(), name, hash, role],
  );
  return rows[0].id;
}

async function seedDemo(client, adminId) {
  const managerId = await upsertUser(client, {
    email: 'manager@taskflow.local', name: 'Maya Manager', password: 'Manager@12345', role: 'manager',
  });
  const memberId = await upsertUser(client, {
    email: 'member@taskflow.local', name: 'Sam Member', password: 'Member@12345', role: 'member',
  });

  const existing = await client.query('SELECT id FROM projects WHERE name = $1', ['Website Redesign']);
  if (existing.rowCount) return;

  const { rows } = await client.query(
    `INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id`,
    ['Website Redesign', 'Refresh the marketing site and improve conversion.', managerId],
  );
  const projectId = rows[0].id;

  await client.query(
    `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2), ($1, $3), ($1, $4)
     ON CONFLICT DO NOTHING`,
    [projectId, managerId, memberId, adminId],
  );

  const tasks = [
    ['Audit current pages', 'done', 'medium', memberId, -10],
    ['Design new homepage', 'in_progress', 'high', memberId, 3],
    ['Write landing page copy', 'todo', 'medium', managerId, 7],
    ['Set up analytics events', 'in_review', 'urgent', memberId, -1],
    ['Accessibility review', 'todo', 'low', null, 14],
  ];
  for (const [title, status, priority, assigneeId, dueInDays] of tasks) {
    await client.query(
      `INSERT INTO tasks (project_id, title, status, priority, assignee_id, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + $6::int, $7)`,
      [projectId, title, status, priority, assigneeId, dueInDays, managerId],
    );
  }
}

async function main() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
  if (!SEED_ADMIN_PASSWORD) throw new Error('SEED_ADMIN_PASSWORD is not set');

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const adminId = await upsertUser(client, {
      email: SEED_ADMIN_EMAIL, name: SEED_ADMIN_NAME, password: SEED_ADMIN_PASSWORD, role: 'admin',
    });
    console.log(`Admin ready: ${SEED_ADMIN_EMAIL}`);

    if (SEED_DEMO_DATA === 'true') {
      await seedDemo(client, adminId);
      console.log('Demo data ready (manager@taskflow.local / Manager@12345, member@taskflow.local / Member@12345)');
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
