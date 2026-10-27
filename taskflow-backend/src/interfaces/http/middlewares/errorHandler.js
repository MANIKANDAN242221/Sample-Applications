import { AppError, NotFoundError } from '../../../domain/errors.js';
import { PG_ERROR } from '../../../infrastructure/database/sqlHelpers.js';

/** Translate known non-AppError errors (body parser, PostgreSQL) into AppErrors. */
function normalize(err) {
  if (err instanceof AppError) return err;

  if (err.type === 'entity.parse.failed') {
    return new AppError('Malformed JSON body', { statusCode: 400, code: 'BAD_REQUEST' });
  }
  if (err.type === 'entity.too.large') {
    return new AppError('Request body too large', { statusCode: 413, code: 'PAYLOAD_TOO_LARGE' });
  }

  switch (err.code) {
    case PG_ERROR.UNIQUE_VIOLATION:
      return new AppError('Resource already exists', { statusCode: 409, code: 'CONFLICT' });
    case PG_ERROR.FOREIGN_KEY_VIOLATION:
      return new AppError('Referenced resource does not exist', { statusCode: 400, code: 'BAD_REQUEST' });
    case PG_ERROR.INVALID_TEXT_REPRESENTATION:
    case PG_ERROR.CHECK_VIOLATION:
      return new AppError('Invalid input', { statusCode: 400, code: 'BAD_REQUEST' });
    default:
      return null;
  }
}

export function notFoundHandler(req) {
  throw new NotFoundError(`Route ${req.method} ${req.path}`);
}

export function createErrorHandler({ logger, exposeStack }) {
  // Express identifies error handlers by arity, so all four parameters are required.
  return function errorHandler(err, req, res, _next) {
    const appError = normalize(err);
    const statusCode = appError?.statusCode ?? 500;

    // pino-http logs the request; attach the error so it is included in that log line.
    res.err = err;
    if (statusCode >= 500) {
      (req.log ?? logger).error({ err }, 'Unhandled error');
    }

    const body = {
      error: {
        code: appError?.code ?? 'INTERNAL_ERROR',
        message: appError?.message ?? 'An unexpected error occurred',
        ...(appError?.details && { details: appError.details }),
        requestId: req.id,
        ...(exposeStack && statusCode >= 500 && { stack: err.stack }),
      },
    };

    if (res.headersSent) return;
    res.status(statusCode).json(body);
  };
}
