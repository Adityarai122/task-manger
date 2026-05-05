# Deployment Guide — GitHub + Railway

Step-by-step guide to deploy this app to Railway using your GitHub account.

> **Estimated time**: 30-40 minutes total
> **Prereqs**: GitHub account, Railway account, ~$5/mo Railway credit (or trial)

---

## Phase 1 — Push to GitHub (10 min)

### 1.1 Create a new repository

1. Go to https://github.com/new while signed in to your GitHub account
2. Repository name: `task-manager` (or any name you like)
3. **Visibility**: Private (recommended for assignments)
4. Do NOT initialize with README / license / .gitignore — we already have those locally
5. Click **Create repository**
6. Copy the HTTPS URL — looks like:
   ```
   https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   ```

### 1.2 Add remote + push from your local repo

Open PowerShell in the project folder:

```powershell
cd <path-to-this-repo>

# Add the GitHub repo as the 'origin' remote
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git

# Push the initial commit
git push -u origin main
```

GitHub will prompt you to authenticate. Two options:

- **Browser popup (easiest)**: sign in via the popup.
- **Personal Access Token**: generate one at https://github.com/settings/tokens
  (classic, scope `repo`) and use it as the password.

> **If you have multiple GitHub accounts on this machine** and Git keeps using the wrong one:
> sign out via Windows Credential Manager, or use `git credential-manager github logout`,
> then retry the push.

### 1.3 Verify

Open `https://github.com/<YOUR_USERNAME>/<YOUR_REPO>` and confirm all files are there.

---

## Phase 2 — Railway setup (5 min)

### 2.1 Create a Railway account

1. Go to https://railway.com (or https://railway.app)
2. Click **Login** → **Login with GitHub**
3. Authorize Railway

You'll get **$5 free credit per month**, enough to run this stack indefinitely for a demo.

### 2.2 Create a new project

1. Dashboard → **+ New Project**
2. Choose **Deploy from GitHub repo**
3. Configure the GitHub App if prompted, granting Railway access to the repo
4. Pick the repo

Railway will create a project with one service auto-detected. We'll fix the structure next.

---

## Phase 3 — PostgreSQL plugin (2 min)

1. In your Railway project canvas, click **+ Create** → **Database** → **Add PostgreSQL**
2. A `Postgres` service is created. Click on it → **Variables** tab — you'll see auto-generated
   `DATABASE_URL`, `PGHOST`, etc. **You don't touch these directly** — they're used as
   reference variables from other services.

> Done. Railway-hosted Postgres is now running.

---

## Phase 4 — Backend service (10 min)

### 4.1 Configure backend service

1. If a service was auto-created from the repo, click it → **Settings** → scroll to **Source** →
   set **Root Directory** to `backend`.
2. (If no service exists yet) Click **+ Create** → **GitHub repo** → pick the same repo →
   then set **Root Directory** to `backend` after creating.

### 4.2 Add environment variables

Click the backend service → **Variables** tab → **+ New Variable** for each:

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `JWT_ACCESS_SECRET` | *(generate — see below)* | |
| `JWT_REFRESH_SECRET` | *(generate — different from access)* | |
| `ACCESS_TOKEN_TTL` | `15m` | |
| `REFRESH_TOKEN_TTL` | `7d` | |
| `BCRYPT_ROUNDS` | `12` | |
| `LOG_LEVEL` | `info` | |
| `SEED_ADMIN_EMAIL` | *(your choice — e.g. `admin@example.com`)* | used by the one-time seed |
| `SEED_ADMIN_PASSWORD` | *(your choice — strong password)* | used by the one-time seed |
| `SEED_ADMIN_NAME` | *(your choice — e.g. `Admin`)* | |
| `CORS_ORIGIN` | `*` | **temporary — fix in step 6.2** |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | **Reference — see below** |

> **Treat `SEED_ADMIN_PASSWORD` like any other secret — never commit it.** Pick a strong unique
> value here. The seed only runs once; afterwards the admin user can change their password from
> the Profile page.

#### Generate JWT secrets

In your local PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run twice and use the two outputs as `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

#### Reference variable for DATABASE_URL

When adding `DATABASE_URL`:
- Click **+ New Variable**, type the name `DATABASE_URL`
- For the value, click **Add Reference** (the chain link icon)
- Pick `Postgres` → `DATABASE_URL`

This automatically wires the backend to the Postgres service. The value at runtime will look
like `postgresql://postgres:xxxxx@xxx.railway.internal:5432/railway`.

### 4.3 Confirm build settings

Click the service → **Settings** → check that:

- **Builder**: Nixpacks
- **Root Directory**: `backend`
- **Build Command**: (auto from `railway.json`) — `npm ci && npm run build && npx prisma migrate deploy`
- **Start Command**: (auto from `railway.json`) — `node dist/server.js`
- **Healthcheck Path**: `/healthz`

(`backend/railway.json` already declares all this; Railway picks it up automatically.)

### 4.4 Deploy

Railway will auto-deploy. Watch the **Deployments** tab logs. You should see (in order):

```
Installing dependencies
Generating Prisma Client
Building TypeScript
Running prisma migrate deploy   ← creates tables in Railway Postgres
Starting server
Server listening on http://localhost:8080
Environment: production
```

If the healthcheck passes, the service goes green. ✓

### 4.5 Get the public URL

Service → **Settings** → **Networking** → **Generate Domain** (Railway gives you a URL like
`<service-name>-production-xxxx.up.railway.app`).

Test it:

```powershell
curl https://<your-backend-url>/healthz
```

Should return:
```json
{"status":"ok","uptime":...,"timestamp":"..."}
```

### 4.6 Run the seed (one-time)

The migration created empty tables. Now insert permissions + roles + the default admin user.

In your backend service → click the **`...`** menu (top right) → **Run command** (or open a shell):

```bash
npm run prisma:seed
```

You should see:
```
✓ permissions ensured
✓ Admin (... permissions)
✓ User (... permissions)
✓ admin created: <SEED_ADMIN_EMAIL>
```

> **Alternative**: connect from your local machine using the public DB URL. In the Postgres
> service → **Variables** → enable `Public Networking` → copy the public `DATABASE_URL` →
> set it as `DATABASE_URL` in your local terminal → run `npm run prisma:seed` from your
> backend folder.

---

## Phase 5 — Frontend service (8 min)

### 5.1 Create the frontend service

1. Project canvas → **+ Create** → **GitHub repo** → pick the same repo
2. After creation, click the new service → **Settings** → **Source** → set **Root Directory** to `frontend`

### 5.2 Add environment variables

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<your-backend-url>/api/v1` |

> Vite inlines `VITE_*` variables at **build time**, not runtime. Updating this triggers a
> rebuild automatically.

### 5.3 Deploy

Frontend `railway.json` already declares:
- Build: `npm ci && npm run build`
- Start: `npx serve -s dist -l $PORT --no-clipboard`

Watch the logs. Build should finish in ~1 min.

### 5.4 Get the public URL

Service → **Settings** → **Networking** → **Generate Domain** → copy URL.

---

## Phase 6 — Wire them together (5 min)

The chicken-and-egg step. You now have both URLs.

### 6.1 Update `VITE_API_URL` (already done in 5.2 — re-verify)

Frontend service → Variables → `VITE_API_URL` should be `https://<backend-url>/api/v1`.
If wrong, update and Railway will rebuild.

### 6.2 Update `CORS_ORIGIN` on backend

Backend service → Variables → change `CORS_ORIGIN` from `*` to:
```
https://<your-frontend-url>
```
(no trailing slash, e.g. `https://<service-name>-production-xxxx.up.railway.app`)

Backend will redeploy automatically.

---

## Phase 7 — Test the live app (5 min)

1. Open `https://<your-frontend-url>` in your browser
2. Log in with the credentials you set in `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
3. Verify:
   - Dashboard loads with stats
   - Users page → invite a user
   - Create a project, add the user as a member
   - Create a task, assign it to the user
   - Logout, log in as the invited user — they should see only their assigned tasks

---

## Troubleshooting

### Backend deploy fails on `prisma migrate deploy`
- Check that `DATABASE_URL` is set as a reference variable, not a literal string
- Open the Postgres service → confirm it's running (green status)

### Frontend shows blank page
- Open browser devtools → Console tab
- Common issue: `VITE_API_URL` not set or wrong. Frontend was built without it, so requests
  go to the wrong URL.
- Fix: set `VITE_API_URL` in frontend Railway vars → trigger a redeploy

### CORS errors in console
- Backend `CORS_ORIGIN` doesn't match the frontend URL exactly. Check trailing slash, http vs https, etc.

### "Invalid credentials" on login
- Did you run the seed? (Phase 4.6)
- Verify in Railway: Postgres service → Data tab → `users` table → confirm your seed admin email is there

### Migrations didn't run
- Check backend deploy logs — search for `Running prisma migrate deploy`
- Manually trigger via Railway shell: `npx prisma migrate deploy`

---

## Future deployments

Every push to `main` on GitHub triggers an automatic redeploy on Railway. No further setup needed.

```powershell
git add .
git commit -m "feat: my new change"
git push origin main
# Railway auto-deploys both services
```

---

## Switching to a different GitHub account later

When you migrate to a different GitHub account:

1. **On the new account**: create a new repo
2. **Locally**:
   ```powershell
   git config --local user.name "<new-name>"
   git config --local user.email "<new-email>"
   git remote set-url origin https://github.com/<new-username>/<new-repo>.git
   git push -u origin main
   ```
3. **In Railway**:
   - Either create a new Railway project pointing at the new repo (recommended), or
   - Disconnect the current GitHub integration and reconnect to the new account
   - Re-link both services to the new repo's `backend` and `frontend` directories
   - Env vars and Postgres data carry over if you keep the same project

> Past commit authors stay in git history. To rewrite that, you'd need `git filter-branch`
> or BFG Repo-Cleaner — lossy and not recommended unless you really need to scrub history.
