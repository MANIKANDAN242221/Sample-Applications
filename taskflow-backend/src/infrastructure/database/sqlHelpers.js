/**
 * Build a parameterized "SET a = $1, b = $2" clause from a whitelist of camelCase -> column names.
 * Only keys present in `columnMap` and not undefined are included, which prevents SQL injection
 * through dynamic column names.
 */
export function buildUpdateSet(fields, columnMap, startIndex = 1) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      sets.push(`${column} = $${startIndex + values.length - 1}`);
    }
  }
  return { clause: sets.join(', '), values };
}

/**
 * Incrementally builds a WHERE clause with positional parameters.
 */
export class WhereBuilder {
  constructor() {
    this.conditions = [];
    this.values = [];
  }

  /** Add a condition; use `?` as the placeholder for the single value. */
  add(condition, value) {
    this.values.push(value);
    this.conditions.push(condition.replace('?', `$${this.values.length}`));
    return this;
  }

  addIf(predicate, condition, value) {
    return predicate ? this.add(condition, value) : this;
  }

  addRaw(condition) {
    this.conditions.push(condition);
    return this;
  }

  /** Reserve the next placeholder index for a value appended after the WHERE clause. */
  next(value) {
    this.values.push(value);
    return `$${this.values.length}`;
  }

  toSql() {
    return this.conditions.length ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }
}

export function escapeLike(term) {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function toPage(rows, { page, limit }) {
  const total = rows[0]?.totalCount ?? 0;
  return {
    items: rows.map(({ totalCount: _omit, ...row }) => row),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export const PG_ERROR = Object.freeze({
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  INVALID_TEXT_REPRESENTATION: '22P02',
  CHECK_VIOLATION: '23514',
});
