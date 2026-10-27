/**
 * Optional serverless entry point: runs the same Express app inside a function runtime
 * (AWS Lambda / API Gateway compatible event shape via serverless-http).
 * The server-based entry point (src/server.js) remains the primary deployment mode.
 */
import serverless from 'serverless-http';
import { createApp } from '../app.js';
import { getContainer } from './bootstrap.js';

let handlerPromise;

async function buildHandler() {
  const container = await getContainer();
  return serverless(createApp(container));
}

export async function handler(event, context) {
  // Let the runtime freeze with open DB/Redis sockets instead of waiting for them to close.
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  handlerPromise ??= buildHandler().catch((err) => {
    handlerPromise = undefined;
    throw err;
  });
  const appHandler = await handlerPromise;
  return appHandler(event, context);
}
