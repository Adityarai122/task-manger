# Database Schema — PostgreSQL + Prisma

> All tables include `id` (UUID), `createdAt`, `updatedAt`. Soft-delete (`deletedAt`) on user-facing entities.

---

## ER Diagram (text)

```
Company 1───* User *───* UserRole *───1 Role *───* RolePermission *───1 Permission
                │                                                          │
                ├── hierarchyPath (ltree)                                  │
                │                                                          │
                *                                                          │
            UserPermission ──────────────────────────────────────────────┘
                                (custom user-level overrides)

Company 1───* Project *───* ProjectMember *───1 User
                            │
                            *
                          Task *───1 User (assignee)
                            │
                            *
                          TaskComment (optional, stretch)
```

---

## Tables

### company
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| slug | TEXT UNIQUE | used in ltree root |
| createdAt | TIMESTAMP | |

### user
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| companyId | UUID FK → company | |
| email | TEXT UNIQUE | |
| passwordHash | TEXT | bcrypt |
| name | TEXT | |
| hierarchyPath | LTREE | indexed (GiST) |
| parentId | UUID FK → user (nullable) | denormalized convenience |
| tokenVersion | INT default 0 | bump to invalidate refresh tokens |
| isActive | BOOL default true | |
| createdAt / updatedAt / deletedAt | | |

Indexes: `(companyId)`, `GIST(hierarchyPath)`, `(email)`, `(parentId)`

### role
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| companyId | UUID FK | role scoped to company (allows custom roles) |
| name | TEXT | "Admin", "Manager", "Custom-X" |
| isSystem | BOOL | true for built-in roles, can't be deleted |

Unique: `(companyId, name)`

### permission
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| key | TEXT UNIQUE | e.g., `project.create` |
| description | TEXT | |
| module | TEXT | `project`, `task`, `user`, `role`, `dashboard` |

Seeded once at app start — same across all companies.

### role_permission
| col | type |
|---|---|
| roleId | UUID FK |
| permissionId | UUID FK |
PK: `(roleId, permissionId)`

### user_role
| col | type |
|---|---|
| userId | UUID FK |
| roleId | UUID FK |
| assignedById | UUID FK |
| assignedAt | TIMESTAMP |
PK: `(userId, roleId)`

> A user can have multiple roles. Effective permissions = union of all role permissions.

### user_permission (overrides)
| col | type | notes |
|---|---|---|
| userId | UUID FK | |
| permissionId | UUID FK | |
| effect | ENUM('GRANT', 'DENY') | DENY beats GRANT |
PK: `(userId, permissionId)`

> Optional advanced feature: grant/revoke specific permissions for a user without creating a custom role.

### project
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| companyId | UUID FK | |
| name | TEXT | |
| description | TEXT | |
| ownerId | UUID FK → user | creator |
| status | ENUM('ACTIVE', 'ARCHIVED') | |
| createdAt / updatedAt | | |

Index: `(companyId, status)`

### project_member
| col | type |
|---|---|
| projectId | UUID FK |
| userId | UUID FK |
| roleInProject | ENUM('OWNER', 'CONTRIBUTOR', 'VIEWER') |
| addedAt | TIMESTAMP |
PK: `(projectId, userId)`

### task
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| projectId | UUID FK | |
| title | TEXT | |
| description | TEXT | |
| status | ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE') | |
| priority | ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') | |
| assigneeId | UUID FK → user (nullable) | |
| createdById | UUID FK → user | |
| dueDate | TIMESTAMP nullable | |
| completedAt | TIMESTAMP nullable | |
| createdAt / updatedAt | | |

Indexes: `(projectId, status)`, `(assigneeId, status)`, `(dueDate)` for overdue queries.

### refresh_token
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| userId | UUID FK | |
| tokenHash | TEXT | sha256 of token, never store raw |
| expiresAt | TIMESTAMP | |
| revokedAt | TIMESTAMP nullable | |
| userAgent / ip | TEXT | audit |

---

## Prisma schema (sketch)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  slug      String   @unique
  users     User[]
  projects  Project[]
  roles     Role[]
  createdAt DateTime @default(now())
}

model User {
  id            String  @id @default(uuid()) @db.Uuid
  companyId     String  @db.Uuid
  company       Company @relation(fields: [companyId], references: [id])
  email         String  @unique
  passwordHash  String
  name          String
  // ltree managed via raw SQL — Prisma stores as Unsupported("ltree")
  hierarchyPath Unsupported("ltree")
  parentId      String? @db.Uuid
  parent        User?   @relation("Hierarchy", fields: [parentId], references: [id])
  children      User[]  @relation("Hierarchy")
  tokenVersion  Int     @default(0)
  isActive      Boolean @default(true)
  roles         UserRole[]
  permissions   UserPermission[]
  createdProjects Project[] @relation("ProjectOwner")
  projectMemberships ProjectMember[]
  assignedTasks Task[] @relation("TaskAssignee")
  createdTasks  Task[] @relation("TaskCreator")
  refreshTokens RefreshToken[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  @@index([companyId])
  @@index([parentId])
}

model Role {
  id          String @id @default(uuid()) @db.Uuid
  companyId   String @db.Uuid
  company     Company @relation(fields: [companyId], references: [id])
  name        String
  isSystem    Boolean @default(false)
  permissions RolePermission[]
  users       UserRole[]
  @@unique([companyId, name])
}

model Permission {
  id          String @id @default(uuid()) @db.Uuid
  key         String @unique
  description String
  module      String
  roles       RolePermission[]
  users       UserPermission[]
}

model RolePermission {
  roleId       String @db.Uuid
  permissionId String @db.Uuid
  role         Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

model UserRole {
  userId      String @db.Uuid
  roleId      String @db.Uuid
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  assignedAt  DateTime @default(now())
  @@id([userId, roleId])
}

model UserPermission {
  userId       String @db.Uuid
  permissionId String @db.Uuid
  effect       PermissionEffect
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([userId, permissionId])
}

enum PermissionEffect { GRANT DENY }

model Project {
  id          String @id @default(uuid()) @db.Uuid
  companyId   String @db.Uuid
  company     Company @relation(fields: [companyId], references: [id])
  name        String
  description String?
  ownerId     String @db.Uuid
  owner       User   @relation("ProjectOwner", fields: [ownerId], references: [id])
  status      ProjectStatus @default(ACTIVE)
  members     ProjectMember[]
  tasks       Task[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([companyId, status])
}

enum ProjectStatus { ACTIVE ARCHIVED }

model ProjectMember {
  projectId    String @db.Uuid
  userId       String @db.Uuid
  roleInProject ProjectRole @default(CONTRIBUTOR)
  project      Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  addedAt      DateTime @default(now())
  @@id([projectId, userId])
}

enum ProjectRole { OWNER CONTRIBUTOR VIEWER }

model Task {
  id          String @id @default(uuid()) @db.Uuid
  projectId   String @db.Uuid
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  assigneeId  String? @db.Uuid
  assignee    User?   @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdById String @db.Uuid
  createdBy   User    @relation("TaskCreator", fields: [createdById], references: [id])
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([projectId, status])
  @@index([assigneeId, status])
  @@index([dueDate])
}

enum TaskStatus { TODO IN_PROGRESS IN_REVIEW DONE }
enum TaskPriority { LOW MEDIUM HIGH URGENT }

model RefreshToken {
  id        String @id @default(uuid()) @db.Uuid
  userId    String @db.Uuid
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String @unique
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  ip        String?
  createdAt DateTime @default(now())
}
```

---

## Migrations strategy

1. `prisma migrate dev --name init` — base tables.
2. **Raw SQL migration** for `ltree`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS ltree;
   ALTER TABLE "User" ADD COLUMN "hierarchyPath" ltree NOT NULL DEFAULT '';
   CREATE INDEX user_hierarchy_path_gist ON "User" USING GIST ("hierarchyPath");
   ```
3. Seed script (`prisma/seed.ts`) — inserts permissions catalog + system roles.

---

## Sample queries

```sql
-- Subtree of user X (descendants)
SELECT * FROM "User" WHERE "hierarchyPath" <@ 'acme.mgr_abc';

-- All ancestors of user X
SELECT * FROM "User" WHERE "hierarchyPath" @> 'acme.mgr_abc.lead_def';

-- Direct children only (depth = parent_depth + 1)
SELECT * FROM "User"
WHERE "hierarchyPath" ~ 'acme.mgr_abc.*{1}';

-- Overdue tasks for current user's subtree
SELECT t.* FROM "Task" t
JOIN "User" u ON u.id = t."assigneeId"
WHERE u."hierarchyPath" <@ $1::ltree
  AND t.status != 'DONE'
  AND t."dueDate" < NOW();
```
