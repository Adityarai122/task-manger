import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Crown,
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

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              {project.status === 'ARCHIVED' && (
                <Badge variant="secondary" className="gap-1">
                  <Archive className="h-3 w-3" />
                  Archived
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <UserAvatar name={project.owner.name} seed={project.owner.email} size="xs" />
              <span className="text-xs text-muted-foreground">
                Owned by <span className="font-medium text-foreground">{project.owner.name}</span>
              </span>
            </div>
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

        {taskStats.total > 0 && (
          <div className="mt-5 pt-5 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {taskStats.done} / {taskStats.total} done · {Math.round(progressPct)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Tasks</h2>
            {canCreateTask && (
              <CreateTaskDialog projectId={project.id} candidates={candidates} onCreated={load} />
            )}
          </div>
          <TaskBoard tasks={tasks} onChanged={load} onOpen={setOpenTask} />
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold inline-flex items-center gap-2">
                <Users2 className="h-4 w-4" />
                Team
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {project.members.length + 1}
              </span>
            </div>

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
