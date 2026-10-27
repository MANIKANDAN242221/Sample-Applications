import { ValidationError } from '../../../domain/errors.js';

export function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || undefined,
    message: issue.message,
  }));
}

/**
 * Validates and coerces request parts with zod schemas.
 * Parsed values are exposed on `req.valid` ({ params, query, body }) because Express 5 makes
 * `req.query` read-only, and handlers should only consume validated input anyway.
 */
export function validate(schemas) {
  const parts = Object.entries(schemas);
  return function validateMiddleware(req, _res, next) {
    const valid = {};
    const issues = [];
    for (const [part, schema] of parts) {
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) valid[part] = result.data;
      else issues.push(...formatZodIssues(result.error).map((i) => ({ ...i, location: part })));
    }
    if (issues.length) throw new ValidationError('Request validation failed', issues);
    req.valid = valid;
    next();
  };
}
