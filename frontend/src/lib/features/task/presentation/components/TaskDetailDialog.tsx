import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Sparkles,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import type { Task, TaskStatus } from '../../data/models/Task';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '../../data/models/Task';
import TaskService from '../../domain/services/TaskService';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ROUTES } from '@/lib/routing/routes';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Button } from '@/lib/widgets/button';
import { Badge } from '@/lib/widgets/badge';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/lib/widgets/dialog';
import { toast } from '@/lib/widgets/sonner';
import { useConfirm } from '@/lib/widgets/confirm';
import { cn } from '@/core/utils/cn';

const PRIORITY_STYLE: Record<Task['priority'], string> = {
  LOW: 'bg-slate-100 text-slate-700 ring-slate-200',
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

interface Props {
  task: Task | null;
  onClose: () => void;
  onChanged: () => void;
}

export function TaskDetailDialog({ task, onClose, onChanged }: Props) {
  const me = useAuthStore((s) => s.user);
  const { has } = usePermissions();
  const confirm = useConfirm();
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!task || !me) {
    return (
      <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const isAssignee = task.assignee?.id === me.id;
  const isCreator = task.createdBy.id === me.id;
  const isAdmin = has('task.update');
  const canChangeStatus = isAdmin || isAssignee;
  const canDelete = has('task.delete');

  const overdue = task.dueDate && task.status !== 'DONE' && isPast(new Date(task.dueDate));
  const assignedByOther = task.assignee && task.createdBy.id !== task.assignee.id;

  const handleStatus = async (status: TaskStatus) => {
    setUpdating(true);
    try {
      if (isAdmin) await TaskService.update(task.id, { status });
      else await TaskService.updateOwn(task.id, { status });
      toast.success(`Marked ${TASK_STATUS_LABEL[status]}`);
      onChanged();
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${task.title}"?`,
      description: 'This task will be removed permanently.',
      confirmText: 'Delete task',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await TaskService.remove(task.id);
      toast.success('Task deleted');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-8">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-card',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[task.status])} />
              {TASK_STATUS_LABEL[task.status]}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                PRIORITY_STYLE[task.priority],
              )}
            >
              <Flame className="h-3 w-3" />
              {task.priority.toLowerCase()}
            </span>
            {overdue && (
              <Badge variant="destructive" className="gap-1 text-[11px]">
                <Clock className="h-3 w-3" />
                Overdue
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl pt-1">{task.title}</DialogTitle>
          <Link
            to={ROUTES.projectDetail(task.projectId)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline w-fit"
            onClick={onClose}
          >
            in {task.projectName}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </DialogHeader>

        {/* Assignment banner — answers "kisne mujhe yeh diya?" */}
        {isAssignee && assignedByOther && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-medium text-primary">
                Assigned to you by {task.createdBy.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserAvatar
                  name={task.createdBy.name}
                  seed={task.createdBy.email}
                  size="xs"
                />
                <span>{task.createdBy.email}</span>
                <span>·</span>
                <span title={format(new Date(task.createdAt), 'PPpp')}>
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        )}

        {task.description && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
              Description
            </p>
            <p className="text-sm whitespace-pre-wrap break-words">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <DetailField label="Assigned to">
            {task.assignee ? (
              <div className="flex items-center gap-2 min-w-0">
                <UserAvatar
                  name={task.assignee.name}
                  seed={task.assignee.email}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isAssignee ? `${task.assignee.name} (you)` : task.assignee.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{task.assignee.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <UserCircle2 className="h-4 w-4" />
                Unassigned
              </p>
            )}
          </DetailField>

          <DetailField label="Created by">
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar
                name={task.createdBy.name}
                seed={task.createdBy.email}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {isCreator ? `${task.createdBy.name} (you)` : task.createdBy.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{task.createdBy.email}</p>
              </div>
            </div>
          </DetailField>

          <DetailField label="Due date">
            {task.dueDate ? (
              <p
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm',
                  overdue && 'text-destructive font-medium',
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {format(new Date(task.dueDate), 'PPP')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No due date</p>
            )}
          </DetailField>

          <DetailField label="Created">
            <p className="text-sm" title={format(new Date(task.createdAt), 'PPpp')}>
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </p>
          </DetailField>

          {task.completedAt && (
            <DetailField label="Completed">
              <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
              </p>
            </DetailField>
          )}

          <DetailField label="Last updated">
            <p className="text-sm text-muted-foreground" title={format(new Date(task.updatedAt), 'PPpp')}>
              {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
            </p>
          </DetailField>
        </div>

        {canChangeStatus && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Move to
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  onClick={() => handleStatus(s)}
                  className="gap-1.5"
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[s])} />
                  {TASK_STATUS_LABEL[s]}
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          {canDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete task'}
            </Button>
          ) : (
            <div />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
