import axios from 'axios';
import { env } from '../config/env';
import { tokenStore } from './tokenStore';

const AUTH_PATHS_WITHOUT_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  withCredentials: true, // send the httpOnly refresh cookie
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // CSRF guard required by the API
});

let sessionExpiredHandler = () => {};
export function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
}

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: concurrent 401s wait for the same refresh request.
let refreshPromise = null;

export function refreshAccessToken() {
  refreshPromise ??= http
    .post('/auth/refresh')
    .then((res) => {
      tokenStore.set(res.data.data.accessToken);
      return res.data.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip = !original || original._retried || AUTH_PATHS_WITHOUT_RETRY.some((p) => original.url?.startsWith(p));

    if (status !== 401 || skip) throw error;

    original._retried = true;
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      tokenStore.clear();
      sessionExpiredHandler();
      throw refreshError;
    }
    return http(original);
  },
);
