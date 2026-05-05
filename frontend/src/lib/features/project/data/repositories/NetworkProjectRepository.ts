import Network from '@/core/network';
import type { CreateProjectDto, Project, UpdateProjectDto } from '../models/Project';

interface ApiEnvelope<T> { data: T }

export default class NetworkProjectRepository {
  private network = new Network();

  async list(): Promise<Project[]> {
    const res = await this.network.get<ApiEnvelope<Project[]>>('/projects');
    return res.data;
  }

  async getById(id: string): Promise<Project> {
    const res = await this.network.get<ApiEnvelope<Project>>('/projects/:id', { pathParams: { id } });
    return res.data;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const res = await this.network.post<ApiEnvelope<Project>>('/projects', { body: dto });
    return res.data;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const res = await this.network.patch<ApiEnvelope<Project>>('/projects/:id', {
      pathParams: { id },
      body: dto,
    });
    return res.data;
  }

  async remove(id: string): Promise<void> {
    await this.network.delete('/projects/:id', { pathParams: { id } });
  }

  async addMember(id: string, userId: string): Promise<Project> {
    const res = await this.network.post<ApiEnvelope<Project>>('/projects/:id/members', {
      pathParams: { id },
      body: { userId },
    });
    return res.data;
  }

  async removeMember(id: string, userId: string): Promise<Project> {
    const res = await this.network.delete<ApiEnvelope<Project>>('/projects/:id/members/:userId', {
      pathParams: { id, userId },
    });
    return res.data;
  }
}
