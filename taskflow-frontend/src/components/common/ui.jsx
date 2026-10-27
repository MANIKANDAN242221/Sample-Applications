import { useEffect, useId, useRef } from 'react';

export function Button({ variant = 'primary', size, loading = false, disabled, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="spinner spinner-inline" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

function useFieldId(id) {
  const generated = useId();
  return id ?? generated;
}

export function Input({ label, error, hint, id, ...props }) {
  const fieldId = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} id={fieldId}>
      <input id={fieldId} className="input" aria-invalid={Boolean(error)} {...props} />
    </Field>
  );
}

export function TextArea({ label, error, hint, id, ...props }) {
  const fieldId = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} id={fieldId}>
      <textarea id={fieldId} className="input" rows={4} aria-invalid={Boolean(error)} {...props} />
    </Field>
  );
}

export function Select({ label, error, hint, id, options, placeholder, ...props }) {
  const fieldId = useFieldId(id);
  const select = (
    <select id={fieldId} className="input" aria-invalid={Boolean(error)} aria-label={label ? undefined : placeholder} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  return label || error ? (
    <Field label={label} error={error} hint={hint} id={fieldId}>
      {select}
    </Field>
  ) : (
    select
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Alert({ type = 'error', children, onRetry }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        Page {page} of {totalPages} · {total} items
      </span>
      <div className="pagination-buttons">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="modal-content">
          <header className="modal-header">
            <h2 id="modal-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, pending, error }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
      <Alert>{error}</Alert>
    </Modal>
  );
}
