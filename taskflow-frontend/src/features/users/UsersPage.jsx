import { useState } from 'react';
import { usersApi } from '../../api/resources';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Input, Pagination, Select, Spinner } from '../../components/common/ui';
import { RoleBadge } from '../../components/common/StatusBadges';
import { PAGE_SIZE, PERMISSIONS, ROLES } from '../../constants';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }));
const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function UsersPage() {
  const { user: me, hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE);

  const [filters, setFilters] = useState({ search: '', role: '', isActive: '', page: 1 });
  const [toDelete, setToDelete] = useState(null);
  const [actionError, setActionError] = useState(null);
  const search = useDebounce(filters.search);

  const { data, error, loading, reload, setData } = useApi(
    (signal) => usersApi.list({ ...filters, search, limit: PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }, signal),
    [search, filters.role, filters.isActive, filters.page],
  );

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value, page: 1 }));

  async function update(userId, changes) {
    setActionError(null);
    try {
      const updated = await usersApi.update(userId, changes);
      setData((d) => ({ ...d, items: d.items.map((u) => (u.id === updated.id ? updated : u)) }));
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  const remove = useMutation(async () => {
    await usersApi.remove(toDelete.id);
    setToDelete(null);
    reload();
  });

  return (
    <section>
      <header className="page-header">
        <h1>Users</h1>
      </header>

      <div className="toolbar">
        <Input type="search" placeholder="Search name or email…" aria-label="Search users" value={filters.search} onChange={set('search')} />
        <Select options={ROLE_OPTIONS} placeholder="All roles" value={filters.role} onChange={set('role')} />
        <Select options={ACTIVE_OPTIONS} placeholder="Any status" value={filters.isActive} onChange={set('isActive')} />
      </div>

      <Alert>{actionError}</Alert>
      {error && <Alert onRetry={reload}>{getErrorMessage(error)}</Alert>}

      {loading && !data ? (
        <Spinner />
      ) : data?.items.length ? (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last login</th>
                  {canManage && <th scope="col" className="actions-col"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isSelf = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.name} {isSelf && <span className="muted small">(you)</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {canManage && !isSelf ? (
                          <select
                            className="input input-compact"
                            aria-label={`Role of ${u.name}`}
                            value={u.role}
                            onChange={(e) => update(u.id, { role: e.target.value })}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td>{u.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                      <td>{formatDateTime(u.lastLoginAt)}</td>
                      {canManage && (
                        <td className="actions-col">
                          {!isSelf && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => update(u.id, { isActive: !u.isActive })}>
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button variant="ghost-danger" size="sm" onClick={() => setToDelete(u)}>
                                Delete
                              </Button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      ) : (
        !error && <EmptyState title="No users found" />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete user"
        message={`Permanently delete ${toDelete?.name}? Consider deactivating instead to keep their history.`}
        pending={remove.pending}
        error={remove.error && getErrorMessage(remove.error)}
        onConfirm={() => remove.run().catch(() => {})}
        onCancel={() => {
          remove.reset();
          setToDelete(null);
        }}
      />
    </section>
  );
}
