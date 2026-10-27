import { useCallback, useState } from 'react';
import { tasksApi } from '../../api/resources';
import { Alert, EmptyState, Pagination, Spinner } from '../../components/common/ui';
import { PAGE_SIZE } from '../../constants';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../utils/errors';
import { TaskTable } from './TaskTable';
import { TaskFilters } from './TaskFilters';
import { DEFAULT_TASK_FILTERS, toTaskQuery } from './taskQuery';

export default function MyTasksPage() {
  const [filters, setFilters] = useState(DEFAULT_TASK_FILTERS);
  const [actionError, setActionError] = useState(null);
  const search = useDebounce(filters.search);
  const { assigneeId: _ignored, ...query } = toTaskQuery({ ...filters, search }, PAGE_SIZE);

  const { data, error, loading, reload, setData } = useApi(
    (signal) => tasksApi.listMine(query, signal),
    [JSON.stringify(query)],
  );

  const onStatusChange = useCallback(
    async (task, status) => {
      setActionError(null);
      const previous = task.status;
      // Optimistic update; roll back if the API rejects it.
      setData((d) => ({ ...d, items: d.items.map((t) => (t.id === task.id ? { ...t, status } : t)) }));
      try {
        await tasksApi.update(task.id, { status });
      } catch (err) {
        setActionError(getErrorMessage(err));
        setData((d) => ({ ...d, items: d.items.map((t) => (t.id === task.id ? { ...t, status: previous } : t)) }));
      }
    },
    [setData],
  );

  return (
    <section>
      <header className="page-header">
        <h1>My tasks</h1>
      </header>
      <TaskFilters filters={filters} onChange={setFilters} />
      <Alert>{actionError}</Alert>
      {error && <Alert onRetry={reload}>{getErrorMessage(error)}</Alert>}
      {loading && !data ? (
        <Spinner />
      ) : data?.items.length ? (
        <>
          <TaskTable tasks={data.items} showProject onStatusChange={onStatusChange} />
          <Pagination meta={data.meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      ) : (
        !error && <EmptyState title="No tasks found" description="Tasks assigned to you will appear here." />
      )}
    </section>
  );
}
