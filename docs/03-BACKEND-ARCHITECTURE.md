# Backend Architecture — Node.js + Express + TypeScript

> Clean Architecture, feature-first, layered. Inspired by Hicaliber pattern.

---

## Folder structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── config/
│   │   ├── env.ts                 # validated env (Zod)
│   │   └── constants.ts
│   ├── core/
│   │   ├── db/
│   │   │   └── prisma.ts          # singleton PrismaClient
│   │   ├── errors/
│   │   │   ├── AppError.ts        # base
│   │   │   ├── HttpErrors.ts      # 400/401/403/404/409/500 subclasses
│   │   │   └── errorHandler.ts    # express error middleware
│   │   ├── logger/
│   │   │   └── index.ts           # pino
│   │   ├── middleware/
│   │   │   ├── authenticate.ts    # JWT verify → req.user
│   │   │   ├── requirePermission.ts
│   │   │   ├── enforceSubtreeScope.ts
│   │   │   ├── validateRequest.ts # Zod schema validation
│   │   │   └── rateLimiter.ts
│   │   └── utils/
│   │       ├── jwt.ts             # sign/verify access + refresh
│   │       ├── password.ts        # bcrypt wrapper
│   │       ├── ltree.ts           # build paths, escape segments
│   │       └── asyncHandler.ts    # wraps controllers, forwards errors
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schema.ts     # Zod
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.schema.ts
│   │   ├── role/
│   │   │   └── ...
│   │   ├── project/
│   │   │   └── ...
│   │   ├── task/
│   │   │   └── ...
│   │   └── dashboard/
│   │       └── ...
│   ├── app.ts                     # express app, middleware, route mount
│   └── server.ts                  # listen
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile (or railway.json)
```

---

## Layers (per feature)

```
HTTP request
    ↓
[routes.ts]   → defines paths, attaches middleware
    ↓
[controller]  → parses req, calls service, sends res. NO business logic.
    ↓
[service]     → business rules, orchestrates repos. THIS is where logic lives.
    ↓
[repository]  → Prisma queries only. Returns domain objects.
    ↓
PostgreSQL
```

**Rule**: dependencies flow inward. Repository never imports controller. Service never imports Express types.

---

## Example: project feature

### `project.routes.ts`
```ts
import { Router } from 'express';
import { authenticate } from '@/core/middleware/authenticate';
import { requirePermission } from '@/core/middleware/requirePermission';
import { validateRequest } from '@/core/middleware/validateRequest';
import { createProjectSchema, updateProjectSchema } from './project.schema';
import * as ctrl from './project.controller';

const router = Router();
router.use(authenticate);

router.get('/',  requirePermission('project.read'), ctrl.list);
router.post('/', requirePermission('project.create'), validateRequest(createProjectSchema), ctrl.create);
router.get('/:id',  requirePermission('project.read'), ctrl.getById);
router.patch('/:id', requirePermission('project.update'), validateRequest(updateProjectSchema), ctrl.update);
router.delete('/:id', requirePermission('project.delete'), ctrl.remove);

router.post('/:id/members',  requirePermission('project.member.add'), ctrl.addMember);
router.delete('/:id/members/:userId', requirePermission('project.member.remove'), ctrl.removeMember);

export default router;
```

### `project.controller.ts`
```ts
import { asyncHandler } from '@/core/utils/asyncHandler';
import * as service from './project.service';

export const list = asyncHandler(async (req, res) => {
  const projects = await service.list(req.user);
  res.json({ data: projects });
});

export const create = asyncHandler(async (req, res) => {
  const project = await service.create(req.user, req.body);
  res.status(201).json({ data: project });
});
// ...
```

### `project.service.ts`
```ts
import { ForbiddenError, NotFoundError } from '@/core/errors/HttpErrors';
import * as repo from './project.repository';
import type { JwtUser } from '@/core/middleware/authenticate';
import type { CreateProjectDto } from './project.schema';

export async function list(user: JwtUser) {
  // scope filter: only projects in company
  return repo.findManyByCompany(user.companyId);
}

export async function create(user: JwtUser, dto: CreateProjectDto) {
  return repo.create({
    companyId: user.companyId,
    ownerId: user.sub,
    name: dto.name,
    description: dto.description,
  });
}

export async function update(user: JwtUser, id: string, dto: UpdateProjectDto) {
  const project = await repo.findById(id);
  if (!project) throw new NotFoundError('Project not found');
  if (project.companyId !== user.companyId) throw new ForbiddenError();

  // additional rule: only owner or someone with project.update.any can edit
  const isOwner = project.ownerId === user.sub;
  const hasGlobal = user.permissions.includes('project.update.any');
  if (!isOwner && !hasGlobal) throw new ForbiddenError();

  return repo.update(id, dto);
}
```

### `project.repository.ts`
```ts
import { prisma } from '@/core/db/prisma';

export const findManyByCompany = (companyId: string) =>
  prisma.project.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });

export const findById = (id: string) =>
  prisma.project.findUnique({ where: { id } });

export const create = (data: { companyId: string; ownerId: string; name: string; description?: string }) =>
  prisma.project.create({ data });

export const update = (id: string, data: any) =>
  prisma.project.update({ where: { id }, data });
```

---

## Middleware design

### `authenticate`
```ts
export interface JwtUser {
  sub: string;
  email: string;
  companyId: string;
  hierarchyPath: string;
  roles: string[];
  permissions: string[];
}

declare module 'express-serve-static-core' {
  interface Request { user: JwtUser; }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing token');
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new UnauthorizedError('Invalid token');
  }
};
```

### `requirePermission(key)`
```ts
export const requirePermission = (key: string): RequestHandler => (req, _res, next) => {
  if (!req.user.permissions.includes(key)) throw new ForbiddenError(`Missing permission: ${key}`);
  next();
};
```

### `enforceSubtreeScope(resource, paramKey)`
```ts
// Loads the target resource, checks its owner's hierarchyPath is descendant of req.user.hierarchyPath
export const enforceSubtreeScope = (loader: (id: string) => Promise<{ hierarchyPath: string } | null>, paramKey = 'id'): RequestHandler =>
  async (req, _res, next) => {
    const target = await loader(req.params[paramKey]);
    if (!target) throw new NotFoundError();
    if (!isDescendantOrEqual(target.hierarchyPath, req.user.hierarchyPath)) throw new ForbiddenError();
    next();
  };
```

### `validateRequest(schema)`
```ts
export const validateRequest = (schema: ZodSchema): RequestHandler => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) throw new BadRequestError(result.error.flatten());
  req.body = result.data;
  next();
};
```

---

## Error handling

```ts
// AppError.ts
export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

// HttpErrors.ts
export class BadRequestError extends AppError { constructor(d?: unknown) { super(400, 'BAD_REQUEST', 'Bad request', d); } }
export class UnauthorizedError extends AppError { constructor(m='Unauthorized') { super(401, 'UNAUTHORIZED', m); } }
export class ForbiddenError extends AppError { constructor(m='Forbidden') { super(403, 'FORBIDDEN', m); } }
export class NotFoundError extends AppError { constructor(m='Not found') { super(404, 'NOT_FOUND', m); } }
export class ConflictError extends AppError { constructor(m='Conflict') { super(409, 'CONFLICT', m); } }

// errorHandler.ts (last middleware)
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
};
```

---

## Auth flow (detailed)

### Signup (creates company + admin)
```
POST /api/v1/auth/signup
{ companyName, name, email, password }
  ↓
1. Validate (Zod)
2. Check email uniqueness
3. Begin transaction:
   - Create Company (slug = slugify(companyName))
   - Hash password
   - Create User (parentId=null, hierarchyPath = '<slug>')
   - Find/create system roles for this company (Admin, Manager, Lead, Member)
   - Assign Admin role
4. Generate access + refresh tokens
5. Return { user, accessToken, refreshToken }
```

### Invite user
```
POST /api/v1/users/invite   [requires: user.invite]
{ name, email, password (or invite link), roleId, parentId? }
  ↓
1. parentId defaults to req.user.sub
2. Verify parent is in own subtree (or is self)
3. Create user with hierarchyPath = parent.hierarchyPath + '.' + newUuid (sanitized)
4. Assign role
5. Return user
```

### Login
```
POST /api/v1/auth/login
{ email, password }
  ↓
1. Find user, verify password
2. Resolve effective permissions (roles ⨯ permissions, minus DENY overrides, plus GRANT overrides)
3. Sign access token (15m), refresh token (7d)
4. Store refresh token hash in DB
5. Return tokens + user shape
```

### Refresh
```
POST /api/v1/auth/refresh
{ refreshToken }
  ↓
1. Verify token signature
2. Find by hash in DB; check not revoked, not expired
3. Re-resolve permissions (fresh!)
4. Issue new access + new refresh (rotation)
5. Mark old refresh as revoked
```

### Logout
```
POST /api/v1/auth/logout
1. Mark refresh token revoked
2. Optional: bump tokenVersion → all access tokens for user become invalid on next refresh attempt
```

---

## Validation strategy (Zod)

Same Zod schemas exported as types for both frontend and backend (via shared package OR copy-paste — for this project, copy-paste OK).

```ts
// auth.schema.ts
export const signupSchema = z.object({
  companyName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type SignupDto = z.infer<typeof signupSchema>;
```

---

## Logging & observability

- **pino** structured logging.
- Request ID middleware (uuid per request, included in all logs).
- Log levels: `error` (5xx), `warn` (4xx auth/forbidden), `info` (request summary), `debug` (dev only).
- Skip logging password / token fields (custom serializer).

---

## Security checklist

- [x] bcrypt cost ≥ 12
- [x] JWT secret from env, ≥ 32 random bytes
- [x] HTTPS only in prod (Railway terminates TLS)
- [x] CORS allowlist (frontend domain only)
- [x] Helmet middleware (CSP, HSTS, etc.)
- [x] Rate limiting on /auth/* (5 attempts / 15 min per IP)
- [x] Input validation everywhere (Zod)
- [x] No raw SQL except ltree-specific (parameterized always)
- [x] Refresh token rotation
- [x] tokenVersion column for forced logout
- [x] Don't leak stack traces in prod responses
