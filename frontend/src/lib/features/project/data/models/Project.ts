// Mirrors backend ProjectView (project.service.ts).
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface ProjectMemberView {
  id: string;
  name: string;
  email: string;
  addedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string };
  members: ProjectMemberView[];
  taskCount: number;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}
