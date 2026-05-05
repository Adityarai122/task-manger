# Frontend Architecture — React 19 + TypeScript + Vite

> Mirrors the Hicaliber Clean Architecture pattern. Feature-first, layered, type-safe.

---

## Folder structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── config/
│   │   └── env.ts                  # import.meta.env, validated
│   ├── core/
│   │   ├── network/
│   │   │   └── index.ts            # Axios wrapper (Hicaliber-style)
│   │   ├── storage/
│   │   │   └── LocalStorage.ts     # typed wrapper
│   │   ├── state/
│   │   │   └── index.ts            # Zustand factory with middleware
│   │   ├── errors/
│   │   │   └── ExceptionAdapter.ts
│   │   └── utils/
│   │       ├── permissions.ts      # initPermissions, hasPermission
│   │       ├── jwt.ts              # decode helper
│   │       └── cn.ts               # tailwind class merger
│   ├── lib/
│   │   ├── widgets/                # shadcn components (button, dialog, etc.)
│   │   ├── components/             # cross-feature reusable (PageHeader, EmptyState, etc.)
│   │   ├── hooks/
│   │   │   ├── usePermissions.ts
│   │   │   └── useDebounce.ts
│   │   ├── routing/
│   │   │   ├── AppRouter.tsx
│   │   │   ├── routes.ts           # route constants
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── RequirePermission.tsx
│   │   └── features/
│   │       ├── auth/
│   │       │   ├── data/
│   │       │   │   ├── models/
│   │       │   │   │   ├── Login.ts
│   │       │   │   │   ├── Signup.ts
│   │       │   │   │   ├── AccessToken.ts
│   │       │   │   │   └── JwtPayload.ts
│   │       │   │   └── repositories/
│   │       │   │       ├── NetworkAuthRepository.ts
│   │       │   │       └── LocalAuthRepository.ts
│   │       │   ├── domain/
│   │       │   │   └── services/
│   │       │   │       └── AuthService.ts   # singleton
│   │       │   ├── presentation/
│   │       │   │   ├── pages/
│   │       │   │   │   ├── LoginPage.tsx
│   │       │   │   │   └── SignupPage.tsx
│   │       │   │   ├── components/
│   │       │   │   │   └── LoginForm.tsx
│   │       │   │   ├── hooks/
│   │       │   │   │   └── useAuth.ts
│   │       │   │   └── states/
│   │       │   │       └── authState.ts
│   │       │   └── index.ts
│   │       ├── user/
│   │       ├── role/
│   │       ├── project/
│   │       ├── task/
│   │       ├── dashboard/
│   │       └── app/
│   │           └── presentation/pages/AppShell.tsx   # sidebar layout
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── postcss.config.js
```

---

## Layer responsibilities

| Layer | Imports from | Owns |
|---|---|---|
| `data/models` | nothing | DTO types, Zod schemas |
| `data/repositories` | models, core/network, core/storage | API calls, localStorage |
| `domain/services` | data/* | Business logic, singleton instance |
| `presentation/states` | domain/* | Zustand stores |
| `presentation/hooks` | domain/* + states/* | Custom hooks (`useAuth`, `useTasks`) |
| `presentation/components` | hooks/* + lib/widgets | UI primitives, no fetching |
| `presentation/pages` | components/* + hooks/* | Route-level composition |

> **Inner layers never import from outer layers.** Page can import service. Service can never import page.

---

## Network layer (Axios wrapper — Hicaliber-style)

`src/core/network/index.ts` — single class, used by all repositories:

```ts
class Network {
  private client: AxiosInstance;
  constructor() {
    this.client = axios.create({ baseURL: Env.apiUrl });
    this.client.interceptors.request.use(this.attachAuth);
    this.client.interceptors.response.use(this.onResponse, this.onError);
  }

  private attachAuth = (req: InternalAxiosRequestConfig) => {
    const token = AuthService.getToken();
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return req;
  };

  private onError = async (error: AxiosError) => {
    const original = error.config as RequestConfig;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await AuthService.refresh();
        return this.client.request(original);
      } catch {
        await AuthService.logout();
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 400 && !original.skipErrorToast) {
      toast.error(extractMessage(error));
    }
    return Promise.reject(error);
  };

  get<T>(path: string, opts?) { /* ... */ }
  post<T>(path, opts?) { /* ... */ }
  patch<T>(path, opts?) { /* ... */ }
  delete<T>(path, opts?) { /* ... */ }
}
```

---

## State management (Zustand)

`src/core/state/index.ts` — factory:

```ts
export function createStore<T>(name: string, initializer: StateCreator<T>, opts?: { persist?: boolean }) {
  let store = create(immer(initializer));
  if (opts?.persist) store = persist(store, { name });
  return store;
}
```

Per-feature state, e.g., `taskState.ts`:

```ts
interface TaskState {
  tasks: Task[];
  loading: boolean;
  filters: { status?: TaskStatus; assigneeId?: string };
  setFilters: (f: TaskState['filters']) => void;
  fetch: () => Promise<void>;
}

export const useTaskStore = createStore<TaskState>('task', (set, get) => ({
  tasks: [],
  loading: false,
  filters: {},
  setFilters: (filters) => set({ filters }),
  fetch: async () => {
    set({ loading: true });
    try {
      const tasks = await TaskService.list(get().filters);
      set({ tasks, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
```

> **Why Zustand over Redux/RTK**: less boilerplate, and we don't need normalized cache for this scope. For server-state caching, we use simple invalidation (refetch after mutation). React Query is overkill for this scope.

---

## Auth service (singleton, Hicaliber pattern)

```ts
class AuthService {
  static readonly instance = new AuthService();
  private constructor() {}

  private network = new NetworkAuthRepository();
  private local = new LocalAuthRepository();

  getToken() { return this.local.getAccess(); }
  getRefresh() { return this.local.getRefresh(); }

  async login(dto: LoginDto): Promise<JwtPayload> {
    const tokens = await this.network.login(dto);
    this.local.save(tokens);
    return this.parsePayload(tokens.accessToken);
  }

  async signup(dto: SignupDto): Promise<JwtPayload> {
    const tokens = await this.network.signup(dto);
    this.local.save(tokens);
    return this.parsePayload(tokens.accessToken);
  }

  async refresh(): Promise<JwtPayload> {
    const refresh = this.local.getRefresh();
    if (!refresh) throw new Error('No refresh token');
    const tokens = await this.network.refresh(refresh);
    this.local.save(tokens);
    return this.parsePayload(tokens.accessToken);
  }

  async logout() {
    try { await this.network.logout(this.local.getRefresh()); } catch {}
    this.local.clear();
    clearPermissions();
  }

  private parsePayload(token: string): JwtPayload {
    const payload = jwtDecode<JwtPayload>(token);
    initPermissions(payload);
    return payload;
  }
}
export default AuthService.instance;
```

---

## Permissions util

```ts
// core/utils/permissions.ts
let cache: { perms: Set<string>; user: JwtPayload | null } = { perms: new Set(), user: null };

export const initPermissions = (payload: JwtPayload) => {
  cache = { perms: new Set(payload.permissions), user: payload };
};
export const clearPermissions = () => { cache = { perms: new Set(), user: null }; };
export const hasPermission = (key: string) => cache.perms.has(key);
export const hasAnyPermission = (keys: string[]) => keys.some(k => cache.perms.has(k));
export const currentUser = () => cache.user;
```

```ts
// hooks/usePermissions.ts — re-renders when auth state changes
export const usePermissions = () => {
  const user = useAuthStore(s => s.user);
  return useMemo(() => ({
    has: (k: string) => user?.permissions.includes(k) ?? false,
    hasAny: (ks: string[]) => ks.some(k => user?.permissions.includes(k) ?? false),
    user,
  }), [user]);
};
```

---

## Routing

```ts
// routes.ts
export const ROUTES = {
  login: '/login',
  signup: '/signup',
  dashboard: '/',
  projects: '/projects',
  projectDetail: (id = ':id') => `/projects/${id}`,
  tasks: '/tasks',
  team: '/team',
  roles: '/admin/roles',
  users: '/admin/users',
} as const;
```

```tsx
// AppRouter.tsx
<Routes>
  <Route path={ROUTES.login} element={<LoginPage />} />
  <Route path={ROUTES.signup} element={<SignupPage />} />
  <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
    <Route path={ROUTES.dashboard} element={<DashboardPage />} />
    <Route path={ROUTES.projects} element={<ProjectsPage />} />
    <Route path={ROUTES.projectDetail()} element={<ProjectDetailPage />} />
    <Route path={ROUTES.tasks} element={<TasksPage />} />
    <Route path={ROUTES.team} element={<TeamPage />} />
    <Route path={ROUTES.roles} element={
      <RequirePermission perm="role.read"><RolesPage /></RequirePermission>
    } />
    <Route path={ROUTES.users} element={
      <RequirePermission perm="user.read"><UsersPage /></RequirePermission>
    } />
  </Route>
</Routes>
```

---

## UI/UX pages (MVP scope)

| Page | Components | Key features |
|---|---|---|
| Login | LoginForm | email + password, link to signup |
| Signup | SignupForm | company name + admin info, creates everything |
| Dashboard | StatsCards, RecentTasks, OverdueList, UpcomingDue | Permission-aware: Admin sees company-wide, Member sees own |
| Projects | ProjectGrid, CreateProjectDialog | Card view, filter by status |
| Project Detail | TaskBoard (kanban), MembersPanel | Drag-drop status change, member management |
| Tasks (global) | TaskTable, TaskFilters | Filter by project/status/assignee/due date |
| Team | TeamTree (recursive), InviteUserDialog | Visual hierarchy tree, click to expand |
| Roles | RolesTable, RoleEditor | Permission checkboxes grouped by module |
| Users | UsersTable, UserDetailDrawer | Move in tree, change role |

---

## Component conventions

- **shadcn/ui** for primitives (`Button`, `Dialog`, `Sheet`, `Table`, `Form`).
- **React Hook Form + Zod** for all forms — same Zod schemas as backend.
- **sonner** for toasts.
- **lucide-react** icons (single icon library).
- **Tailwind** for layout, spacing, colors. No CSS modules.
- **Suspense + lazy** for route-level code splitting.

---

## Form pattern (RHF + Zod + shadcn Form)

```tsx
const form = useForm<CreateProjectDto>({
  resolver: zodResolver(createProjectSchema),
  defaultValues: { name: '', description: '' },
});

const onSubmit = async (data: CreateProjectDto) => {
  try {
    await ProjectService.create(data);
    toast.success('Project created');
    form.reset();
    onClose();
  } catch (e) { /* network layer already toasted */ }
};

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField name="name" control={form.control} render={({ field }) => (
      <FormItem>
        <FormLabel>Name</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
    <Button type="submit" disabled={form.formState.isSubmitting}>Create</Button>
  </form>
</Form>
```

---

## Performance considerations

- Route-based code splitting (React.lazy).
- Memoize expensive lists (`useMemo`, `React.memo` for row components).
- Debounce search inputs (300ms).
- Pagination on tables (default 20/page).
- Skeleton loaders, not spinners (better perceived perf).
- Optimistic updates for status changes (revert on error).
