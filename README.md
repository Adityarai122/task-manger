# Team Task Manager

Full-stack task manager with **role-based access control** (Admin / User), JWT auth, projects, kanban-style tasks, and a permissions-aware dashboard. React + TypeScript on the front, Node.js + Express + Prisma + PostgreSQL on the back.

---

## 🌐 Live demo

**App:** https://task-manager-frontend-woad.vercel.app
**API:** https://task-manager-backend-3i8o.onrender.com
**Repo:** https://github.com/Adityarai122/task-manger

> First request after a quiet period takes 30–50 seconds — the free Render backend cold-starts on demand. Subsequent requests are instant.

---

### 🔑 Demo login credentials

> Use these to sign in to the live app:

| | |
|---|---|
| **Email** | `admin@taskmanager.local` |
| **Password** | `Admin@123` |
| **Role** | Admin (full access) |

```
Email:    admin@taskmanager.local
Password: Admin@123
```

The admin invites everyone else (Admin or User) from the **Users** page — there is no public sign-up by design. Once you log in, you can create another admin or regular user from the Users tab to test the role-based scope.

---

## ✨ Features

- **Auth** — login, refresh-token rotation, logout, `/me`. Tokens revoke on user deactivation via `tokenVersion`.
- **Users (admin)** — list, invite (with role), edit, change role, deactivate. Last-admin guard prevents lockout.
- **Profile (any user)** — view roles + permissions, change name and password.
- **Projects** — Admins create and manage; non-admins see projects they own or are members of. Members can be added/removed; project can be archived or deleted (cascades tasks).
- **Tasks** — kanban board (TODO / IN PROGRESS / IN REVIEW / DONE) on each project, plus a global tasks page with filters. Admins create + assign anywhere; non-admins create tasks within projects they belong to and can update status on tasks assigned to them. Cannot self-assign — must pick another team member.
- **Task detail dialog** — click any task to see assignee, who created it (with avatar + relative time), description, due date, completion timestamp, and inline status moves. "Assigned to you by X" banner when someone gives you a task.
- **Dashboard** — stats (projects, tasks, overdue, users / assigned-to-me), tasks-by-status bars, "Assigned to you" inbox callout, recent activity. Admin sees company-wide; users see their own scope.
- **Permission-aware UI** — sidebar items, action buttons, and route guards all gated by the JWT's permission array. Server enforces independently on every request.
- **Custom in-app dialogs** — no native browser `confirm()` popups; all destructive actions go through a styled `AlertDialog`.

---

## 🧱 Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind + shadcn-style widgets + Zustand + React Router |
| Backend | Node.js + Express + TypeScript + Prisma |
| Database | PostgreSQL |
| Auth | JWT (access 15m + refresh 7d, rotated) — bcryptjs |
| Validation | Zod (mirrored client + server) |
| Logging | pino with secret redaction |
| Deploy | Vercel (frontend) + Render (backend) + Neon (Postgres) |

---

## 🏛 Architecture

Clean Architecture, feature-first, mirrored on both sides:

```
src/
├── core/                          (infra: db, network, logging, errors, middleware, utils)
│   └── constants/permissions.ts   (single source of truth — Admin: 19 perms, User: 6)
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
| `*.repository.ts` | Prisma queries (HTTP calls on the frontend) |
| `*.service.ts` | Business logic; permission/scope checks live here |
| `*.controller.ts` | Express handlers (backend only) |
| `*.routes.ts` | Mounts middleware + binds controllers |
| `presentation/` | React pages, components, Zustand stores (frontend) |

### RBAC

Two roles, seeded with their permission sets:

- **Admin** (19 perms) — everything: manage users, projects, tasks, all data
- **User** (6 perms) — `self.read`, `self.update`, `project.read`, `task.read`, `task.update.own`, `task.create.member`

JWT carries the user's effective permission array → every protected route uses `requirePermission(key)` middleware → no DB hit per check. Refresh re-resolves permissions, so role changes propagate within one access-token TTL.

### Auth flow

```
Login   →  bcrypt verify → resolve permissions → sign access (15m) + refresh (7d hash in DB)
Request →  Bearer access token  → middleware verifies + attaches req.user
401     →  Frontend axios wrapper auto-refreshes (rotation) → retries request
Logout  →  Refresh token marked revoked
```

Rotating refresh tokens means a stolen refresh token is single-use. Bumping `tokenVersion` (on deactivation or role change) immediately invalidates outstanding refresh tokens for that user.

### Scope rules

| Resource | Admin | Regular User |
|---|---|---|
| Users | All | Self only |
| Projects | All | Owned or member-of |
| Tasks | All | Created by, assigned to, or in projects they belong to |
| Dashboard | Company-wide | Their own scope (same rules above) |

All scope filtering happens in the service layer — controllers stay dumb.

---

## 🛠 Local development

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 14 (or use a Neon/Supabase/Railway managed DB)

### Setup

```bash
# Clone + install
git clone https://github.com/Adityarai122/task-manger.git
cd task-manger

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL, generate JWT secrets, choose admin creds

# Generate strong secrets
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# Run twice — paste outputs as JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

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

Open http://localhost:5173 and sign in with the credentials you set in `SEED_ADMIN_*`.

---

## 📡 API surface

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
POST   /api/v1/tasks                       task.create | task.create.member
GET    /api/v1/tasks/:id                   task.read
PATCH  /api/v1/tasks/:id                   task.update         (Admin)
PATCH  /api/v1/tasks/:id/own               task.update | task.update.own
DELETE /api/v1/tasks/:id                   task.delete         (Admin)

GET    /api/v1/dashboard                   authed              (scope: company / self)
```

Errors return:
```json
{ "error": { "code": "FORBIDDEN", "message": "Missing permission: user.read" } }
```

---

## 🔐 Backend env reference

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
| `PORT` | `4000` | hosting provider injects this |

Generate strong JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Frontend env

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000/api/v1` | inlined at build time |

---

## 🚀 Deployment

The current live deployment uses three services on free tiers:

| Service | Provider | Notes |
|---|---|---|
| Database | [Neon](https://neon.tech) | Free 0.5 GB Postgres, no credit card |
| Backend  | [Render](https://render.com) | Free Node.js web service (sleeps after 15 min idle, ~30 s wake-up) |
| Frontend | [Vercel](https://vercel.com) | Free static hosting + global CDN, no sleep |

Why this split instead of one provider:
- Vercel never sleeps the frontend, so the demo URL always loads instantly.
- Render's free Node tier is fine for an assignment demo; the cold start only affects the very first request.
- Neon is faster to provision and more reliable than Render's managed PG.
- Decoupling frontend / backend / DB matches how a real production system would be wired.

### Backend (Render)

- **Root directory**: `backend`
- **Build command**: `npm install --include=dev && npm run build`
- **Start command**: `npm run start:prod` (runs `prisma migrate deploy` then `node dist/server.js`)
- **Env vars**: all 12 listed above, with `DATABASE_URL` pointing at Neon and `CORS_ORIGIN` pointing at the Vercel domain.

A `railway.json` is also kept in `backend/` for one-click Railway deploys (alternative path).

### Frontend (Vercel)

- **Root directory**: `frontend`
- **Framework preset**: Vite (auto-detected)
- **Build command**: default (`npm run build`)
- **Output directory**: `dist`
- **Env var**: `VITE_API_URL=https://<backend-url>/api/v1`

### Database (Neon)

- Create project → copy the **pooled** connection string.
- Run migrations + seed once from your local machine pointing at the Neon URL:
  ```bash
  DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require \
  npx prisma migrate deploy && npm run prisma:seed
  ```

---

## 🗂 Project layout

```
task-manger/
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
    │       ├── widgets/                (button, input, card, dialog, alert-dialog, dropdown, ...)
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

## ✅ What's implemented

- [x] JWT auth with refresh-token rotation + DB-backed revocation
- [x] Two roles seeded (Admin, User) with a permissions catalog
- [x] Admin invites users with chosen role
- [x] Promote/demote between Admin and User; last-admin protection; no self-demote/deactivate
- [x] Soft-delete users with `tokenVersion` bump (kills outstanding tokens)
- [x] Profile page (name + password change)
- [x] Projects: CRUD + members, scope-filtered for non-admins
- [x] Tasks: CRUD + assign + due date + priority; `/own` endpoint for non-admin status updates
- [x] User-to-user task creation (project members can assign within their projects)
- [x] No-self-assign rule on the task creator
- [x] Kanban board on project detail with gradient column headers + status icons
- [x] "Assigned to you by X" banner on tasks given to you
- [x] Click-to-open task detail dialog (assignee, creator, dates, status moves)
- [x] Tasks page with filters and "Mine / All" toggle for admin
- [x] Dashboard widgets pulling real aggregates (`/dashboard`)
- [x] "Assigned to you" inbox callout on dashboard
- [x] Permission-aware UI everywhere; server enforces independently
- [x] Custom in-app `confirm` dialogs (no native browser popups)
- [x] Validated env via Zod
- [x] Structured logging (pino) with secret redaction
- [x] Helmet + rate-limit on auth endpoints
- [x] CORS allowlist
- [x] Production builds verified (backend `tsc + tsc-alias`, frontend Vite)
- [x] Live deploy on Vercel + Render + Neon

---

## 📝 License

This project was built as a hiring assignment / portfolio piece. Code is provided as-is; feel free to fork and learn from it.
