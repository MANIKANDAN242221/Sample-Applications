import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';

export function createTokenService({ config }) {
  const { accessSecret, refreshSecret, accessTtlSeconds, refreshTtlSeconds, issuer, audience } =
    config.jwt;
  const signOptions = { issuer, audience, algorithm: ALGORITHM };
  const verifyOptions = { issuer, audience, algorithms: [ALGORITHM] };

  return {
    signAccessToken(user, sessionId) {
      const token = jwt.sign({ role: user.role, sid: sessionId, typ: 'access' }, accessSecret, {
        ...signOptions,
        subject: user.id,
        jwtid: randomUUID(),
        expiresIn: accessTtlSeconds,
      });
      return { token, expiresIn: accessTtlSeconds };
    },

    signRefreshToken(userId, sessionId) {
      const jti = randomUUID();
      const token = jwt.sign({ sid: sessionId, typ: 'refresh' }, refreshSecret, {
        ...signOptions,
        subject: userId,
        jwtid: jti,
        expiresIn: refreshTtlSeconds,
      });
      return { token, jti, expiresIn: refreshTtlSeconds };
    },

    /** Throws jsonwebtoken errors (TokenExpiredError / JsonWebTokenError) on failure. */
    verifyAccessToken(token) {
      const payload = jwt.verify(token, accessSecret, verifyOptions);
      if (payload.typ !== 'access') throw new jwt.JsonWebTokenError('invalid token type');
      return payload;
    },

    verifyRefreshToken(token, { ignoreExpiration = false } = {}) {
      const payload = jwt.verify(token, refreshSecret, { ...verifyOptions, ignoreExpiration });
      if (payload.typ !== 'refresh') throw new jwt.JsonWebTokenError('invalid token type');
      return payload;
    },
  };
}
