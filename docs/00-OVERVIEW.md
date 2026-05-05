# Team Task Manager — Master Plan

> **Assignment**: Full-Stack Team Task Manager (Candidate Nomination Form)
> **Goal**: Professional-grade web app with hierarchical RBAC, JWT auth, deployed on Railway.
> **Timeline**: 1-2 days (8-12 hours)

---

## Yeh kya hai?

Ek company-grade task manager jisme:

- **Hierarchy proper hai** — flat `Admin/Member` nahi. Ek company me Admin → Managers → Sub-managers → Members. Arbitrary depth.
- **RBAC granular hai** — har role ke pass specific permissions hain (project.create, task.assign, user.invite, etc.)
- **JWT me sab embedded** — token me userId, roles, permissions, hierarchyPath sab aata hai. Backend har request pe verify karta hai.
- **Data scope hierarchy se bandha hai** — manager apne neeche walo ka data dekh sakta hai, upar walo ka nahi.

---

## Stack

| Layer | Tech | Reason |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Fast, type-safe, modern |
| UI | shadcn/ui + Tailwind CSS | Hicaliber pattern, professional look |
| State | Zustand | Lightweight, no boilerplate |
| Routing | React Router v6 | Standard, well-documented |
| Forms | React Hook Form + Zod | Validation + type-safety |
| HTTP | Axios (custom wrapper) | Interceptors for JWT, errors |
| Backend | Node.js + Express + TypeScript | Industry standard, fast |
| ORM | Prisma | Type-safe, migrations, great DX |
| Database | PostgreSQL 18 | Already installed, ltree for hierarchy |
| Auth | JWT (access + refresh) + bcrypt | Stateless, scalable |
| Validation | Zod | Same schemas client + server |
| Deployment | Railway (mono-repo, 2 services) | Mandatory per assignment |

---

## Architecture (high-level)

```
+----------------+       HTTPS         +-------------------+
|  React (Vite)  |  <---------------> |  Express + Prisma |
|  shadcn + TW   |   JWT Bearer       |   PostgreSQL      |
+----------------+                     +-------------------+
        |                                       |
        | Zustand stores                        | RBAC middleware
        | Axios wrapper                         | Service layer
        | Feature folders                       | Repository layer
```

**Clean Architecture (both sides)** — feature-first, layered:
- `data/` — models, repositories (DB or API access)
- `domain/` — services (business logic), errors
- `presentation/` (frontend) — components, pages, hooks, stores
- `routes/` (backend) — controllers, middleware

---

## Hierarchical RBAC — kaise kaam karega

```
Company "Acme Corp"
└── Admin (Sanidhya)
    ├── Manager A
    │   ├── Lead 1
    │   │   ├── Member X
    │   │   └── Member Y
    │   └── Lead 2
    │       └── Member Z
    └── Manager B
        └── Member W
```

- **Path-based hierarchy** — Postgres `ltree` extension. Har user ka `hierarchy_path` like `acme.admin.manager_a.lead_1.member_x`.
- **Subtree query** — manager apne descendants ka data dekh sake: `WHERE hierarchy_path <@ 'acme.admin.manager_a'`
- **Permission resolution** — role permissions + custom user permissions, merged. JWT me array aata hai.

---

## Files in this plan

| File | What's in it |
|---|---|
| `00-OVERVIEW.md` | This file — big picture |
| `01-RBAC-DESIGN.md` | Roles, permissions, hierarchy logic, JWT shape |
| `02-DATABASE-SCHEMA.md` | Tables, relations, Prisma schema, migrations |
| `03-BACKEND-ARCHITECTURE.md` | Folder structure, layers, middleware, error handling |
| `04-FRONTEND-ARCHITECTURE.md` | Folder structure, state, API layer, routing, UI |
| `05-DEPLOYMENT-RAILWAY.md` | Railway setup, env vars, build, domains |
| `06-PHASES.md` | Phase-by-phase execution checklist |

Read in order. Phir setup phase se start karenge.
