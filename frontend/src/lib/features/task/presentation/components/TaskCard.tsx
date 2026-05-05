import { format, isPast } from 'date-fns';
import { CalendarDays, Flame, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react';
import type { Task, TaskStatus } from '../../data/models/Task';
import TaskService from '../../domain/services/TaskService';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Button } from '@/lib/widgets/button';
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
import { useConfirm } from '@/lib/widgets/confirm';
import { cn } from '@/core/utils/cn';

const PRIORITY_STYLE: Record<Task['priority'], string> = {
  LOW: 'bg-slate-100 text-slate-700 ring-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-200',
  HIGH: 'bg-amber-50 text-amber-700 ring-amber-200',
  URGENT: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

interface Props {
  task: Task;
  onChanged: () => void;
  onOpen?: (task: Task) => void;
}

export function TaskCard({ task, onChanged, onOpen }: Props) {
  const me = useAuthStore((s) => s.user);
  const { has } = usePermissions();
  const confirm = useConfirm();
  const isAdmin = has('task.update');
  const isAssignee = task.assignee?.id === me?.id;
  const isCreator = task.createdBy.id === me?.id;
  const canChangeStatus = isAdmin || isAssignee;
  const canDelete = has('task.delete');

  const overdue = task.dueDate && task.status !== 'DONE' && isPast(new Date(task.dueDate));
  const creatorIsAdmin = task.createdBy.id !== task.assignee?.id; // someone else assigned it

  const handleStatus = async (status: TaskStatus) => {
    try {
      if (isAdmin) await TaskService.update(task.id, { status });
      else await TaskService.updateOwn(task.id, { status });
      toast.success(`Moved to ${STATUS_LABEL[status]}`);
      onChanged();
    } catch (err) {
      toast.error(extractErrorMessage(err));
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
    try {
      await TaskService.remove(task.id);
      toast.success('Task deleted');
      onChanged();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div
      className={cn(
        'group rounded-lg border bg-card p-3 shadow-sm space-y-2.5 transition-shadow hover:shadow-md',
        isAssignee && 'ring-1 ring-primary/40',
        onOpen && 'cursor-pointer',
      )}
      onClick={() => onOpen?.(task)}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen(task);
        }
      }}
    >
      {/* "Assigned to you" banner shown only when current user is the assignee */}
      {isAssignee && !isCreator && (
        <div className="-mx-3 -mt-3 px-3 py-1.5 rounded-t-lg bg-primary/10 border-b border-primary/20 flex items-center gap-1.5 text-[11px] font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          Assigned to you by {task.createdBy.name}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-snug flex-1">{task.title}</div>
        {(canChangeStatus || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canChangeStatus && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
                    Move to
                  </DropdownMenuLabel>
                  {STATUS_OPTIONS.filter((s) => s !== task.status).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => handleStatus(s)}>
                      {STATUS_LABEL[s]}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
            PRIORITY_STYLE[task.priority],
          )}
        >
          <Flame className="h-3 w-3" />
          {task.priority.toLowerCase()}
        </span>
        {task.dueDate && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
              overdue
                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                : 'bg-slate-50 text-slate-600 ring-slate-200',
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed">
        {task.assignee ? (
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <UserAvatar name={task.assignee.name} seed={task.assignee.email} size="xs" />
            <span className={cn('text-xs font-medium truncate', isAssignee && 'text-primary')}>
              {isAssignee ? 'You' : task.assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Unassigned</span>
        )}
        {creatorIsAdmin && !isCreator && (
          <span
            className="text-[10px] text-muted-foreground truncate inline-flex items-center gap-1"
            title={`Created by ${task.createdBy.name}`}
          >
            by {task.createdBy.name}
          </span>
        )}
      </div>
    </div>
  );
}
