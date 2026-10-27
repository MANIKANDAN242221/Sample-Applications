import { Link } from 'react-router-dom';
import { tasksApi } from '../../api/resources';
import { Alert, EmptyState, Spinner } from '../../components/common/ui';
import { TASK_STATUSES } from '../../constants';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/errors';
import { TaskTable } from '../tasks/TaskTable';

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = useApi((signal) => tasksApi.myStats(signal), []);
  const upcoming = useApi(
    (signal) =>
      tasksApi
        .listMine({ sortBy: 'dueDate', sortOrder: 'asc', limit: 25 }, signal)
        .then((page) => page.items.filter((t) => t.status !== 'done').slice(0, 5)),
    [],
  );

  const s = stats.data;
  const openCount = s ? s.total - s.byStatus.done : 0;

  return (
    <section>
      <header className="page-header">
        <h1>Welcome back, {user.name.split(' ')[0]}</h1>
      </header>

      {stats.error && <Alert onRetry={stats.reload}>{getErrorMessage(stats.error)}</Alert>}
      {stats.loading && !s ? (
        <Spinner />
      ) : (
        s && (
          <div className="stat-grid">
            <StatCard label="Open tasks" value={openCount} />
            <StatCard label="Overdue" value={s.overdue} tone={s.overdue ? 'danger' : undefined} />
            {TASK_STATUSES.map((st) => (
              <StatCard key={st.value} label={st.label} value={s.byStatus[st.value]} />
            ))}
          </div>
        )
      )}

      <div className="section-header">
        <h2>Up next</h2>
        <Link to="/tasks">View all my tasks →</Link>
      </div>
      {upcoming.error && <Alert onRetry={upcoming.reload}>{getErrorMessage(upcoming.error)}</Alert>}
      {upcoming.loading && !upcoming.data ? (
        <Spinner />
      ) : upcoming.data?.length ? (
        <TaskTable tasks={upcoming.data} showProject />
      ) : (
        !upcoming.error && <EmptyState title="You're all caught up" description="No open tasks are assigned to you." />
      )}
    </section>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`card stat-card ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
