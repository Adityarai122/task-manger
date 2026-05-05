# Phased Execution Plan

> Setup pehle. Phir feature-by-feature. Har phase ke end pe checkpoint — kuch tootna nahi chahiye.

**Time budget**: 8-12 hours total. Numbers are rough.

---

## Phase 0 — Project setup (~45 min)

### 0.1 Repo init
- [ ] `git init` in `task-manager/`
- [ ] Create `.gitignore` (node_modules, .env, dist, build, .DS_Store)
- [ ] Add root `README.md` (placeholder for now)
- [ ] Add `.editorconfig`, `.prettierrc`, root-level
- [ ] Create GitHub repo, push initial commit

### 0.2 Backend scaffold
- [ ] `mkdir backend && cd backend`
- [ ] `npm init -y`
- [ ] Install runtime: `express cors helmet pino pino-http jsonwebtoken bcrypt zod dotenv @prisma/client uuid`
- [ ] Install dev: `typescript tsx @types/node @types/express @types/cors @types/jsonwebtoken @types/bcrypt prisma`
- [ ] `npx tsc --init` → configure `tsconfig.json` (strict, ES2022, NodeNext)
- [ ] Create folder skeleton (per `03-BACKEND-ARCHITECTURE.md`)
- [ ] `npx prisma init` → set `DATABASE_URL` to local Postgres
- [ ] Add scripts to `package.json` (build, dev, prisma)

### 0.3 Frontend scaffold
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] `cd frontend && npm install`
- [ ] Install: `axios react-router-dom zustand react-hook-form @hookform/resolvers zod jwt-decode lucide-react sonner clsx tailwind-merge class-variance-authority date-fns`
- [ ] Set up Tailwind: `npm install -D tailwindcss@latest @tailwindcss/postcss postcss autoprefixer`, init configs
- [ ] Set up shadcn/ui: `npx shadcn@latest init`
- [ ] Install needed shadcn components: `button input label form dialog sheet table dropdown-menu select avatar card badge tabs skeleton tooltip toast`
- [ ] Configure path alias `@/` in `tsconfig.json` and `vite.config.ts`
- [ ] Create folder skeleton (per `04-FRONTEND-ARCHITECTURE.md`)

### 0.4 Local DB
- [ ] Verify local Postgres running (`psql -U postgres -c '\l'`)
- [ ] Create DB: `createdb task_manager_dev` (or via psql)
- [ ] `DATABASE_URL=postgresql://postgres:<pass>@localhost:5432/task_manager_dev` in `backend/.env`

**Checkpoint**: `npm run dev` works on both ends, Vite serves a blank page, Express serves `/healthz` returning `{ok:true}`.

---

## Phase 1 — Database + Auth foundation (~1.5 hr)

### 1.1 Prisma schema
- [ ] Define all models from `02-DATABASE-SCHEMA.md`
- [ ] First migration: `npx prisma migrate dev --name init`
- [ ] Raw SQL migration for `ltree` extension + GIST index

### 1.2 Seed
- [ ] `prisma/seed.ts` — insert Permission catalog (all keys from `01-RBAC-DESIGN.md`)
- [ ] Note: roles are per-company; we'll create them on signup, not in seed

### 1.3 JWT utils
- [ ] `core/utils/jwt.ts` — `signAccess`, `signRefresh`, `verifyAccess`, `verifyRefresh`
- [ ] `core/utils/password.ts` — `hash`, `compare`
- [ ] `core/utils/ltree.ts` — `sanitizeSegment(uuid)`, `buildChildPath(parentPath, childId)`

### 1.4 Auth feature
- [ ] `auth.schema.ts` (Zod): signup, login, refresh
- [ ] `auth.repository.ts` — find user, create user, refresh token CRUD
- [ ] `auth.service.ts` — `signup`, `login`, `refresh`, `logout`, `resolvePermissions(userId)`
- [ ] `auth.controller.ts`, `auth.routes.ts`
- [ ] Wire up `authenticate` middleware

### 1.5 Test auth manually
- [ ] Signup via curl → returns tokens, creates company + admin user
- [ ] Login → returns tokens
- [ ] Refresh → rotates
- [ ] Decode access token → permissions array present

**Checkpoint**: Postman/curl signup + login works end-to-end. JWT contains permissions.

---

## Phase 2 — Frontend auth + shell (~1.5 hr)

### 2.1 Core utilities
- [ ] `core/network/index.ts` — Axios wrapper with auth + 401 retry
- [ ] `core/storage/LocalStorage.ts`
- [ ] `core/utils/permissions.ts`
- [ ] `core/state/index.ts` — Zustand factory

### 2.2 Auth feature
- [ ] Models: `Login`, `Signup`, `JwtPayload`, `AccessToken`
- [ ] `NetworkAuthRepository`, `LocalAuthRepository`
- [ ] `AuthService` (singleton)
- [ ] `authState.ts` (Zustand)
- [ ] `LoginPage`, `SignupPage` with shadcn Form

### 2.3 Routing + guards
- [ ] `AppRouter`, route constants
- [ ] `ProtectedRoute` (redirects to /login if no token)
- [ ] `RequirePermission` (403 page if missing perm)
- [ ] On app boot: try `AuthService.refresh()` to rehydrate session

### 2.4 App shell
- [ ] Sidebar layout (collapsible, shadcn `Sidebar`)
- [ ] Top bar with user menu + logout
- [ ] Nav items filtered by permissions

**Checkpoint**: signup → see dashboard skeleton, refresh page → still logged in, logout → back to login.

---

## Phase 3 — Users + hierarchy + roles (~2 hr)

### 3.1 Backend
- [ ] `user.repository.ts` — CRUD, list-by-subtree using `ltree <@`
- [ ] `user.service.ts` — `invite`, `list`, `update`, `move`, `delete`
- [ ] `enforceSubtreeScope` middleware
- [ ] `role.repository.ts`, `role.service.ts` — CRUD
- [ ] `assignRoleToUser` endpoint
- [ ] Routes: `/users`, `/users/invite`, `/users/:id/move`, `/roles`

### 3.2 Frontend — Team page
- [ ] Recursive tree component (collapsible nodes)
- [ ] Invite user dialog (name, email, password, role, parent picker)
- [ ] User detail drawer (move user, change role, deactivate)

### 3.3 Frontend — Roles page (admin only)
- [ ] Roles table
- [ ] Role editor: permission checkboxes grouped by module

**Checkpoint**: As Admin, invite Manager, then invite Lead under Manager. Tree renders correctly. Login as Manager → can only see own subtree.

---

## Phase 4 — Projects (~1.5 hr)

### 4.1 Backend
- [ ] CRUD: `project.repository`, `project.service`, controller, routes
- [ ] Scope filter: list returns projects where user is member OR project owner is in user's subtree
- [ ] Members endpoints: add/remove members
- [ ] Permission checks per route

### 4.2 Frontend
- [ ] Projects grid page (cards)
- [ ] Create/Edit project dialog
- [ ] Project detail page shell (we'll add tasks next)
- [ ] Members panel — add/remove members (autocomplete user search)

**Checkpoint**: Create 2 projects, add members. Different users see only projects they have access to.

---

## Phase 5 — Tasks (~2 hr)

### 5.1 Backend
- [ ] CRUD: `task.repository`, `task.service`, controller, routes
- [ ] List filters: status, priority, assignee, dueDate, projectId
- [ ] `assignTask`, `changeStatus` (with optional `completedAt` auto-set on DONE)
- [ ] Subtree scope: only tasks where assignee or creator is in user's subtree (or admin sees all in company)

### 5.2 Frontend — Project detail
- [ ] Kanban board (4 columns: TODO/IN_PROGRESS/IN_REVIEW/DONE)
- [ ] Drag-drop between columns (use `@hello-pangea/dnd` or HTML5 drag)
- [ ] Create/edit task dialog (title, desc, assignee picker, priority, due date)
- [ ] Task card: priority chip, due-date badge (red if overdue), assignee avatar

### 5.3 Frontend — Global tasks page
- [ ] Filters bar
- [ ] Table view (sortable columns)
- [ ] Click row → drawer with task detail

**Checkpoint**: Create tasks across projects. Assign to users. Move on kanban. Filters work. As Member, only own tasks editable.

---

## Phase 6 — Dashboard (~45 min)

### 6.1 Backend
- [ ] `dashboard.service.ts`:
  - Stats: total active tasks, overdue, completed this week, projects active
  - Recent tasks (last 10)
  - Overdue list
  - Upcoming due (next 7 days)
- [ ] Apply scope: Member sees own; Manager sees subtree; Admin sees company
- [ ] One endpoint: `GET /api/v1/dashboard` — returns all panels

### 6.2 Frontend
- [ ] Stats cards row
- [ ] Two-column: Recent / Overdue
- [ ] Upcoming due timeline
- [ ] Empty states for new users

**Checkpoint**: Dashboard shows accurate numbers per role. New user sees friendly empty state.

---

## Phase 7 — Polish (~30 min)

- [ ] Loading skeletons everywhere
- [ ] Error states (no internet, 500)
- [ ] 404 page
- [ ] Forbidden page
- [ ] Toasts on every mutation
- [ ] Confirm dialogs for delete
- [ ] Keyboard accessibility (tab order)
- [ ] Mobile-friendly sidebar (collapse on small)
- [ ] Favicon + meta tags
- [ ] README polish: setup instructions, env vars, demo credentials

---

## Phase 8 — Deploy (~1 hr)

Per `05-DEPLOYMENT-RAILWAY.md`:

- [ ] Push to GitHub
- [ ] Railway: New project → connect repo
- [ ] Add PostgreSQL plugin
- [ ] Add Backend service → set env vars → deploy → run migrations
- [ ] Add Frontend service → set `VITE_API_URL` → build
- [ ] Update CORS origin on backend
- [ ] Verify on live URL
- [ ] Test full flow on production
- [ ] Run seed on prod (one-time)

---

## Phase 9 — Submission deliverables (~30 min)

- [ ] **README.md** — clear setup instructions, env vars list, architecture summary, demo credentials
- [ ] **Demo video** (2-5 min) — record per script in `05-DEPLOYMENT-RAILWAY.md`
- [ ] **GitHub repo URL** — public, clean commit history
- [ ] **Live URL** — verified working
- [ ] Submit form

---

## Stretch goals (if time permits)

- [ ] Email verification on signup
- [ ] Password reset flow
- [ ] Task comments
- [ ] Activity log per project
- [ ] Real-time updates via WebSocket (Socket.IO)
- [ ] User avatar upload (Railway volume or S3)
- [ ] Dark mode
- [ ] Audit log of permission changes
- [ ] Rate limiting per user (not just IP)

---

## Time-box discipline

| Phase | Budget | Cumulative |
|---|---|---|
| 0 Setup | 45m | 0:45 |
| 1 DB + Auth BE | 1h30 | 2:15 |
| 2 Auth FE | 1h30 | 3:45 |
| 3 Users + Roles | 2h | 5:45 |
| 4 Projects | 1h30 | 7:15 |
| 5 Tasks | 2h | 9:15 |
| 6 Dashboard | 45m | 10:00 |
| 7 Polish | 30m | 10:30 |
| 8 Deploy | 1h | 11:30 |
| 9 Submit | 30m | 12:00 |

> **Discipline**: if a phase blows budget by >50%, mark stretch features as cut and move on. Working > perfect. Submission > polish.
