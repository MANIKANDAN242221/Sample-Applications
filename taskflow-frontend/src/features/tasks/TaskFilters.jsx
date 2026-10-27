import { Input, Select } from '../../components/common/ui';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../constants';

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'dueDate:asc', label: 'Due date (soonest)' },
  { value: 'priority:desc', label: 'Priority (highest)' },
  { value: 'title:asc', label: 'Title (A–Z)' },
];

/**
 * Controlled filter bar. `filters` = { search, status, priority, sort, assigneeId? }
 */
export function TaskFilters({ filters, onChange, members }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value, page: 1 });

  return (
    <div className="toolbar">
      <Input
        type="search"
        placeholder="Search tasks…"
        aria-label="Search tasks"
        value={filters.search}
        onChange={set('search')}
      />
      <Select options={TASK_STATUSES} placeholder="All statuses" value={filters.status} onChange={set('status')} />
      <Select options={TASK_PRIORITIES} placeholder="All priorities" value={filters.priority} onChange={set('priority')} />
      {members && (
        <Select
          options={members.map((m) => ({ value: m.id, label: m.name }))}
          placeholder="Any assignee"
          value={filters.assigneeId}
          onChange={set('assigneeId')}
        />
      )}
      <Select options={SORT_OPTIONS} aria-label="Sort" value={filters.sort} onChange={set('sort')} />
    </div>
  );
}
