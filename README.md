# Team Task Manager

Full-stack task manager with **role-based access control** (Admin / User), JWT auth, projects, kanban-style tasks, dashboard widgets. Built with React + TypeScript on the front, Node.js + Express + Prisma + PostgreSQL on the back.

---

## First admin

The seed (`npm run prisma:seed` in `backend/`) creates the first admin user using the credentials
you set in your `.env`:

```
SEED_ADMIN_EMAIL=...        # required — pick any email
SEED_ADMIN_PASSWORD=...     # required — min 8 chars, choose a strong password
SEED_ADMIN_NAME=Admin       # optional — display name
```

Then sign in with that email + password. The admin invites all other users (Admin or User role)
from the **Users** page. There is no public signup.

---

## Features

- **Auth**: login, refresh-token rotation, logout, `/me`. Tokens revoked on user deactivation via `tokenVersion`.
- **Users (admin)**: list, invite, edit, change role, deactivate. Last-admin guard.
- **Profile (any user)**: view roles + permissions, change name and password.
- **Projects**: Admin creates and manages; Users see projects they own or are members of. Members can be added/removed; project can be archived or deleted (cascades tasks).
- **Tasks**: Admin creates and assigns; Users update status on tasks assigned to them. Filterable by status. Kanban board on the project detail page.
- **Dashboard**: counts (projects, tasks, overdue, users / assigned-to-me), tasks-by-status bars, recent activity. Admin sees company-wide; users see their own scope.
- **Permission-aware UI**: sidebar items, action buttons, and route guards all gated by the permissions in the JWT.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind + shadcn-style widgets + Zustand + React Router |
| Backend | Node.js + Express + TypeScript + Prisma |
| Database | PostgreSQL |
| Auth | JWT (access 15m + refresh 7d, rotated) — bcryptjs |
| Validation | Zod (mirrored client + server) |
| Logging | pino with secret redaction |
| Deploy | Railway (mono-repo, two services + Postgres plugin) |

---

## Architecture

Clean Architecture, feature-first, mirrored on both sides:

```
src/
├── core/                          (infra: db, network, logging, errors, middleware, utils)
│   └── constants/permissions.ts   (single source of truth — Admin: all, User: limited)
├── features/
│   ├── auth/                      (login, refresh, logout, /me)
│   ├── user/                      (list, invite, update, role change, deactivate)
│   ├── project/                   (CRUD + members)
│   ├── task/                      (CRUD + assignee + status, /own for non-admin)
│   └── dashboard/                 (aggregated counts + recent)
└── server.ts | App.tsx
```

Each feature has the same shape:

| Layer | Purpose |
|---|---|
| `*.schema.ts` | Zod validation (request bodies + query params) |
| `*.repository.ts` | Prisma queries (or HTTP calls on the frontend) |
| `*.service.ts` | Business logic; permission/scope checks live here |
| `*.controller.ts` | Express handlers (only on backend) |
| `*.routes.ts` | Mounts middleware + binds controllers |
| `presentation/` | React pages, components, Zustand stores (frontend) |

### RBAC

Roles **Admin** and **User** are seeded with permission sets:

- **Admin** (18 permissions): everything
- **User** (5): `self.read`, `self.update`, `project.read`, `task.read`, `task.update.own`

JWT carries the user's effective permission array → every protected route uses `requirePermission(key)` middleware → no DB hit per check. Refresh re-resolves permissions, so role changes propagate within one access-token TTL.

### Auth flow

```
Login   →  bcrypt verify → resolve permissions → sign access (15m) + refresh (7d hash in DB)
Request →  Bearer access token  → middleware verifies + attaches req.user
401     →  Frontend axios wrapper auto-refreshes (rotation) → retries request
Logout  →  Refresh token marked revoked
```

Rotating refresh tokens means stealing one is single-use. Bumping `tokenVersion` (on deactivation or role change) immediately invalidates outstanding refresh tokens for that user.

### Scope rules

| Resource | Admin | User |
|---|---|---|
| Users | All | Self only |
| Projects | All | Owned or member-of |
| Tasks | All | Created by, assigned to, or in projects they belong to |
| Dashboard | Company-wide | Their own scope (same rules above) |

All scope filtering happens in the service layer — controllers are dumb.

---

## Local development

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 14

### Setup

```bash
# Clone + install
git clone <repo>
cd task-manager

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL and (in prod) generate fresh JWT secrets

# Create DB (one-time)
psql -U postgres -c "CREATE DATABASE task_manager_dev;"

# Migrations + seed (creates default admin + roles + permissions)
npx prisma migrate deploy
npm run prisma:seed

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### Run

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open http://localhost:5173 and sign in with the demo credentials.

---

## API surface

```
POST   /api/v1/auth/login                  public
POST   /api/v1/auth/refresh                public
POST   /api/v1/auth/logout                 public
GET    /api/v1/auth/me                     authed

GET    /api/v1/users/me                    self.read
PATCH  /api/v1/users/me                    self.update
GET    /api/v1/users                       user.read           (Admin)
POST   /api/v1/users                       user.create         (Admin) — invite
GET    /api/v1/users/:id                   user.read           (Admin)
PATCH  /api/v1/users/:id                   user.update         (Admin)
PATCH  /api/v1/users/:id/role              user.role.change    (Admin)
DELETE /api/v1/users/:id                   user.delete         (Admin) — soft delete

GET    /api/v1/projects                    project.read
POST   /api/v1/projects                    project.create      (Admin)
GET    /api/v1/projects/:id                project.read
PATCH  /api/v1/projects/:id                project.update      (Admin)
DELETE /api/v1/projects/:id                project.delete      (Admin) — cascades tasks
POST   /api/v1/projects/:id/members        project.member.manage (Admin)
DELETE /api/v1/projects/:id/members/:uid   project.member.manage (Admin)

GET    /api/v1/tasks                       task.read           (?mine=true | ?projectId | ?status)
POST   /api/v1/tasks                       task.create         (Admin)
GET    /api/v1/tasks/:id                   task.read
PATCH  /api/v1/tasks/:id                   task.update         (Admin)
PATCH  /api/v1/tasks/:id/own               task.update | task.update.own
DELETE /api/v1/tasks/:id                   task.delete         (Admin)

GET    /api/v1/dashboard                   authed              (scope: company / self)
```

All errors return:
```json
{ "error": { "code": "FORBIDDEN", "message": "Missing permission: user.read" } }
```

---

## Backend env reference

Validated by Zod on boot — invalid env crashes the server with a clear message.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | — | ≥ 32 chars |
| `JWT_REFRESH_SECRET` | — | ≥ 32 chars, distinct |
| `ACCESS_TOKEN_TTL` | `15m` | |
| `REFRESH_TOKEN_TTL` | `7d` | |
| `CORS_ORIGIN` | `http://localhost:5173` | comma-separated allowlist |
| `BCRYPT_ROUNDS` | `12` | |
| `SEED_ADMIN_EMAIL` | — | required by `prisma:seed` |
| `SEED_ADMIN_PASSWORD` | — | required by `prisma:seed`, min 8 chars |
| `SEED_ADMIN_NAME` | `Admin` | optional |
| `LOG_LEVEL` | `info` | |
| `PORT` | `4000` | Railway provides |

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Frontend env

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000/api/v1` | Inlined at build time |

---

## Railway deployment

Mono-repo, three Railway services in one project:

1. **PostgreSQL plugin** — provides `DATABASE_URL`.
2. **Backend** service — root `backend/`, `railway.json` provides build/start commands.
3. **Frontend** service — root `frontend/`, serves `dist/` via `serve`.

### Backend service settings

- Root directory: `backend`
- Reference variable `DATABASE_URL` from the Postgres plugin
- Set: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=https://<frontend>.up.railway.app`, `NODE_ENV=production`

`railway.json` runs:
```
npm ci && npm run build && npx prisma migrate deploy
node dist/server.js
```
Healthcheck: `/healthz` (verifies DB ping).

After first deploy, run the seed once via Railway's "Run command":
```
npm run prisma:seed
```

### Frontend service settings

- Root directory: `frontend`
- Set: `VITE_API_URL=https://<backend>.up.railway.app/api/v1`

`railway.json` runs:
```
npm ci && npm run build
npx serve -s dist -l $PORT --no-clipboard
```

`serve.json` configures SPA fallback so client-side routes work on hard reloads.

### First deploy chicken-and-egg

Both services need each other's URL. Workflow:
1. Deploy backend with `CORS_ORIGIN=*` temporarily.
2. Deploy frontend; copy its public URL.
3. Update backend `CORS_ORIGIN` to the frontend URL → redeploy.
4. Update `VITE_API_URL` on frontend → redeploy.

---

## Project layout

```
task-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/env.ts
│   │   ├── core/
│   │   │   ├── constants/permissions.ts
│   │   │   ├── db/prisma.ts
│   │   │   ├── errors/{AppError,errorHandler}.ts
│   │   │   ├── logger/index.ts
│   │   │   ├── middleware/{authenticate,requirePermission}.ts
│   │   │   └── utils/{asyncHandler,jwt,password}.ts
│   │   ├── features/
│   │   │   ├── auth/        (schema | repo | service | controller | routes)
│   │   │   ├── user/
│   │   │   ├── project/
│   │   │   ├── task/
│   │   │   └── dashboard/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── railway.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── config/env.ts
    │   ├── core/
    │   │   ├── network/index.ts        (Axios wrapper, auto-refresh on 401)
    │   │   ├── storage/LocalStorage.ts
    │   │   └── utils/{cn,extractErrorMessage}.ts
    │   └── lib/
    │       ├── widgets/                (button, input, label, card, dialog, dropdown, ...)
    │       ├── components/             (cross-feature shared)
    │       ├── hooks/usePermissions.ts
    │       ├── routing/                (AppRouter, ProtectedRoute, RequirePermission, GuestRoute)
    │       └── features/
    │           ├── auth/   (data | domain | presentation)
    │           ├── user/
    │           ├── project/
    │           ├── task/
    │           ├── dashboard/
    │           └── app/    (AppShell layout)
    ├── railway.json
    └── serve.json
```

---

## What's implemented

- [x] JWT auth with refresh-token rotation + DB-backed revocation
- [x] Two roles seeded (Admin, User), permissions catalog
- [x] Admin invites users with chosen role
- [x] Promote/demote between Admin and User; last-admin protection; no self-demote/deactivate
- [x] Soft-delete users with `tokenVersion` bump (kills outstanding tokens)
- [x] Profile page (name + password change)
- [x] Projects: CRUD + members, scope filtered for non-admin
- [x] Tasks: CRUD + assign + due date + priority; `/own` endpoint for non-admin status updates
- [x] Kanban board on project detail; admin/user actions gated correctly
- [x] Tasks page with filters and "Mine / All" toggle for admin
- [x] Dashboard widgets pulling real aggregates (`/dashboard`)
- [x] Permission-aware UI everywhere; server enforces independently
- [x] Validated env via Zod
- [x] Structured logging (pino) with secret redaction
- [x] Helmet + rate-limit on auth endpoints
- [x] CORS allowlist
- [x] Railway deploy config (`railway.json` for both services + SPA fallback)
- [x] Production builds verified locally (backend `tsc + tsc-alias`, frontend Vite)
