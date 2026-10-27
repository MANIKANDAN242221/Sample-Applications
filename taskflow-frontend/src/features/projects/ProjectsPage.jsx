import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsApi } from '../../api/resources';
import { Can } from '../../components/common/Can';
import { Alert, Badge, Button, EmptyState, Input, Pagination, Select, Spinner } from '../../components/common/ui';
import { PAGE_SIZE, PERMISSIONS, PROJECT_STATUSES } from '../../constants';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { ProjectFormModal } from './ProjectFormModal';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', status: 'active', page: 1 });
  const [creating, setCreating] = useState(false);
  const search = useDebounce(filters.search);

  const { data, error, loading, reload } = useApi(
    (signal) => projectsApi.list({ ...filters, search, limit: PAGE_SIZE }, signal),
    [search, filters.status, filters.page],
  );

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value, page: 1 }));

  return (
    <section>
      <header className="page-header">
        <h1>Projects</h1>
        <Can permission={PERMISSIONS.PROJECTS_CREATE}>
          <Button onClick={() => setCreating(true)}>New project</Button>
        </Can>
      </header>

      <div className="toolbar">
        <Input type="search" placeholder="Search projects…" aria-label="Search projects" value={filters.search} onChange={set('search')} />
        <Select options={PROJECT_STATUSES} placeholder="All statuses" value={filters.status} onChange={set('status')} />
      </div>

      {error && <Alert onRetry={reload}>{getErrorMessage(error)}</Alert>}

      {loading && !data ? (
        <Spinner />
      ) : data?.items.length ? (
        <>
          <ul className="card-grid">
            {data.items.map((p) => (
              <li key={p.id} className="card project-card">
                <div className="project-card-head">
                  <Link to={`/projects/${p.id}`} className="project-title">
                    {p.name}
                  </Link>
                  {p.status === 'archived' && <Badge>Archived</Badge>}
                </div>
                <p className="muted clamp-2">{p.description || 'No description'}</p>
                <dl className="project-stats">
                  <div>
                    <dt>Open</dt>
                    <dd>{p.openTaskCount}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{p.taskCount}</dd>
                  </div>
                  <div>
                    <dt>Owner</dt>
                    <dd>{p.ownerName}</dd>
                  </div>
                </dl>
                <p className="muted small">Created {formatDate(p.createdAt)}</p>
              </li>
            ))}
          </ul>
          <Pagination meta={data.meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      ) : (
        !error && <EmptyState title="No projects yet" description="Projects you own or belong to will appear here." />
      )}

      <ProjectFormModal
        open={creating}
        project={null}
        onClose={() => setCreating(false)}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
    </section>
  );
}
