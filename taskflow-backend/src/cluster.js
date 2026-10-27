/**
 * Optional multi-core entry point (npm run start:cluster).
 * Forks one worker per CPU (or WEB_CONCURRENCY). The API is stateless — sessions, cache and
 * rate-limit counters live in Redis — so workers and separate hosts can scale horizontally.
 */
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

const workers = Number(process.env.WEB_CONCURRENCY) || availableParallelism();

if (cluster.isPrimary) {
  console.error(`[cluster] primary ${process.pid} starting ${workers} workers`);
  for (let i = 0; i < workers; i += 1) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGINT' || code === 0) return;
    console.error(`[cluster] worker ${worker.process.pid} died (code ${code}); restarting`);
    cluster.fork();
  });

  const stop = (signal) => {
    for (const worker of Object.values(cluster.workers)) worker?.process.kill(signal);
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
} else {
  await import('./server.js');
}
