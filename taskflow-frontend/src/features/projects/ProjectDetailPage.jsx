import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectsApi, tasksApi } from '../../api/resources';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Pagination, Spinner } from '../../components/common/ui';
import { PAGE_SIZE, PERMISSIONS } from '../../constants';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage, isStatus } from '../../utils/errors';
import NotFoundPage from '../../pages/NotFoundPage';
import { TaskFilters } from '../tasks/TaskFilters';
import { DEFAULT_TASK_FILTERS, toTaskQuery } from '../tasks/taskQuery';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { TaskTable } from '../tasks/TaskTable';
import { MembersPanel } from './MembersPanel';
import { ProjectFormModal } from './ProjectFormModal';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [filters, setFilters] = useState(DEFAULT_TASK_FILTERS);
  const [editingProject, setEditingProject] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [actionError, setActionError] = useState(null);

  const search = useDebounce(filters.search);
  const taskQuery = toTaskQuery({ ...filters, search }, PAGE_SIZE);

  const project = useApi((signal) => projectsApi.get(projectId, signal), [projectId]);
  const members = useApi((signal) => projectsApi.members(projectId, signal), [projectId]);
  const tasks = useApi(
    (signal) => tasksApi.listByProject(projectId, taskQuery, signal),
    [projectId, JSON.stringify(taskQuery)],
  );

  const p = project.data;
  const canManage = Boolean(p) && (p.ownerId === user.id || hasPermission(PERMISSIONS.PROJECTS_MANAGE_ANY));
  const canWriteTasks = hasPermission(PERMISSIONS.TASKS_WRITE) && p?.status === 'active';
  const canDeleteTask = useCallback(
    (task) => canManage || (hasPermission(PERMISSIONS.TASKS_DELETE) && task.createdBy === user.id),
    [canManage, hasPermission, user.id],
  );

  const deleteProject = useMutation(async () => {
    await projectsApi.remove(projectId);
    navigate('/projects', { replace: true });
  });
  const deleteTask = useMutation(async () => {
    await tasksApi.remove(taskToDelete.id);
    setTaskToDelete(null);
    tasks.reload();
  });

  const onStatusChange = useCallback(
    async (task, status) => {
      setActionError(null);
      try {
        const updated = await tasksApi.update(task.id, { status });
        tasks.setData((d) => ({ ...d, items: d.items.map((t) => (t.id === updated.id ? updated : t)) }));
      } catch (err) {
        setActionError(getErrorMessage(err));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks.setData],
  );
  const onEditTask = useCallback((task) => setTaskModal({ open: true, task }), []);
  const onDeleteTask = useCallback((task) => setTaskToDelete(task), []);

  if (project.loading && !p) return <Spinner />;
  if (isStatus(project.error, 404)) return <NotFoundPage />;
  if (project.error) return <Alert onRetry={project.reload}>{getErrorMessage(project.error)}</Alert>;

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>
            {p.name} {p.status === 'archived' && <Badge>Archived</Badge>}
          </h1>
          <p className="muted">{p.description || 'No description'}</p>
          <p className="muted small">Owner: {p.ownerName}</p>
        </div>
        <div className="header-actions">
          {canManage && (
            <>
              <Button variant="secondary" onClick={() => setEditingProject(true)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => setConfirmDeleteProject(true)}>
                Delete
              </Button>
            </>
          )}
          {canWriteTasks && <Button onClick={() => setTaskModal({ open: true, task: null })}>New task</Button>}
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <TaskFilters filters={filters} onChange={setFilters} members={members.data ?? []} />
          <Alert>{actionError}</Alert>
          {tasks.error && <Alert onRetry={tasks.reload}>{getErrorMessage(tasks.error)}</Alert>}
          {tasks.loading && !tasks.data ? (
            <Spinner />
          ) : tasks.data?.items.length ? (
            <>
              <TaskTable
                tasks={tasks.data.items}
                onStatusChange={canWriteTasks ? onStatusChange : undefined}
                onEdit={canWriteTasks ? onEditTask : undefined}
                onDelete={onDeleteTask}
                canDelete={canDeleteTask}
              />
              <Pagination meta={tasks.data.meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
            </>
          ) : (
            !tasks.error && <EmptyState title="No tasks match" description="Create a task or adjust the filters." />
          )}
        </div>

        {members.data && (
          <MembersPanel
            project={p}
            members={members.data}
            canManage={canManage}
            onMembersChange={(list) => members.setData(list)}
          />
        )}
      </div>

      <ProjectFormModal
        open={editingProject}
        project={p}
        onClose={() => setEditingProject(false)}
        onSaved={(updated) => {
          project.setData(updated);
          setEditingProject(false);
        }}
      />

      <TaskFormModal
        open={taskModal.open}
        projectId={projectId}
        task={taskModal.task}
        members={members.data ?? []}
        onClose={() => setTaskModal({ open: false, task: null })}
        onSaved={() => {
          setTaskModal({ open: false, task: null });
          tasks.reload();
        }}
      />

      <ConfirmDialog
        open={confirmDeleteProject}
        title="Delete project"
        message={`Delete "${p.name}" and all of its tasks? This cannot be undone.`}
        pending={deleteProject.pending}
        error={deleteProject.error && getErrorMessage(deleteProject.error)}
        onConfirm={() => deleteProject.run().catch(() => {})}
        onCancel={() => setConfirmDeleteProject(false)}
      />

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete task"
        message={`Delete "${taskToDelete?.title}"?`}
        pending={deleteTask.pending}
        error={deleteTask.error && getErrorMessage(deleteTask.error)}
        onConfirm={() => deleteTask.run().catch(() => {})}
        onCancel={() => {
          deleteTask.reset();
          setTaskToDelete(null);
        }}
      />
    </section>
  );
}
