export const DEFAULT_TASK_FILTERS = {
  search: '',
  status: '',
  priority: '',
  assigneeId: '',
  sort: 'createdAt:desc',
  page: 1,
};

/** Convert UI filters to API query params. */
export function toTaskQuery({ sort, ...rest }, limit) {
  const [sortBy, sortOrder] = sort.split(':');
  return { ...rest, sortBy, sortOrder, limit };
}
