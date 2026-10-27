import { useEffect, useState } from 'react';
import { tasksApi } from '../../api/resources';
import { Alert, Button, Input, Modal, Select, TextArea } from '../../components/common/ui';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../constants';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';

const EMPTY = { title: '', description: '', status: 'todo', priority: 'medium', assigneeId: '', dueDate: '' };

function toForm(task) {
  if (!task) return EMPTY;
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? '',
    dueDate: task.dueDate ?? '',
  };
}

/** Create (task = null) or edit a task. */
export function TaskFormModal({ open, projectId, task, members = [], onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const isEdit = Boolean(task);

  const { run, pending, error, reset } = useMutation((payload) =>
    isEdit ? tasksApi.update(task.id, payload) : tasksApi.create(projectId, payload),
  );
  const fieldErrors = getFieldErrors(error);

  useEffect(() => {
    if (open) {
      setForm(toForm(task));
      reset();
    }
  }, [open, task, reset]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
    };
    try {
      onSaved(await run(payload));
    } catch {
      /* rendered below */
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={pending}>
            {isEdit ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} noValidate>
        <Alert>{error && !Object.keys(fieldErrors).length && getErrorMessage(error)}</Alert>
        <Input label="Title" name="title" required maxLength={200} value={form.title} onChange={onChange} error={fieldErrors.title} />
        <TextArea label="Description" name="description" maxLength={10000} value={form.description} onChange={onChange} error={fieldErrors.description} />
        <div className="grid-2">
          <Select label="Status" name="status" options={TASK_STATUSES} value={form.status} onChange={onChange} />
          <Select label="Priority" name="priority" options={TASK_PRIORITIES} value={form.priority} onChange={onChange} />
          <Select
            label="Assignee"
            name="assigneeId"
            placeholder="Unassigned"
            options={members.map((m) => ({ value: m.id, label: m.name }))}
            value={form.assigneeId}
            onChange={onChange}
            error={fieldErrors.assigneeId}
          />
          <Input label="Due date" name="dueDate" type="date" value={form.dueDate} onChange={onChange} error={fieldErrors.dueDate} />
        </div>
      </form>
    </Modal>
  );
}
