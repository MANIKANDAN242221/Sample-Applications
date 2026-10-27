import { http } from './httpClient';

const unwrap = (res) => res.data.data;
const unwrapPage = (res) => ({ items: res.data.data, meta: res.data.meta });

/** Drop empty filter values so they are not sent as `?status=`. */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );
}

export const usersApi = {
  list: (params, signal) => http.get('/users', { params: cleanParams(params), signal }).then(unwrapPage),
  get: (id, signal) => http.get(`/users/${id}`, { signal }).then(unwrap),
  update: (id, payload) => http.patch(`/users/${id}`, payload).then(unwrap),
  remove: (id) => http.delete(`/users/${id}`),
};

export const projectsApi = {
  list: (params, signal) =>
    http.get('/projects', { params: cleanParams(params), signal }).then(unwrapPage),
  get: (id, signal) => http.get(`/projects/${id}`, { signal }).then(unwrap),
  create: (payload) => http.post('/projects', payload).then(unwrap),
  update: (id, payload) => http.patch(`/projects/${id}`, payload).then(unwrap),
  remove: (id) => http.delete(`/projects/${id}`),
  members: (id, signal) => http.get(`/projects/${id}/members`, { signal }).then(unwrap),
  addMember: (id, userId) => http.post(`/projects/${id}/members`, { userId }).then(unwrap),
  removeMember: (id, userId) => http.delete(`/projects/${id}/members/${userId}`),
};

export const tasksApi = {
  listByProject: (projectId, params, signal) =>
    http.get(`/projects/${projectId}/tasks`, { params: cleanParams(params), signal }).then(unwrapPage),
  listMine: (params, signal) =>
    http.get('/tasks/mine', { params: cleanParams(params), signal }).then(unwrapPage),
  myStats: (signal) => http.get('/tasks/mine/stats', { signal }).then(unwrap),
  get: (id, signal) => http.get(`/tasks/${id}`, { signal }).then(unwrap),
  create: (projectId, payload) => http.post(`/projects/${projectId}/tasks`, payload).then(unwrap),
  update: (id, payload) => http.patch(`/tasks/${id}`, payload).then(unwrap),
  remove: (id) => http.delete(`/tasks/${id}`),
};
