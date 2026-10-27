# TaskFlow API (Backend)

A REST API for project and task management, built with Node.js, Express 5, PostgreSQL and Redis using Clean Architecture.

- JWT access tokens plus rotating refresh tokens kept in an httpOnly cookie (sessions live in Redis, and reuse of an old refresh token is detected)
- Role-based access control (admin / manager / member) at the route level, plus per-resource ownership policies
- Redis is used for refresh-token sessions, read-through caching, and distributed rate limiting
- Zod validation for environment variables and every request
- Structured JSON logging with Pino, request IDs and secret redaction
- A single error format for every response, with graceful shutdown and liveness and readiness checks
- Runs as a long-lived server (single process or `node:cluster`) or, optionally, as serverless functions

---

## Requirements

- Node.js 20.11 or later (22 LTS recommended)
- PostgreSQL 13 or later
- Redis 6.2 or later

## Getting started

```bash
cp .env.example .env          # then edit DATABASE_URL, REDIS_URL and the JWT secrets
npm install
npm run migrate               # create the schema
npm run seed                  # create the admin user (and demo data if SEED_DEMO_DATA=true)
npm run dev                   # start with auto-reload on http://localhost:4000
```

Generate strong JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Scripts

| Script                  | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `npm start`             | Start the production server (single process)            |
| `npm run start:cluster` | Start one worker per CPU (`WEB_CONCURRENCY` overrides)  |
| `npm run dev`           | Start with `node --watch`                               |
| `npm run migrate`       | Apply pending SQL migrations (`-- --status` to list them) |
| `npm run seed`          | Seed the admin and demo data (safe to run repeatedly)   |
| `npm test`              | Unit and HTTP tests (no DB or Redis needed, they use fakes) |
| `npm run lint`          | ESLint                                                  |

---

## Folder structure

```
taskflow-backend/
├── migrations/
│   └── 001_initial_schema.sql        # Tables, enums, indexes, triggers
├── scripts/
│   ├── migrate.js                    # Forward-only migration runner (advisory-locked)
│   └── seed.js                       # Admin and demo data seed
├── src/
│   ├── config/
│   │   └── env.js                    # Validated, typed, frozen configuration
│   ├── domain/                       # Pure business rules (no framework or IO)
│   │   ├── constants.js
│   │   ├── errors.js                 # AppError hierarchy
│   │   ├── policies.js               # Resource-level authorization (ownership)
│   │   └── roles.js                  # Roles, permissions, RBAC matrix
│   ├── application/
│   │   └── services/                 # Use cases: auth, user, project, task
│   ├── infrastructure/               # Adapters to the outside world
│   │   ├── database/                 # pg pool, transactions, SQL helpers
│   │   ├── logger/                   # Pino logger
│   │   ├── redis/                    # Client, cache, session store, rate-limit store
│   │   ├── repositories/             # SQL data access (user, project, task)
│   │   └── security/                 # JWT token service, bcrypt hasher
│   ├── interfaces/
│   │   └── http/
│   │       ├── controllers/          # Thin HTTP adapters that call services
│   │       ├── middlewares/          # authenticate, authorize, validate, rateLimit, errors, logging
│   │       ├── routes/               # Express routers
│   │       ├── utils/response.js     # Response envelope helpers
│   │       └── validators/           # Zod request schemas
│   ├── serverless/                   # Optional function entry points
│   │   ├── bootstrap.js              # Lazy, reusable container per runtime instance
│   │   ├── httpHandler.js            # Whole API as one function
│   │   └── functions/overdueTasksDigest.js   # Scheduled job example
│   ├── app.js                        # Express app factory
│   ├── cluster.js                    # Multi-core entry point
│   ├── container.js                  # Composition root (dependency injection)
│   └── server.js                     # HTTP server with graceful shutdown
└── test/
    ├── helpers/fakes.js
    ├── integration/app.test.js
    └── unit/*.test.js
```

### How the layers depend on each other

```
interfaces/http  →  application/services  →  domain
        ↓                    ↓
   infrastructure (repositories, redis, security)   ← wired together only in container.js
```

- **domain** has no dependencies. It holds roles, policies and errors.
- **application** services take every dependency as a function argument (repositories, cache, logger) and never import config or Express.
- **interfaces/http** translates HTTP requests into service calls. Controllers contain no business logic.
- **container.js** is the only file that creates the concrete implementations. The tests swap in fakes using the same approach.

---

## API endpoints

Base URL: `/api/v1`. All request and response bodies are JSON.

**Success envelope**

```json
{ "data": { }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

`meta` is present only on paginated lists.

**Error envelope**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed",
             "details": [{ "field": "email", "message": "Invalid email", "location": "body" }],
             "requestId": "5b0c..." } }
```

Error codes: `BAD_REQUEST` 400, `UNAUTHORIZED` / `TOKEN_EXPIRED` / `TOKEN_INVALID` / `SESSION_REVOKED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `PAYLOAD_TOO_LARGE` 413, `VALIDATION_ERROR` 422, `RATE_LIMITED` 429, `INTERNAL_ERROR` 500.

### Health

| Method | Path            | Description                                  |
| ------ | --------------- | -------------------------------------------- |
| GET    | `/health`       | Liveness check                               |
| GET    | `/health/ready` | Readiness check (PostgreSQL and Redis), returns 503 if either is down |

### Auth (`/auth`)

| Method | Path               | Auth            | Description                                           |
| ------ | ------------------ | --------------- | ----------------------------------------------------- |
| POST   | `/register`        | public, rate-limited | `{ email, name, password }` creates a **member** account and returns the session |
| POST   | `/login`           | public, rate-limited | `{ email, password }` returns `{ user, accessToken, expiresIn }` and sets the refresh cookie |
| POST   | `/refresh`         | refresh cookie and `X-Requested-With: XMLHttpRequest` | Rotates the refresh token and returns a new access token |
| POST   | `/logout`          | refresh cookie and `X-Requested-With` | Revokes the current session and clears the cookie |
| POST   | `/logout-all`      | Bearer          | Revokes every session for the user                    |
| GET    | `/me`              | Bearer          | Current user with `permissions[]`                     |
| PATCH  | `/me`              | Bearer          | `{ name }`                                            |
| POST   | `/change-password` | Bearer          | `{ currentPassword, newPassword }`, then revokes all sessions |

Passwords must be 8 to 72 characters and include at least one uppercase letter, one lowercase letter and one digit.

### Users (`/users`)

| Method | Path   | Permission     | Description                                                       |
| ------ | ------ | -------------- | ----------------------------------------------------------------- |
| GET    | `/`    | `users:read`   | Query: `page, limit, search, role, isActive, sortBy (createdAt, name, email, role), sortOrder` |
| GET    | `/:id` | `users:read`   | Get a single user                                                 |
| PATCH  | `/:id` | `users:manage` | `{ name?, role?, isActive? }`. Deactivating a user revokes their sessions. Admins cannot demote or deactivate themselves. |
| DELETE | `/:id` | `users:manage` | Deletes the user. Fails if they still own projects.               |

### Projects (`/projects`)

| Method | Path                     | Permission and rule                        | Description                       |
| ------ | ------------------------ | ------------------------------------------ | --------------------------------- |
| GET    | `/`                      | `projects:read`                            | Admins see every project; others see projects they own or belong to. Query: `page, limit, search, status, sortBy (createdAt, updatedAt, name), sortOrder`. Includes `taskCount` and `openTaskCount`. |
| POST   | `/`                      | `projects:create`                          | `{ name, description? }`. The creator becomes owner and member. |
| GET    | `/:id`                   | must be able to view the project           | Get one project                   |
| PATCH  | `/:id`                   | owner or admin                             | `{ name?, description?, status? }` |
| DELETE | `/:id`                   | owner or admin                             | Cascades to members and tasks     |
| GET    | `/:id/members`           | must be able to view the project           | List members                      |
| POST   | `/:id/members`           | owner or admin                             | `{ userId }`                      |
| DELETE | `/:id/members/:userId`   | owner or admin                             | The owner cannot be removed       |
| GET    | `/:projectId/tasks`      | `tasks:read` and project access            | Query: `page, limit, search, status, priority, assigneeId, sortBy (createdAt, updatedAt, dueDate, priority, title), sortOrder` |
| POST   | `/:projectId/tasks`      | `tasks:write` and project access           | `{ title, description?, status?, priority?, assigneeId?, dueDate? (YYYY-MM-DD) }`. The assignee must be a project member. |

If a user cannot see a project, the API returns `404` rather than `403`, so non-members cannot discover which project IDs exist.

### Tasks (`/tasks`)

| Method | Path          | Permission and rule                     | Description                                  |
| ------ | ------------- | --------------------------------------- | -------------------------------------------- |
| GET    | `/mine`       | `tasks:read`                            | Tasks assigned to the current user, with the same filters as the project task list |
| GET    | `/mine/stats` | `tasks:read`                            | `{ total, overdue, byStatus }`, cached for 60 seconds |
| GET    | `/:id`        | `tasks:read` and project access         | Get one task                                 |
| PATCH  | `/:id`        | `tasks:write` and project access        | Any task field                               |
| DELETE | `/:id`        | project owner, admin, or a manager who created the task | Delete a task                |

### RBAC matrix

| Permission            | admin | manager | member |
| --------------------- | :---: | :-----: | :----: |
| `users:read`          |  ✅   |   ✅    |        |
| `users:manage`        |  ✅   |         |        |
| `projects:read`       |  ✅   |   ✅    |   ✅   |
| `projects:create`     |  ✅   |   ✅    |        |
| `projects:manage:any` |  ✅   |         |        |
| `tasks:read`          |  ✅   |   ✅    |   ✅   |
| `tasks:write`         |  ✅   |   ✅    |   ✅   |
| `tasks:delete`        |  ✅   |   ✅    |        |

Route guards check permissions, never role names. To add a role, edit `ROLE_PERMISSIONS` in `src/domain/roles.js`.

---

## Database schema

```
users ───────────┐ 1
  id (uuid, PK)  │
  email (unique, lowercase)
  password_hash, name
  role (admin|manager|member)
  is_active, last_login_at, created_at, updated_at
                 │
     owner_id  * │                 * project_members *
projects ────────┘           ┌──── project_id (FK, cascade) ──┐
  id (uuid, PK)  1 ──────────┘     user_id    (FK, cascade)   │
  name, description                added_at                   │
  status (active|archived)         PK (project_id, user_id)   │
  owner_id → users (restrict)                                 │
  created_at, updated_at                                      │
        │ 1                                                   │
        │ *                                                   │
tasks                                                         │
  id (uuid, PK)                                               │
  project_id  → projects (cascade)                            │
  title, description                                          │
  status   (todo|in_progress|in_review|done)                  │
  priority (low|medium|high|urgent)                           │
  assignee_id → users (set null) ─────────────────────────────┘
  created_by  → users (set null)
  due_date, completed_at (maintained by trigger), created_at, updated_at
```

Indexes cover every foreign key and the common access paths: `(project_id, status)`, `(project_id, created_at)`, `(assignee_id, status)`, and a partial index on `due_date` for tasks that are not done. Triggers keep `updated_at` and `completed_at` up to date. The full DDL is in [migrations/001_initial_schema.sql](migrations/001_initial_schema.sql).

To add a migration, create `migrations/002_<name>.sql`. Files are applied in filename order, each in its own transaction.

---

## Redis integration

All keys are prefixed with `REDIS_KEY_PREFIX` (default `taskflow:`).

| Key pattern                 | Purpose                                                    | TTL                  |
| --------------------------- | ---------------------------------------------------------- | -------------------- |
| `session:{sid}`             | Refresh-token session `{userId, jti, prevJti, ip, userAgent}` | refresh TTL (sliding) |
| `user-sessions:{userId}`    | Set of session IDs, used for "log out everywhere"          | refresh TTL          |
| `cache:user:{id}`           | User record used by `authenticate` on every request        | `CACHE_TTL_SECONDS`  |
| `cache:project:{id}`        | Project record                                             | `CACHE_TTL_SECONDS`  |
| `cache:user-task-stats:{id}`| Dashboard statistics                                       | 60 s                 |
| `ratelimit:{name}:{ip}`     | Fixed-window request counter (Lua `INCR` and `EXPIRE`)     | window               |
| `jobs:overdue-digest:{day}` | Lock that makes the scheduled function run once per day    | 23 h                 |

- **Token rotation.** Each refresh atomically swaps the session's `jti` using a Lua script. If an older refresh token is presented, the session is revoked. A 10-second grace period lets several browser tabs refresh at the same moment without logging the user out.
- **Immediate revocation.** `authenticate` checks that the session still exists, so logging out, changing a password or deactivating a user cuts off access tokens straight away instead of waiting for them to expire.
- **Cache invalidation.** Writes delete the affected keys. Cache and rate-limit errors are logged and the request continues: if Redis goes down the API gets slower but stays up. Sessions do depend on Redis.

---

## Security notes

- `helmet` headers, a CORS whitelist (`CORS_ORIGINS`), a 100 KB JSON body limit, and `trust proxy` set by `TRUST_PROXY`.
- The refresh token is an httpOnly cookie scoped to `/api/v1/auth`. The cookie endpoints require `X-Requested-With: XMLHttpRequest`, which protects them from CSRF.
- If the frontend runs on a different site in production, set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`.
- Login takes the same time whether or not the email exists, so attackers cannot use timing to find valid accounts. Failed logins are logged.
- Every SQL query is parameterized. Dynamic sort and update columns come from fixed allowlists.
- Logs redact the `authorization` and cookie headers, passwords and tokens.

## Logging

Pino writes JSON to stdout. Every request gets an `X-Request-Id`; one is taken from the incoming header if valid, otherwise generated. It is included in the log line and in error responses. Set `LOG_PRETTY=true` locally for readable output. Queries slower than 500 ms are logged as warnings.

## Scaling and serverless

The API keeps no state in memory: sessions, cache and rate limits all live in Redis. That means you can run as many processes or hosts as you need behind a load balancer. `npm run start:cluster` uses every CPU core on one machine.

**Optional serverless functions** (no infrastructure configuration is included):

- `src/serverless/httpHandler.js` exports `handler`, which runs the whole Express app through `serverless-http`. It accepts API Gateway or ALB events.
- `src/serverless/functions/overdueTasksDigest.js` exports `handler`, a scheduled job that groups overdue tasks by assignee and runs at most once per day thanks to a Redis lock.

Both reuse one container per warm runtime. Set `DB_POOL_MAX=1` or `2` for serverless, or put a connection pooler such as PgBouncer or RDS Proxy in front of PostgreSQL.
