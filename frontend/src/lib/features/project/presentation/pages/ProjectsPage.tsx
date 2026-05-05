import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, FolderKanban, ListChecks } from 'lucide-react';
import ProjectService from '../../domain/services/ProjectService';
import type { Project } from '../../data/models/Project';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ROUTES } from '@/lib/routing/routes';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Card, CardContent } from '@/lib/widgets/card';
import { Badge } from '@/lib/widgets/badge';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import { toast } from '@/lib/widgets/sonner';
import { CreateProjectDialog } from '../components/CreateProjectDialog';

export function ProjectsPage() {
  const { has } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await ProjectService.list());
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {has('project.create')
              ? 'Create projects, add members, and track work.'
              : 'Projects you own or are a member of.'}
          </p>
        </div>
        {has('project.create') && <CreateProjectDialog onCreated={load} />}
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">Loading projects…</CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {has('project.create')
                ? 'Click "New project" to get started.'
                : 'Ask an admin to add you to a project.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const totalPeople = p.members.length + 1;
            const visibleAvatars = [
              p.owner,
              ...p.members.slice(0, 2).map((m) => ({ id: m.id, name: m.name, email: m.email })),
            ];
            const remaining = totalPeople - visibleAvatars.length;
            return (
              <Link key={p.id} to={ROUTES.projectDetail(p.id)} className="block group">
                <Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-md">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate">{p.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Owner: {p.owner.name}
                        </p>
                      </div>
                      {p.status === 'ARCHIVED' && (
                        <Badge variant="secondary" className="gap-1 shrink-0">
                          <Archive className="h-3 w-3" />
                          Archived
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-10">
                      {p.description ?? 'No description.'}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" />
                        {p.taskCount} task{p.taskCount === 1 ? '' : 's'}
                      </div>
                      <div className="flex -space-x-1.5">
                        {visibleAvatars.map((u) => (
                          <UserAvatar
                            key={u.id}
                            name={u.name}
                            seed={u.email}
                            size="xs"
                            className="ring-2 ring-card"
                          />
                        ))}
                        {remaining > 0 && (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-card">
                            +{remaining}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
