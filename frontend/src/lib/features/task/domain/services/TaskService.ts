import NetworkTaskRepository from '../../data/repositories/NetworkTaskRepository';
import type {
  CreateTaskDto,
  ListTasksQuery,
  Task,
  UpdateOwnTaskDto,
  UpdateTaskDto,
} from '../../data/models/Task';

class TaskService {
  static readonly instance = new TaskService();
  private repo = new NetworkTaskRepository();
  private constructor() {}

  list = (query?: ListTasksQuery): Promise<Task[]> => this.repo.list(query);
  getById = (id: string): Promise<Task> => this.repo.getById(id);
  create = (dto: CreateTaskDto): Promise<Task> => this.repo.create(dto);
  update = (id: string, dto: UpdateTaskDto): Promise<Task> => this.repo.update(id, dto);
  updateOwn = (id: string, dto: UpdateOwnTaskDto): Promise<Task> => this.repo.updateOwn(id, dto);
  remove = (id: string): Promise<void> => this.repo.remove(id);
}

export default TaskService.instance;
