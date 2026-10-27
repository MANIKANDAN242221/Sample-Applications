import { http, refreshAccessToken } from './httpClient';
import { tokenStore } from './tokenStore';

function storeSession(res) {
  const session = res.data.data;
  tokenStore.set(session.accessToken);
  return session.user;
}

export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials).then(storeSession),

  register: (payload) => http.post('/auth/register', payload).then(storeSession),

  /** Restore a session from the refresh cookie (used on app start). */
  restore: () => refreshAccessToken().then((session) => session.user),

  async logout() {
    try {
      await http.post('/auth/logout');
    } finally {
      tokenStore.clear();
    }
  },

  async logoutAll() {
    try {
      await http.post('/auth/logout-all');
    } finally {
      tokenStore.clear();
    }
  },

  me: () => http.get('/auth/me').then((res) => res.data.data),

  updateProfile: (payload) => http.patch('/auth/me', payload).then((res) => res.data.data),

  async changePassword(payload) {
    await http.post('/auth/change-password', payload);
    tokenStore.clear();
  },
};
