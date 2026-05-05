import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, UserCircle2 } from 'lucide-react';
import TaskService from '../../domain/services/TaskService';
import UserService from '@/lib/features/user/domain/services/UserService';
import type { User } from '@/lib/features/user/data/models/User';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABEL } from '../../data/models/Task';
import { createTaskFormSchema, type CreateTaskFormValues } from '../schemas/taskForms';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Button } from '@/lib/widgets/button';
import { Input } from '@/lib/widgets/input';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/lib/widgets/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/lib/widgets/form';
import { toast } from '@/lib/widgets/sonner';

interface Candidate {
  id: string;
  name: string;
  email: string;
}

interface Props {
  projectId: string;
  /** Project members + owner. Used as the base list for non-admins, and merged with the full
   *  user list for admins. Always include the current user so they can self-assign. */
  candidates?: Candidate[];
  onCreated: () => void;
}

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const PRIORITY_LABEL: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export function CreateTaskDialog({ projectId, candidates, onCreated }: Props) {
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.roles.includes('Admin') ?? false;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<Candidate[]>([]);

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      // No self-assignment — start unassigned. The creator picks someone else.
      assigneeId: '',
      dueDate: '',
    },
  });

  // Seed the picker with the project's known candidates (owner + members),
  // minus the current user — they cannot assign to themselves.
  useEffect(() => {
    if (candidates && candidates.length > 0) {
      setUsers(candidates.filter((c) => c.id !== me?.id));
    }
  }, [candidates, me?.id]);

  // Admins can pull the full active list so they can assign to anyone in the
  // workspace — still excluding self.
  useEffect(() => {
    if (!open || !isAdmin) return;
    UserService.list()
      .then((all: User[]) => {
        const active = all
          .filter((u) => u.isActive && u.id !== me?.id)
          .map((u) => ({ id: u.id, name: u.name, email: u.email }));
        setUsers((prev) => {
          const filteredPrev = prev.filter((c) => c.id !== me?.id);
          const map = new Map<string, Candidate>();
          for (const c of [...filteredPrev, ...active]) map.set(c.id, c);
          return Array.from(map.values());
        });
      })
      .catch(() => {
        // Silent — fallback list (project members) still works
      });
  }, [open, isAdmin, me?.id]);

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeId: '',
        dueDate: '',
      });
    }
  };

  // Sort alphabetically by name — current user is already excluded from `users`.
  const sortedUsers = useMemo(
    () => users.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  const selectedAssigneeId = form.watch('assigneeId');
  const selectedAssignee = sortedUsers.find((u) => u.id === selectedAssigneeId) ?? null;

  const onSubmit = async (values: CreateTaskFormValues) => {
    setSubmitting(true);
    try {
      await TaskService.create({
        projectId,
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId || null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      });
      toast.success('Task created', {
        description: selectedAssignee ? `Assigned to ${selectedAssignee.name}` : 'Unassigned',
      });
      onCreated();
      setOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription>
            Tasks are tracked under a project and can be assigned to anyone on the team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="create-task-form" className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Set up CI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="What needs to happen?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select className={selectClass} {...field}>
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <select className={selectClass} {...field}>
                        {TASK_PRIORITIES.map((p) => (
                          <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to</FormLabel>
                    <FormControl>
                      <select className={selectClass} {...field}>
                        <option value="">— Unassigned —</option>
                        {sortedUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} · {u.email}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    {selectedAssignee ? (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                        <UserAvatar
                          name={selectedAssignee.name}
                          seed={selectedAssignee.email}
                          size="xs"
                        />
                        <span className="font-medium">Assigning to {selectedAssignee.name}</span>
                      </div>
                    ) : (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserCircle2 className="h-3.5 w-3.5" />
                        Pick someone else — you can&apos;t assign tasks to yourself
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-task-form" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
