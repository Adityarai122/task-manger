import type { Task } from '@/lib/features/task/data/models/Task';

export interface DashboardSnapshot {
  scope: 'company' | 'self';
  projects: { active: number; archived: number; total: number };
  tasks: {
    total: number;
    byStatus: { TODO: number; IN_PROGRESS: number; IN_REVIEW: number; DONE: number };
    overdue: number;
    assignedToMe: number;
  };
  users: { total: number; active: number } | null;
  recentTasks: Task[];
}
