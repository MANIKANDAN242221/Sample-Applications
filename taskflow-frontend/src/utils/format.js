const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Format a 'YYYY-MM-DD' (date-only) value without timezone shifting. */
export function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return dateFormatter.format(new Date(y, m - 1, d));
}

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—';
}

export function isOverdue(task) {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate < new Date().toLocaleDateString('en-CA'); // en-CA => YYYY-MM-DD
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
