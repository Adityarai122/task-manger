import type { Task, TaskStatus } from '../../data/models/Task';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '../../data/models/Task';
import { TaskCard } from './TaskCard';
import { cn } from '@/core/utils/cn';

interface Props {
  tasks: Task[];
  onChanged: () => void;
  onOpen?: (task: Task) => void;
}

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-amber-400',
  IN_REVIEW: 'bg-violet-400',
  DONE: 'bg-emerald-500',
};

export function TaskBoard({ tasks, onChanged, onOpen }: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const list = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="rounded-xl border bg-muted/40 p-3 space-y-2.5 min-h-44">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wide">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', COLUMN_ACCENT[status])} />
                <span className="text-foreground">{TASK_STATUS_LABEL[status]}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-card text-foreground/70 text-[11px] tabular-nums">
                {list.length}
              </span>
            </div>
            <div className="space-y-2">
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center italic">No tasks</p>
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
