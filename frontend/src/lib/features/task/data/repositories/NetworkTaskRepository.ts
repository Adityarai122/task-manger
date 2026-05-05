import Network from '@/core/network';
import type {
  CreateTaskDto,
  ListTasksQuery,
  Task,
  UpdateOwnTaskDto,
  UpdateTaskDto,
} from '../models/Task';

interface ApiEnvelope<T> { data: T }

export default class NetworkTaskRepository {
  private network = new Network();

  async list(query: ListTasksQuery = {}): Promise<Task[]> {
    const queryParams: Record<string, unknown> = {};
    if (query.projectId) queryParams.projectId = query.projectId;
    if (query.status) queryParams.status = query.status;
    if (query.assigneeId) queryParams.assigneeId = query.assigneeId;
    if (query.mine) queryParams.mine = 'true';

    const res = await this.network.get<ApiEnvelope<Task[]>>('/tasks', { queryParams });
    return res.data;
  }

  async getById(id: string): Promise<Task> {
    const res = await this.network.get<ApiEnvelope<Task>>('/tasks/:id', { pathParams: { id } });
    return res.data;
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const res = await this.network.post<ApiEnvelope<Task>>('/tasks', { body: dto });
    return res.data;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const res = await this.network.patch<ApiEnvelope<Task>>('/tasks/:id', {
      pathParams: { id },
      body: dto,
    });
    return res.data;
  }

  async updateOwn(id: string, dto: UpdateOwnTaskDto): Promise<Task> {
    const res = await this.network.patch<ApiEnvelope<Task>>('/tasks/:id/own', {
      pathParams: { id },
      body: dto,
    });
    return res.data;
  }

  async remove(id: string): Promise<void> {
    await this.network.delete('/tasks/:id', { pathParams: { id } });
  }
}
