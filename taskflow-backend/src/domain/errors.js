/**
 * Domain-level error hierarchy. Every error thrown on purpose by the application
 * extends AppError so the HTTP layer can translate it into a consistent response.
 */
export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details) {
    super(message, { statusCode: 400, code: 'BAD_REQUEST', details });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, { statusCode: 422, code: 'VALIDATION_ERROR', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, { statusCode: 401, code });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, { statusCode: 409, code: 'CONFLICT' });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later', retryAfterSeconds) {
    super(message, { statusCode: 429, code: 'RATE_LIMITED', details: { retryAfterSeconds } });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, { statusCode: 503, code: 'SERVICE_UNAVAILABLE' });
  }
}
