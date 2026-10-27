import { toAuthUser } from '../../../application/services/authService.js';
import { created, noContent, ok } from '../utils/response.js';

export function createAuthController({ authService, userService, config }) {
  const cookieOptions = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: `${config.server.apiPrefix}/auth`,
  };

  const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

  /** Put the refresh token in an httpOnly cookie; never expose it to JavaScript. */
  function sendSession(res, { refreshToken, refreshExpiresIn, ...session }, status = 200) {
    res.cookie(config.cookie.refreshName, refreshToken, {
      ...cookieOptions,
      maxAge: refreshExpiresIn * 1000,
    });
    return status === 201 ? created(res, session) : ok(res, session);
  }

  const readRefreshCookie = (req) => req.cookies?.[config.cookie.refreshName];

  return {
    async register(req, res) {
      sendSession(res, await authService.register(req.valid.body, requestMeta(req)), 201);
    },

    async login(req, res) {
      sendSession(res, await authService.login(req.valid.body, requestMeta(req)));
    },

    async refresh(req, res) {
      try {
        sendSession(res, await authService.refresh(readRefreshCookie(req)));
      } catch (err) {
        res.clearCookie(config.cookie.refreshName, cookieOptions);
        throw err;
      }
    },

    async logout(req, res) {
      await authService.logout(readRefreshCookie(req));
      res.clearCookie(config.cookie.refreshName, cookieOptions);
      noContent(res);
    },

    async logoutAll(req, res) {
      await authService.logoutAll(req.user.id);
      res.clearCookie(config.cookie.refreshName, cookieOptions);
      noContent(res);
    },

    async me(req, res) {
      ok(res, toAuthUser(await userService.getActiveUser(req.user.id)));
    },

    async updateMe(req, res) {
      ok(res, toAuthUser(await userService.updateProfile(req.user.id, req.valid.body)));
    },

    async changePassword(req, res) {
      await authService.changePassword(req.user.id, req.valid.body);
      res.clearCookie(config.cookie.refreshName, cookieOptions);
      noContent(res);
    },
  };
}
