# Deployment — Railway

> Railway pe deploy karna mandatory hai. Live URL submit karna hai.

---

## Strategy: Mono-repo, 3 services

```
task-manager/                ← single GitHub repo
├── frontend/                ← Railway service "frontend"
├── backend/                 ← Railway service "backend"
├── docs/
└── README.md

Railway services:
1. PostgreSQL plugin                  → provides DATABASE_URL
2. backend (Node service)             → reads DATABASE_URL, exposes API
3. frontend (Static site or Node)     → built React, talks to backend public URL
```

**Why mono-repo?** Easier to reason about, single PR, atomic changes. Railway has root-directory config per service so it builds each independently.

---

## Backend service config

### Build settings (Railway dashboard)
- **Root directory**: `backend`
- **Build command**: `npm ci && npm run build && npx prisma generate && npx prisma migrate deploy`
- **Start command**: `node dist/server.js`
- **Watch paths**: `backend/**`

### Environment variables
```
DATABASE_URL              ← injected by Railway PG plugin (Reference Variable)
NODE_ENV=production
PORT                      ← Railway provides
JWT_ACCESS_SECRET         ← 64-char random
JWT_REFRESH_SECRET        ← 64-char random
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CORS_ORIGIN               ← https://<frontend-domain>.up.railway.app
LOG_LEVEL=info
```

### Generate secrets (one-time)
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### `package.json` scripts (backend)
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:seed": "tsx prisma/seed.ts",
    "postinstall": "prisma generate"
  }
}
```

> `postinstall` runs `prisma generate` so the client is always in sync with the schema after `npm ci`.

### Migrations on deploy
- `prisma migrate deploy` runs in build command.
- Seed runs only on first deploy (manually trigger via Railway shell, or guard in code: skip if already seeded).

---

## Frontend service config

Two options — pick **option A** (simpler, less moving parts):

### Option A: Static via Railway "Public Networking" + serve

- **Root directory**: `frontend`
- **Build command**: `npm ci && npm run build`
- **Start command**: `npx serve -s dist -l $PORT`
- Add `serve` as devDependency.

### Option B: Vite + nginx Docker (Hicaliber-style)

- Use a `Dockerfile` in `frontend/`:
  ```dockerfile
  FROM node:22-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  ARG VITE_API_URL
  RUN npm run build

  FROM nginx:alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  ```
- Railway auto-detects Dockerfile.

> Stick with **Option A** for time. We can always Dockerize later.

### Environment variables (frontend)
```
VITE_API_URL    ← https://<backend-domain>.up.railway.app/api/v1
```

> Vite inlines `VITE_*` vars at build time. Set in Railway before build.

---

## Domain setup

1. After both services deploy, Railway gives each a `*.up.railway.app` URL.
2. Take the backend URL → set as `VITE_API_URL` on frontend service → trigger rebuild.
3. Take the frontend URL → set as `CORS_ORIGIN` on backend service → trigger restart.

> Chicken-and-egg: deploy both first with placeholder, then update each with the other's URL, then redeploy.

---

## Database setup

1. Railway → **+ New** → **Database** → **Add PostgreSQL**.
2. PG plugin gives a `DATABASE_URL`. Add as **Reference Variable** in backend service so it tracks PG.
3. First deploy of backend will run `prisma migrate deploy`.
4. **Manually run seed** (one time):
   - Railway dashboard → backend service → Settings → run command: `npx tsx prisma/seed.ts`
   - OR add a `seed:once` script that checks if Permission table is empty.

---

## CORS

Backend (`app.ts`):
```ts
app.use(cors({
  origin: env.CORS_ORIGIN.split(','),  // comma-separated allowlist
  credentials: false,                  // we use Bearer, not cookies
  methods: ['GET','POST','PATCH','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
```

For local dev, set `CORS_ORIGIN=http://localhost:5173,https://<prod-frontend>.up.railway.app`.

---

## Health checks

Backend:
```ts
app.get('/healthz', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

Railway → service → Settings → Healthcheck path = `/healthz`.

---

## Pre-launch checklist

- [ ] Both services deployed, healthy.
- [ ] PostgreSQL connected, migrations applied, seed ran.
- [ ] Signup flow works end-to-end on prod URL.
- [ ] Login persists across reload.
- [ ] CORS works (no console errors).
- [ ] At least 5 users created, hierarchy visible in Team page.
- [ ] Create project, create tasks, assign, change status — all work.
- [ ] Dashboard shows correct numbers.
- [ ] Permissions enforced (test with Member account — can't see admin pages).
- [ ] HTTPS only.
- [ ] No console.log of tokens in prod.

---

## Demo video plan (2-5 min)

1. (15s) Open live URL — Login screen.
2. (30s) Signup new company → land on Dashboard (Admin).
3. (45s) Invite Manager → invite Lead under Manager → invite Members under Lead. Show Team tree.
4. (45s) Create Project, add members, create tasks, assign, change status (kanban).
5. (45s) Logout, login as Member — show restricted UI (no admin nav).
6. (30s) Show Dashboard differences (Admin sees company-wide, Member sees own).
7. (10s) Wrap.

---

## Backup deployment plan (if Railway issues)

- Backend → Render (free tier) or Fly.io.
- Frontend → Vercel (instant React deploy).
- DB → Neon (free Postgres).

> Don't switch unless Railway actually fails. Assignment specifies Railway.
