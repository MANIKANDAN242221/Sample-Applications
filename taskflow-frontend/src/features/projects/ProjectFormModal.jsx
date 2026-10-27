import { useEffect, useState } from 'react';
import { projectsApi } from '../../api/resources';
import { Alert, Button, Input, Modal, Select, TextArea } from '../../components/common/ui';
import { PROJECT_STATUSES } from '../../constants';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';

/** Create (project = null) or edit a project. */
export function ProjectFormModal({ open, project, onClose, onSaved }) {
  const isEdit = Boolean(project);
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const { run, pending, error, reset } = useMutation((payload) =>
    isEdit ? projectsApi.update(project.id, payload) : projectsApi.create(payload),
  );
  const fieldErrors = getFieldErrors(error);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'active',
    });
    reset();
  }, [open, project, reset]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const payload = { name: form.name.trim(), description: form.description.trim() || null };
    if (isEdit) payload.status = form.status;
    try {
      onSaved(await run(payload));
    } catch {
      /* rendered below */
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit project' : 'New project'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" loading={pending}>
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={onSubmit} noValidate>
        <Alert>{error && !Object.keys(fieldErrors).length && getErrorMessage(error)}</Alert>
        <Input label="Name" name="name" required maxLength={150} value={form.name} onChange={onChange} error={fieldErrors.name} />
        <TextArea label="Description" name="description" maxLength={5000} value={form.description} onChange={onChange} error={fieldErrors.description} />
        {isEdit && <Select label="Status" name="status" options={PROJECT_STATUSES} value={form.status} onChange={onChange} />}
      </form>
    </Modal>
  );
}
