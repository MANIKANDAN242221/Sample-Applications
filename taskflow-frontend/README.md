# TaskFlow Web (Frontend)

A React 18 single-page app for the [TaskFlow API](../taskflow-backend/README.md). It's built with Vite, React Router 6 and Axios.

- JWT authentication. The access token is kept in memory only. On a `401` the app silently refreshes it once using the httpOnly refresh cookie, and concurrent requests share that single refresh.
- The login session is restored on page reload from the refresh cookie.
- Role-based UI: route guards (`ProtectedRoute anyOf={[...]}`), a `<Can permission="...">` component, and `hasPermission()`. All of these are driven by the `permissions[]` list the server returns.
- Each page is loaded only when first visited, and library code is bundled into a separate `vendor` chunk.
- Each request can be cancelled, and lists keep showing the previous data while they reload. Status changes appear immediately and roll back if the server rejects them.
- Server validation errors are mapped to the matching form fields. There is also a global error boundary, plus empty, loading and retry states on every page.
- Accessibility: native `<dialog>` modals, labelled inputs, a skip link, visible focus styles, and support for dark mode and reduced motion.

## Requirements

- Node.js 20.11 or later
- A running TaskFlow API. Its `CORS_ORIGINS` setting must include this app's origin.

## Getting started

```bash
cp .env.example .env        # point VITE_API_BASE_URL at the API
npm install
npm run dev                 # http://localhost:5173
```

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Vite dev server with hot reload      |
| `npm run build`   | Production build written to `dist/`  |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | ESLint (including React Hooks rules) |

### Environment variables

| Variable              | Required | Default | Description                       |
| --------------------- | -------- | ------- | --------------------------------- |
| `VITE_API_BASE_URL`   | yes      | none    | e.g. `http://localhost:4000/api/v1` |
| `VITE_API_TIMEOUT_MS` | no       | `15000` | Axios request timeout             |

`VITE_*` values are compiled into the bundle at build time, so never put secrets in them.

## Folder structure

```
taskflow-frontend/
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx                    # React root (StrictMode)
    ├── App.jsx                     # ErrorBoundary → AuthProvider → Router
    ├── config/env.js               # Validated environment variables
    ├── api/
    │   ├── httpClient.js           # Axios instance, auth header, single-flight refresh on 401
    │   ├── tokenStore.js           # In-memory access token
    │   ├── authApi.js              # login, register, restore, logout, profile, password
    │   └── resources.js            # usersApi, projectsApi, tasksApi
    ├── context/
    │   ├── AuthContext.jsx         # AuthProvider: session state and permission helpers
    │   └── authContextValue.js
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useApi.js               # Data fetching: abort, reload, setData
    │   ├── useMutation.js          # Async action with pending and error state
    │   └── useDebounce.js
    ├── routes/
    │   ├── AppRouter.jsx           # Route table, loading each page on demand
    │   └── guards.jsx              # ProtectedRoute (auth and permissions), PublicOnlyRoute
    ├── components/
    │   ├── common/                 # Button, Input, Select, Modal, ConfirmDialog, Pagination, Can, ...
    │   └── layout/AppLayout.jsx    # Sidebar, top bar, Outlet
    ├── features/
    │   ├── auth/                   # LoginPage, RegisterPage
    │   ├── dashboard/              # DashboardPage (stats and upcoming tasks)
    │   ├── projects/               # ProjectsPage, ProjectDetailPage, ProjectFormModal, MembersPanel
    │   ├── tasks/                  # MyTasksPage, TaskTable, TaskFormModal, TaskFilters, taskQuery
    │   ├── users/                  # UsersPage (admin and manager)
    │   └── profile/                # ProfilePage (name, password, sign out everywhere)
    ├── pages/                      # NotFoundPage, ForbiddenPage
    ├── constants/index.js          # Permissions, enums and their labels
    ├── utils/                      # Error parsing, date formatting
    └── styles/global.css           # Design tokens (light and dark) and component styles
```

## Authentication flow

1. **Login or register.** The API returns `{ user, accessToken }` and sets the `tf_refresh` httpOnly cookie. The access token is stored only in memory.
2. **Every request.** Axios adds `Authorization: Bearer <token>` and `X-Requested-With: XMLHttpRequest`. The API requires that second header for CSRF protection.
3. **On a 401.** One shared `POST /auth/refresh` runs, and then the original request is retried. If the refresh fails, the session is cleared and the user is sent to `/login`. Afterwards they are returned to the page they were on.
4. **Page reload.** `AuthProvider` calls `/auth/refresh` to restore the session from the cookie.
5. **Password change or sign out everywhere.** The server revokes every session and the app signs out.

## Role-based UI

The UI hides actions the user can't perform, but **the API enforces every rule itself**. These checks only make the interface tidier; they are not a security boundary.

| Feature                          | Visible to                                  |
| -------------------------------- | ------------------------------------------- |
| Users page                       | `users:read` (admin, manager)               |
| Change a user's role, activate or deactivate, delete | `users:manage` (admin)  |
| "New project" button             | `projects:create` (admin, manager)          |
| Edit or delete a project, manage members | Project owner or `projects:manage:any` (admin) |
| Create, edit or change status of tasks | `tasks:write`, active projects only   |
| Delete a task                    | Project owner, admin, or a manager who created the task |

## Production build

`npm run build` writes static files to `dist/`. Any static file host can serve them. Configure it to fall back to `index.html` for unknown paths, because the app handles its own routing. The API must allow this origin in `CORS_ORIGINS`. If the app and the API are on different sites, set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` on the API.
