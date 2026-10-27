import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildUpdateSet, escapeLike, toPage, WhereBuilder } from '../../src/infrastructure/database/sqlHelpers.js';

describe('buildUpdateSet', () => {
  it('only includes whitelisted, defined fields', () => {
    const { clause, values } = buildUpdateSet(
      { name: 'A', isActive: false, evil: 'x', role: undefined },
      { name: 'name', role: 'role', isActive: 'is_active' },
      2,
    );
    assert.equal(clause, 'name = $2, is_active = $3');
    assert.deepEqual(values, ['A', false]);
  });

  it('keeps explicit nulls', () => {
    const { clause, values } = buildUpdateSet({ assigneeId: null }, { assigneeId: 'assignee_id' });
    assert.equal(clause, 'assignee_id = $1');
    assert.deepEqual(values, [null]);
  });
});

describe('WhereBuilder', () => {
  it('numbers placeholders in order', () => {
    const w = new WhereBuilder().add('a = ?', 1).addIf(false, 'b = ?', 2).add('c = ?', 3);
    const limit = w.next(10);
    assert.equal(w.toSql(), 'WHERE a = $1 AND c = $2');
    assert.equal(limit, '$3');
    assert.deepEqual(w.values, [1, 3, 10]);
  });

  it('is empty without conditions', () => {
    assert.equal(new WhereBuilder().toSql(), '');
  });
});

describe('escapeLike / toPage', () => {
  it('escapes LIKE wildcards', () => {
    assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
  });

  it('builds pagination meta', () => {
    const page = toPage([{ id: 1, totalCount: 45 }], { page: 2, limit: 20 });
    assert.deepEqual(page, { items: [{ id: 1 }], meta: { page: 2, limit: 20, total: 45, totalPages: 3 } });
  });
});
