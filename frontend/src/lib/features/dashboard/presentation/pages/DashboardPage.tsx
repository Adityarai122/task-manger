import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderKanban,
  Inbox,
  ListChecks,
  Sparkles,
  Users2,
} from 'lucide-react';
import DashboardService from '../../domain/services/DashboardService';
import type { DashboardSnapshot } from '../../data/models/Dashboard';
import TaskService from '@/lib/features/task/domain/services/TaskService';
import type { Task } from '@/lib/features/task/data/models/Task';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { TASK_STATUS_LABEL } from '@/lib/features/task/data/models/Task';
import { ROUTES } from '@/lib/routing/routes';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Card, CardContent } from '@/lib/widgets/card';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import { TaskDetailDialog } from '@/lib/features/task/presentation/components/TaskDetailDialog';
import { toast } from '@/lib/widgets/sonner';
import { cn } from '@/core/utils/cn';

const STATUS_COLOR: Record<string, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-amber-400',
  IN_REVIEW: 'bg-violet-400',
  DONE: 'bg-emerald-500',
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const reload = () => {
    Promise.all([DashboardService.get(), TaskService.list({ mine: true })])
      .then(([s, t]) => {
        setSnap(s);
        setMyTasks(t);
      })
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const incoming = useMemo(
    () =>
      myTasks
        .filter((t) => t.status !== 'DONE' && t.createdBy.id !== user?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [myTasks, user?.id],
  );

  if (!user) return null;
  const isAdmin = user.roles.includes('Admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {user.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Company-wide view of projects, tasks, and people.'
            : 'Tasks assigned to you and projects you belong to.'}
        </p>
      </div>

      {incoming.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Inbox className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold inline-flex items-center gap-1.5">
                    Assigned to you
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {incoming.length} open task{incoming.length === 1 ? '' : 's'} someone gave you
                  </p>
                </div>
              </div>
              <Link
                to={ROUTES.tasks}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            <ul className="space-y-2">
              {incoming.map((t) => {
                const overdue = t.dueDate && isPast(new Date(t.dueDate));
                return (
                  <li
                    key={t.id}
                    onClick={() => setOpenTask(t)}
                    className="flex items-center justify-between gap-3 rounded-md bg-card p-3 hover:shadow-sm transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserAvatar
                        name={t.createdBy.name}
                        seed={t.createdBy.email}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          From <span className="font-medium text-foreground">{t.createdBy.name}</span>
                          {' · '}
                          {t.projectName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLOR[t.status])} />
                        {TASK_STATUS_LABEL[t.status]}
                      </span>
                      {t.dueDate && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                            overdue
                              ? 'bg-rose-50 text-rose-700 ring-rose-200'
                              : 'bg-slate-50 text-slate-600 ring-slate-200',
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {format(new Date(t.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={snap?.projects.total ?? '—'}
          subline={snap ? `${snap.projects.active} active · ${snap.projects.archived} archived` : undefined}
          icon={FolderKanban}
          tone="indigo"
        />
        <StatCard
          label="Tasks"
          value={snap?.tasks.total ?? '—'}
          subline={snap ? `${snap.tasks.byStatus.DONE} completed` : undefined}
          icon={ListChecks}
          tone="violet"
        />
        <StatCard
          label="Overdue"
          value={snap?.tasks.overdue ?? '—'}
          subline="not yet completed"
          icon={AlertTriangle}
          tone={snap && snap.tasks.overdue > 0 ? 'rose' : 'slate'}
          highlight={snap !== null && snap.tasks.overdue > 0}
        />
        {snap?.users ? (
          <StatCard
            label="Team"
            value={snap.users.total}
            subline={`${snap.users.active} active`}
            icon={Users2}
            tone="emerald"
          />
        ) : (
          <StatCard
            label="Assigned to you"
            value={snap?.tasks.assignedToMe ?? '—'}
            subline="across all projects"
            icon={CheckCircle2}
            tone="emerald"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold">Tasks by status</h2>
              <p className="text-xs text-muted-foreground">
                {snap ? `Across ${snap.projects.active} active project(s)` : ''}
              </p>
            </div>
            <div className="space-y-3">
              {snap ? (
                (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((status) => {
                  const count = snap.tasks.byStatus[status];
                  const max = Math.max(snap.tasks.total, 1);
                  const pct = (count / max) * 100;
                  return (
                    <div key={status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <span className={cn('h-2 w-2 rounded-full', STATUS_COLOR[status])} />
                          {TASK_STATUS_LABEL[status]}
                        </span>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full transition-all rounded-full', STATUS_COLOR[status])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <p className="text-sm text-muted-foreground">No data.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Recent activity</h2>
                <p className="text-xs text-muted-foreground">Last updated tasks in your scope</p>
              </div>
            </div>
            {snap && snap.recentTasks.length > 0 ? (
              <ul className="space-y-2.5">
                {snap.recentTasks.map((t) => {
                  const overdue = t.dueDate && t.status !== 'DONE' && isPast(new Date(t.dueDate));
                  const mine = t.assignee?.id === user.id;
                  return (
                    <li
                      key={t.id}
                      onClick={() => setOpenTask(t)}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-md p-2.5 transition-colors cursor-pointer',
                        mine ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {t.assignee ? (
                          <UserAvatar
                            name={t.assignee.name}
                            seed={t.assignee.email}
                            size="sm"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-muted ring-1 ring-border" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {t.projectName} · {t.assignee ? (mine ? 'You' : t.assignee.name) : 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLOR[t.status])} />
                          {TASK_STATUS_LABEL[t.status]}
                        </span>
                        {t.dueDate && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                              overdue
                                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                                : 'bg-slate-50 text-slate-600 ring-slate-200',
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {format(new Date(t.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDetailDialog
        task={openTask}
        onClose={() => setOpenTask(null)}
        onChanged={reload}
      />
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const TONE: Record<string, { bg: string; text: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600' },
};

interface StatCardProps {
  label: string;
  value: number | string;
  subline?: string;
  icon: React.ElementType;
  tone: keyof typeof TONE;
  highlight?: boolean;
}

function StatCard({ label, value, subline, icon: Icon, tone, highlight }: StatCardProps) {
  const t = TONE[tone];
  return (
    <Card className={cn('transition-shadow hover:shadow-md', highlight && 'ring-1 ring-rose-200')}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {label}
          </p>
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', t.bg)}>
            <Icon className={cn('h-4 w-4', t.text)} />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          {subline && <p className="text-xs text-muted-foreground mt-0.5">{subline}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
