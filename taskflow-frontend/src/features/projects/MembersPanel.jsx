import { useState } from 'react';
import { projectsApi, usersApi } from '../../api/resources';
import { Alert, Button, Select } from '../../components/common/ui';
import { RoleBadge } from '../../components/common/StatusBadges';
import { PERMISSIONS } from '../../constants';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage } from '../../utils/errors';

export function MembersPanel({ project, members, canManage, onMembersChange }) {
  const { hasPermission } = useAuth();
  const [selected, setSelected] = useState('');
  const canPickUsers = canManage && hasPermission(PERMISSIONS.USERS_READ);

  const candidates = useApi(
    (signal) =>
      canPickUsers ? usersApi.list({ isActive: true, limit: 100, sortBy: 'name', sortOrder: 'asc' }, signal) : Promise.resolve(null),
    [canPickUsers],
  );
  const memberIds = new Set(members.map((m) => m.id));
  const options = (candidates.data?.items ?? [])
    .filter((u) => !memberIds.has(u.id))
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const add = useMutation(async () => {
    onMembersChange(await projectsApi.addMember(project.id, selected));
    setSelected('');
  });
  const remove = useMutation(async (userId) => {
    await projectsApi.removeMember(project.id, userId);
    onMembersChange(members.filter((m) => m.id !== userId));
  });

  return (
    <aside className="card members-panel" aria-labelledby="members-title">
      <h2 id="members-title">Members ({members.length})</h2>
      <Alert>{(add.error || remove.error) && getErrorMessage(add.error || remove.error)}</Alert>
      <ul className="member-list">
        {members.map((m) => (
          <li key={m.id}>
            <div>
              <strong>{m.name}</strong>
              {m.id === project.ownerId && <span className="muted small"> · owner</span>}
              <div className="muted small">{m.email}</div>
            </div>
            <div className="member-actions">
              <RoleBadge role={m.role} />
              {canManage && m.id !== project.ownerId && (
                <Button
                  variant="ghost-danger"
                  size="sm"
                  aria-label={`Remove ${m.name}`}
                  disabled={remove.pending}
                  onClick={() => remove.run(m.id).catch(() => {})}
                >
                  ×
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canPickUsers && (
        <form
          className="add-member"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) add.run().catch(() => {});
          }}
        >
          <Select options={options} placeholder="Add a member…" value={selected} onChange={(e) => setSelected(e.target.value)} />
          <Button type="submit" size="sm" disabled={!selected} loading={add.pending}>
            Add
          </Button>
        </form>
      )}
    </aside>
  );
}
