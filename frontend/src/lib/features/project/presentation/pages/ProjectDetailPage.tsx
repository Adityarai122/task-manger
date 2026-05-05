import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Crown,
  FolderKanban,
  Trash2,
  UserMinus,
  Users2,
} from 'lucide-react';
import ProjectService from '../../domain/services/ProjectService';
import TaskService from '@/lib/features/task/domain/services/TaskService';
import UserService from '@/lib/features/user/domain/services/UserService';
import type { Project } from '../../data/models/Project';
import type { Task } from '@/lib/features/task/data/models/Task';
import type { User } from '@/lib/features/user/data/models/User';
import { TaskBoard } from '@/lib/features/task/presentation/components/TaskBoard';
import { CreateTaskDialog } from '@/lib/features/task/presentation/components/CreateTaskDialog';
import { TaskDetailDialog } from '@/lib/features/task/presentation/components/TaskDetailDialog';
import { useConfirm } from '@/lib/widgets/confirm';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ROUTES } from '@/lib/routing/routes';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Button } from '@/lib/widgets/button';
import { Badge } from '@/lib/widgets/badge';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import { Card, CardContent } from '@/lib/widgets/card';
import { toast } from '@/lib/widgets/sonner';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const { has } = usePermissions();

  const confirm = useConfirm();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const canManage = has('project.member.manage');
  const canArchive = has('project.update');
  const canDelete = has('project.delete');
  // Admins always; members of this project may also create tasks via task.create.member
  const isProjectMember =
    !!me &&
    !!project &&
    (project.owner.id === me.id || project.members.some((m) => m.id === me.id));
  const canCreateTask =
    has('task.create') || (has('task.create.member') && isProjectMember);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        ProjectService.getById(id),
        TaskService.list({ projectId: id }),
      ]);
      setProject(p);
      setTasks(t);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canManage) return;
    UserService.list()
      .then(setAllUsers)
      .catch(() => undefined);
  }, [canManage]);

  const candidates = useMemo(() => {
    if (!project) return [];
    return [project.owner, ...project.members.map((m) => ({ id: m.id, name: m.name, email: m.email }))];
  }, [project]);

  const addableUsers = useMemo(() => {
    if (!project) return [];
    const taken = new Set([project.owner.id, ...project.members.map((m) => m.id)]);
    return allUsers.filter((u) => u.isActive && !taken.has(u.id));
  }, [allUsers, project]);

  const handleAddMember = async (userId: string) => {
    if (!project) return;
    setAdding(true);
    try {
      const updated = await ProjectService.addMember(project.id, userId);
      setProject(updated);
      toast.success('Member added');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;
    try {
      const updated = await ProjectService.removeMember(project.id, userId);
      setProject(updated);
      toast.success('Member removed');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleArchiveToggle = async () => {
    if (!project) return;
    const next = project.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      const updated = await ProjectService.update(project.id, { status: next });
      setProject(updated);
      toast.success(next === 'ARCHIVED' ? 'Project archived' : 'Project reactivated');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    const ok = await confirm({
      title: `Delete "${project.name}"?`,
      description: 'This will permanently remove the project and all of its tasks. This cannot be undone.',
      confirmText: 'Delete project',
      destructive: true,
    });
    if (!ok) return;
    try {
      await ProjectService.remove(project.id);
      toast.success('Project deleted');
      navigate(ROUTES.projects);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading project…</div>;
  }
  if (!project) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.projects)}>
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Button>
      </div>
    );
  }

  const taskStats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  };
  const progressPct = taskStats.total === 0 ? 0 : (taskStats.done / taskStats.total) * 100;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={ROUTES.projects}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Decorative gradient strip */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-indigo-50 via-violet-50 to-transparent pointer-events-none" />

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30 shrink-0">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight truncate">{project.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {project.status === 'ARCHIVED' ? (
                      <Badge variant="secondary" className="gap-1">
                        <Archive className="h-3 w-3" />
                        Archived
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserAvatar name={project.owner.name} seed={project.owner.email} size="xs" />
                      Owned by <span className="font-medium text-foreground">{project.owner.name}</span>
                    </span>
                  </div>
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground max-w-2xl pl-13" style={{ paddingLeft: '3.25rem' }}>
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {canArchive && (
                <Button variant="outline" onClick={handleArchiveToggle}>
                  <Archive className="h-4 w-4" />
                  {project.status === 'ACTIVE' ? 'Archive' : 'Reactivate'}
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="mt-5 pt-5 border-t grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatPill label="Tasks" value={taskStats.total} accent="indigo" />
            <StatPill label="Completed" value={taskStats.done} accent="emerald" />
            <StatPill label="Members" value={project.members.length + 1} accent="violet" />
            <StatPill
              label="Progress"
              value={`${Math.round(progressPct)}%`}
              accent={progressPct === 100 ? 'emerald' : 'amber'}
            />
          </div>

          {taskStats.total > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Tasks</h2>
              <p className="text-xs text-muted-foreground">
                {tasks.length === 0
                  ? 'No tasks yet — create your first one.'
                  : `${tasks.length} task${tasks.length === 1 ? '' : 's'} in this project`}
              </p>
            </div>
            {canCreateTask && (
              <CreateTaskDialog projectId={project.id} candidates={candidates} onCreated={load} />
            )}
          </div>
          <TaskBoard tasks={tasks} onChanged={load} onOpen={setOpenTask} />
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 px-5 py-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold inline-flex items-center gap-2">
                <Users2 className="h-4 w-4 text-violet-600" />
                Team
              </h3>
              <span className="inline-flex items-center justify-center min-w-6 h-5 px-2 rounded-full bg-white text-xs font-semibold text-violet-700 tabular-nums shadow-sm">
                {project.members.length + 1}
              </span>
            </div>
          </div>
          <CardContent className="p-5 space-y-4">

            <div className="space-y-2">
              <MemberRow
                name={project.owner.name}
                email={project.owner.email}
                isMe={project.owner.id === me?.id}
                ownerTag
              />
              {project.members.map((m) => (
                <MemberRow
                  key={m.id}
                  name={m.name}
                  email={m.email}
                  isMe={m.id === me?.id}
                  onRemove={canManage ? () => handleRemoveMember(m.id) : undefined}
                />
              ))}
            </div>

            {canManage && addableUsers.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  Add member
                </p>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) void handleAddMember(e.target.value);
                  }}
                  disabled={adding}
                >
                  <option value="">Pick a user…</option>
                  {addableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === me?.id ? `${u.name} (me)` : u.name} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canManage && allUsers.length > 0 && addableUsers.length === 0 && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Everyone is already a member of this project.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDetailDialog
        task={openTask}
        onClose={() => setOpenTask(null)}
        onChanged={load}
      />
    </div>
  );
}

const STAT_TONE = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
} as const;

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: keyof typeof STAT_TONE;
}) {
  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ring-inset ${STAT_TONE[accent]}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">{label}</p>
      <p className="text-lg font-bold tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

interface MemberRowProps {
  name: string;
  email: string;
  isMe: boolean;
  ownerTag?: boolean;
  onRemove?: () => void;
}

function MemberRow({ name, email, isMe, ownerTag, onRemove }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 group">
      <div className="flex items-center gap-2.5 min-w-0">
        <UserAvatar name={name} seed={email} size="sm" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">
              {isMe ? `${name} (you)` : name}
            </p>
            {ownerTag && (
              <Crown className="h-3 w-3 text-amber-500" aria-label="Owner" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
