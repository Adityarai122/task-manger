import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { CalendarDays, ListChecks } from 'lucide-react';
import TaskService from '../../domain/services/TaskService';
import type { Task, TaskStatus } from '../../data/models/Task';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '../../data/models/Task';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { ROUTES } from '@/lib/routing/routes';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Card, CardContent } from '@/lib/widgets/card';
import { Button } from '@/lib/widgets/button';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { toast } from '@/lib/widgets/sonner';
import { cn } from '@/core/utils/cn';

const PRIORITY_PILL: Record<Task['priority'], string> = {
  LOW: 'bg-slate-50 text-slate-700 ring-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-200',
  HIGH: 'bg-amber-50 text-amber-700 ring-amber-200',
  URGENT: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-amber-400',
  IN_REVIEW: 'bg-violet-400',
  DONE: 'bg-emerald-500',
};

export function TasksPage() {
  const me = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await TaskService.list({ mine: scope === 'mine' });
      setTasks(list);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? tasks : tasks.filter((t) => t.status === statusFilter)),
    [tasks, statusFilter],
  );

  const counts = useMemo(() => {
    const c: Record<TaskStatus | 'ALL', number> = {
      ALL: tasks.length,
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };
    for (const t of tasks) c[t.status] += 1;
    return c;
  }, [tasks]);

  const isAdmin = me?.roles.includes('Admin');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {scope === 'mine' ? 'Tasks assigned to you' : 'All tasks in your scope'}
            {' · '}
            {filtered.length} shown
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
            <Button
              variant={scope === 'mine' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScope('mine')}
            >
              Assigned to me
            </Button>
            <Button
              variant={scope === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScope('all')}
            >
              All tasks
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(['ALL', ...TASK_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
              statusFilter === s
                ? 'bg-primary text-primary-foreground ring-primary'
                : 'bg-card text-foreground/70 ring-border hover:bg-muted',
            )}
          >
            {s !== 'ALL' && <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[s])} />}
            {s === 'ALL' ? 'All' : TASK_STATUS_LABEL[s]}
            <span className="opacity-70 tabular-nums">({counts[s]})</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Created by</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No tasks match.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const overdue = t.dueDate && t.status !== 'DONE' && isPast(new Date(t.dueDate));
                    const mine = t.assignee?.id === me?.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setOpenTask(t)}
                        className={cn(
                          'border-b last:border-0 transition-colors cursor-pointer',
                          mine ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40',
                        )}
                      >
                        <td className="px-6 py-3 font-medium">{t.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <Link
                            to={ROUTES.projectDetail(t.projectId)}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-foreground hover:underline"
                          >
                            {t.projectName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[t.status])} />
                            {TASK_STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                              PRIORITY_PILL[t.priority],
                            )}
                          >
                            {t.priority.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.dueDate ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1',
                                overdue && 'text-destructive font-medium',
                              )}
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              {format(new Date(t.dueDate), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {t.assignee ? (
                            <div className="inline-flex items-center gap-2">
                              <UserAvatar name={t.assignee.name} seed={t.assignee.email} size="xs" />
                              <div className="flex flex-col leading-tight">
                                <span className={cn('text-xs', mine && 'font-semibold text-primary')}>
                                  {mine ? 'You' : t.assignee.name}
                                </span>
                                {mine && t.createdBy.id !== me?.id && (
                                  <span className="text-[10px] text-primary/70">
                                    by {t.createdBy.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-2">
                            <UserAvatar name={t.createdBy.name} seed={t.createdBy.email} size="xs" />
                            <span className="text-xs text-muted-foreground">
                              {t.createdBy.id === me?.id ? 'You' : t.createdBy.name}
                            </span>
                          </div>
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

      <TaskDetailDialog
        task={openTask}
        onClose={() => setOpenTask(null)}
        onChanged={load}
      />
    </div>
  );
}
