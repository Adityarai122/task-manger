import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import UserService from '../../domain/services/UserService';
import type { RoleName, User } from '../../data/models/User';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Card, CardContent } from '@/lib/widgets/card';
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
import { InviteUserDialog } from '../components/InviteUserDialog';

const formatDate = (iso: string) => {
  try {
    return format(new Date(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
};

export function UsersAdminPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await UserService.list());
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRoleChange = async (user: User, role: RoleName) => {
    try {
      const updated = await UserService.changeRole(user.id, role);
      setUsers((curr) => curr.map((u) => (u.id === user.id ? updated : u)));
      toast.success(`${user.name} is now ${role}`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (user.isActive) {
        await UserService.deactivate(user.id);
        setUsers((curr) =>
          curr.map((u) => (u.id === user.id ? { ...u, isActive: false } : u)),
        );
        toast.success(`Deactivated ${user.email}`);
      } else {
        const updated = await UserService.update(user.id, { isActive: true });
        setUsers((curr) => curr.map((u) => (u.id === user.id ? updated : u)));
        toast.success(`Reactivated ${user.email}`);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const adminCount = users.filter((u) => u.roles.includes('Admin') && u.isActive).length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} total · {activeCount} active · {adminCount} admin
          </p>
        </div>
        <InviteUserDialog onCreated={load} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      Loading users…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isMe = u.id === me?.id;
                    const isAdmin = u.roles.includes('Admin');
                    return (
                      <tr
                        key={u.id}
                        className={cn(
                          'border-b last:border-0 transition-colors',
                          isMe ? 'bg-primary/5' : 'hover:bg-muted/40',
                          !u.isActive && 'opacity-60',
                        )}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar name={u.name} seed={u.email} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold truncate">{u.name}</p>
                                {isMe && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isAdmin ? 'default' : 'secondary'} className="gap-1">
                            {isAdmin && <ShieldCheck className="h-3 w-3" />}
                            {u.roles[0] ?? 'User'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                        <td className="px-6 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isMe}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
                                Manage user
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {isAdmin ? (
                                <DropdownMenuItem onClick={() => handleRoleChange(u, 'User')}>
                                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                                  Demote to User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleRoleChange(u, 'Admin')}>
                                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                                  Promote to Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(u)}
                                className={u.isActive ? 'text-destructive focus:text-destructive' : ''}
                              >
                                {u.isActive ? (
                                  <>
                                    <UserX className="mr-2 h-3.5 w-3.5" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-3.5 w-3.5" />
                                    Reactivate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
