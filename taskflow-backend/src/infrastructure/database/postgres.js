import pg from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of timezone-shifted JS Dates.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const SLOW_QUERY_MS = 500;

export function createDatabase({ config, logger }) {
  const pool = new pg.Pool({
    connectionString: config.db.url,
    max: config.db.poolMax,
    ssl: config.db.ssl,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: config.db.statementTimeoutMs,
    application_name: 'taskflow-api',
  });

  pool.on('error', (err) => logger.error({ err }, 'Unexpected PostgreSQL idle client error'));

  /**
   * Run a parameterized query. Pass a transaction client as `executor` to run inside a transaction.
   */
  async function query(text, params = [], executor = pool) {
    const start = performance.now();
    try {
      return await executor.query(text, params);
    } finally {
      const durationMs = Math.round(performance.now() - start);
      if (durationMs >= SLOW_QUERY_MS) {
        logger.warn({ durationMs, query: text.replace(/\s+/g, ' ').slice(0, 300) }, 'Slow query');
      }
    }
  }

  async function withTransaction(work) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch((rollbackErr) =>
        logger.error({ err: rollbackErr }, 'Transaction rollback failed'),
      );
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    pool,
    query,
    withTransaction,
    ping: () => pool.query('SELECT 1'),
    close: () => pool.end(),
  };
}
