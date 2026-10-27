# TaskFlow

A project and task management application, split into two independent repositories:

| Repository                                   | Stack                                                 | Docs                                       |
| ---------------------------------------------| ----------------------------------------------------  | ------------------------------------------ |
| [taskflow-backend](taskflow-backend/)        | Node.js, Express 5, PostgreSQL, Redis, JWT, Zod, Pino | [README](taskflow-backend/README.md)       |
| [taskflow-frontend](taskflow-frontend/)      | React 18, Vite, React Router, Axios                   | [README](taskflow-frontend/README.md)      |

## Quick start

```bash
# 1. API (requires PostgreSQL and Redis running locally)
cd taskflow-backend
cp .env.example .env
npm install
npm run migrate && npm run seed
npm run dev                      # http://localhost:4000/api/v1

# 2. Web app
cd ../taskflow-frontend
cp .env.example .env
npm install
npm run dev                      # http://localhost:5173
```

Seeded accounts (when `SEED_DEMO_DATA=true`):

| Role    | Email                    | Password        |
| ------- | ------------------------ | --------------- |
| admin   | `admin@taskflow.local`   | `Admin@12345`   |
| manager | `manager@taskflow.local` | `Manager@12345` |
| member  | `member@taskflow.local`  | `Member@12345`  |

Change these passwords before using the app anywhere other than your own machine.

docker run --rm --name postgres-dev -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d dhi.io/postgres:18
