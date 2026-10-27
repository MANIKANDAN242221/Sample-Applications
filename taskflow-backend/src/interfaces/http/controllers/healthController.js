const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms).unref()),
  ]);

export function createHealthController({ db, redis }) {
  async function check(name, fn) {
    const start = performance.now();
    try {
      await withTimeout(fn(), 2_000);
      return [name, { status: 'up', latencyMs: Math.round(performance.now() - start) }];
    } catch (err) {
      return [name, { status: 'down', error: err.message }];
    }
  }

  return {
    /** Liveness: the process is running. */
    live(_req, res) {
      res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
    },

    /** Readiness: dependencies are reachable. */
    async ready(_req, res) {
      const checks = Object.fromEntries(
        await Promise.all([check('postgres', () => db.ping()), check('redis', () => redis.ping())]),
      );
      const healthy = Object.values(checks).every((c) => c.status === 'up');
      res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
    },
  };
}
