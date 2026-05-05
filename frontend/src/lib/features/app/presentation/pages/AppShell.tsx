import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CheckSquare2,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  User as UserIcon,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import AuthService from '@/lib/features/auth/domain/services/AuthService';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ROUTES } from '@/lib/routing/routes';
import { Button } from '@/lib/widgets/button';
import { Badge } from '@/lib/widgets/badge';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/lib/widgets/dropdown-menu';
import { toast } from '@/lib/widgets/sonner';
import { cn } from '@/core/utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  group: 'main' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { to: ROUTES.projects, label: 'Projects', icon: FolderKanban, permission: 'project.read', group: 'main' },
  { to: ROUTES.tasks, label: 'Tasks', icon: CheckSquare, permission: 'task.read', group: 'main' },
  { to: ROUTES.profile, label: 'Profile', icon: UserIcon, group: 'main' },
  { to: ROUTES.users, label: 'Users', icon: Settings, permission: 'user.read', group: 'admin' },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { has } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await AuthService.logout();
    toast.success('Signed out');
    navigate(ROUTES.login, { replace: true });
  };

  const visible = NAV_ITEMS.filter((i) => !i.permission || has(i.permission));
  const mainNav = visible.filter((i) => i.group === 'main');
  const adminNav = visible.filter((i) => i.group === 'admin');
  const isAdmin = user?.roles.includes('Admin');

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">
        <SidebarContent mainNav={mainNav} adminNav={adminNav} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r">
            <SidebarContent
              mainNav={mainNav}
              adminNav={adminNav}
              onItemClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card/80 backdrop-blur px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 px-2 gap-2 hover:bg-muted">
                {user && <UserAvatar name={user.name} seed={user.email} size="sm" />}
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-[11px] text-muted-foreground">{user?.roles.join(', ')}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal pb-3">
                <div className="flex items-center gap-3">
                  {user && <UserAvatar name={user.name} seed={user.email} size="md" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{user?.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    <div className="mt-1">
                      <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 h-4">
                        {user?.roles.join(', ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(ROUTES.profile)}>
                <UserIcon className="mr-2 h-4 w-4" />
                My profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  mainNav,
  adminNav,
  onItemClick,
}: {
  mainNav: NavItem[];
  adminNav: NavItem[];
  onItemClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
          <CheckSquare2 className="h-5 w-5" />
        </div>
        <Link to={ROUTES.dashboard} className="font-semibold tracking-tight" onClick={onItemClick}>
          TaskManager
        </Link>
      </div>
      <nav className="flex-1 space-y-6 p-3 overflow-y-auto">
        <NavGroup label="Workspace" items={mainNav} onItemClick={onItemClick} />
        {adminNav.length > 0 && (
          <NavGroup label="Administration" items={adminNav} onItemClick={onItemClick} />
        )}
      </nav>
      <div className="p-4 border-t text-[11px] text-muted-foreground">
        v1.0 — built with React + Express
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  onItemClick,
}: {
  label: string;
  items: NavItem[];
  onItemClick?: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="px-3 mb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.dashboard}
            onClick={onItemClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground/70 hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}
