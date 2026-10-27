/**
 * The access token lives only in memory (never localStorage) to limit XSS exposure.
 * The refresh token is an httpOnly cookie managed by the browser.
 */
let accessToken = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};
