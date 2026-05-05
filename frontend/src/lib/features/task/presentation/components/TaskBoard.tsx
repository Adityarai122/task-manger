import { Circle, CircleDashed, CircleDotDashed, CircleCheckBig } from 'lucide-react';
import type { Task, TaskStatus } from '../../data/models/Task';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '../../data/models/Task';
import { TaskCard } from './TaskCard';
import { cn } from '@/core/utils/cn';

interface Props {
  tasks: Task[];
  onChanged: () => void;
  onOpen?: (task: Task) => void;
}

interface ColumnStyle {
  icon: React.ElementType;
  iconColor: string;
  headerBg: string;
  countBg: string;
  border: string;
  emptyText: string;
}

const COLUMN: Record<TaskStatus, ColumnStyle> = {
  TODO: {
    icon: CircleDashed,
    iconColor: 'text-slate-500',
    headerBg: 'bg-gradient-to-r from-slate-100 to-slate-50',
    countBg: 'bg-slate-200 text-slate-700',
    border: 'border-slate-200',
    emptyText: 'Nothing to start yet',
  },
  IN_PROGRESS: {
    icon: CircleDotDashed,
    iconColor: 'text-amber-500',
    headerBg: 'bg-gradient-to-r from-amber-100 to-amber-50',
    countBg: 'bg-amber-200 text-amber-800',
    border: 'border-amber-200',
    emptyText: 'No active work',
  },
  IN_REVIEW: {
    icon: Circle,
    iconColor: 'text-violet-500',
    headerBg: 'bg-gradient-to-r from-violet-100 to-violet-50',
    countBg: 'bg-violet-200 text-violet-800',
    border: 'border-violet-200',
    emptyText: 'Nothing in review',
  },
  DONE: {
    icon: CircleCheckBig,
    iconColor: 'text-emerald-500',
    headerBg: 'bg-gradient-to-r from-emerald-100 to-emerald-50',
    countBg: 'bg-emerald-200 text-emerald-800',
    border: 'border-emerald-200',
    emptyText: 'Nothing completed yet',
  },
};

export function TaskBoard({ tasks, onChanged, onOpen }: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const list = tasks.filter((t) => t.status === status);
        const style = COLUMN[status];
        const Icon = style.icon;
        return (
          <div
            key={status}
            className={cn(
              'rounded-xl border bg-card overflow-hidden flex flex-col min-h-56',
              style.border,
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between px-3 py-2.5 border-b',
                style.headerBg,
                style.border,
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', style.iconColor)} strokeWidth={2.5} />
                <span className="text-sm font-semibold text-foreground">
                  {TASK_STATUS_LABEL[status]}
                </span>
              </div>
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums',
                  style.countBg,
                )}
              >
                {list.length}
              </span>
            </div>

            <div className="p-2.5 space-y-2 flex-1">
              {list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-xs text-muted-foreground italic">{style.emptyText}</p>
                </div>
              ) : (
                list.map((task) => (
                  <TaskCard key={task.id} task={task} onChanged={onChanged} onOpen={onOpen} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
