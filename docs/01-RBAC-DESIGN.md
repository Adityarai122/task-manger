# RBAC Design — Hierarchical Role-Based Access Control

> Hum flat Admin/Member nahi banayenge. Real company structure jaisa hierarchical system banayenge.

---

## Concepts (clear distinction)

| Term | Meaning |
|---|---|
| **Role** | A named bundle of permissions (e.g., "Admin", "Manager", "Member"). |
| **Permission** | A specific capability (e.g., `project.create`, `task.delete`). |
| **Hierarchy** | Tree of users (manager-subordinate). Independent of role. |
| **Scope** | What data a user can see — derived from hierarchy + permissions. |

> **Important**: Role tells *what you can do*. Hierarchy tells *whose data you can do it on*. Both required.

---

## Built-in Roles (seeded)

| Role | Default permissions | Hierarchy position |
|---|---|---|
| **Admin** | All permissions in the company | Root of tree |
| **Manager** | project.*, task.*, user.invite, user.read (within subtree) | Child of Admin |
| **Lead** | project.read, task.*, user.read (within subtree) | Child of Manager |
| **Member** | project.read, task.read, task.update.own | Leaf |

**Custom roles allowed** — Admin can create new roles with custom permission sets.

---

## Permissions Catalog

Format: `{module}.{action}[.{scope}]`

```ts
// Project module
'project.create'
'project.read'        // any project in user's scope
'project.update'
'project.delete'
'project.member.add'
'project.member.remove'

// Task module
'task.create'
'task.read'
'task.update'         // any task in user's scope
'task.update.own'     // only tasks assigned to self (Member level)
'task.delete'
'task.assign'         // assign to anyone in subtree
'task.status.change'

// User module
'user.invite'         // create user under self in hierarchy
'user.read'           // read users in own subtree
'user.update'         // update users in own subtree
'user.delete'
'user.role.assign'    // assign role to user in own subtree

// Role module (Admin-only by default)
'role.create'
'role.read'
'role.update'
'role.delete'

// Dashboard
'dashboard.view.team'   // see team-level metrics
'dashboard.view.company' // Admin only
```

---

## Hierarchy — Postgres `ltree`

We use Postgres's native `ltree` extension. Each user has a `hierarchyPath`:

```
'acme'                          -- company root (admin sits here)
'acme.mgr_<uuid>'               -- a manager under admin
'acme.mgr_<uuid>.lead_<uuid>'   -- a lead under that manager
'acme.mgr_<uuid>.lead_<uuid>.mem_<uuid>'  -- a member
```

Why ltree?
- **O(log n) subtree queries** — `WHERE path <@ '<ancestor>'` uses GiST index.
- **Built-in operators** — `<@` (descendant of), `@>` (ancestor of), `~` (lquery match).
- **Move subtree** — single update; descendants follow.

### Scope rules

```ts
// Pseudo-code: data scope filter
function scopeFilter(currentUser: User) {
  if (currentUser.hasPermission('project.read.company')) {
    return { companyId: currentUser.companyId }; // see all in company
  }
  // default: only own subtree
  return {
    companyId: currentUser.companyId,
    user: { hierarchyPath: { startsWith: currentUser.hierarchyPath } }
  };
}
```

Every list endpoint applies `scopeFilter` before returning data.

---

## JWT Shape

We embed enough to do permission checks **without DB lookup** on every request.

```json
{
  "sub": "user-uuid",
  "email": "sanidhya@aevis.io",
  "companyId": "company-uuid",
  "hierarchyPath": "acme.admin",
  "roles": ["Admin"],
  "permissions": [
    "project.create", "project.read", "project.update", "project.delete",
    "task.create", "task.read", "task.update", "task.delete", "task.assign",
    "user.invite", "user.read", "user.update", "user.role.assign",
    "role.create", "role.read", "role.update", "role.delete",
    "dashboard.view.company"
  ],
  "iat": 1735689600,
  "exp": 1735693200
}
```

### Two tokens

- **Access token** — short-lived (15 min), contains payload above.
- **Refresh token** — long-lived (7 days), stored httpOnly cookie OR localStorage (we'll use localStorage for simplicity, with rotation on use).

### Permission flow

```
Login
  ↓
Server: fetch user → resolve roles → flatten permissions → sign JWT with permissions array
  ↓
Client: store token in localStorage; decode for UI checks (hide buttons, etc.)
  ↓
Every API call: Bearer <token>
  ↓
Server middleware: verify JWT → req.user = payload → route-level permission check
```

### Why permissions in JWT?

- **No DB hit** for auth checks — fast.
- **Short TTL (15 min)** limits stale-permission risk. Refresh re-pulls fresh permissions.
- **Force re-login on permission change** — Admin can revoke refresh tokens via `tokenVersion` bump.

---

## Permission Check (backend middleware)

```ts
// Single permission
router.post('/projects', requirePermission('project.create'), createProject);

// Any of
router.get('/projects', requireAnyPermission(['project.read', 'project.read.company']), listProjects);

// Scope-aware (within own subtree)
router.patch('/users/:id', requirePermission('user.update'), enforceSubtreeScope('user', 'id'), updateUser);
```

`enforceSubtreeScope` checks that `target.hierarchyPath` is descendant of `req.user.hierarchyPath`.

---

## Permission Check (frontend)

```ts
// Hook
const { has } = usePermissions();
{has('task.create') && <Button>New Task</Button>}

// Route guard
<RequirePermission perm="dashboard.view.company">
  <CompanyDashboard />
</RequirePermission>
```

> **UI checks are convenience only**. Real enforcement is server-side. Never trust the client.

---

## Hierarchy Operations

| Action | Who | Effect |
|---|---|---|
| Invite user under self | Anyone with `user.invite` | New user gets `hierarchyPath = self.hierarchyPath + '.' + newId` |
| Move subtree | `user.update` + must be ancestor of both source and target | Update `hierarchyPath` for node + all descendants (single SQL with ltree) |
| Promote/demote | Admin or Manager-in-chain | Re-attach subtree |
| Delete | `user.delete` + ancestor | Either re-parent children or cascade delete |

---

## Edge cases handled

1. **Last admin protection** — can't delete/demote the only Admin in company.
2. **Cycles impossible** — ltree paths are tree by definition.
3. **Self-promotion blocked** — user can't escalate own role.
4. **Cross-company isolation** — every query filtered by `companyId`. Hierarchy path includes company prefix.
