import NetworkProjectRepository from '../../data/repositories/NetworkProjectRepository';
import type { CreateProjectDto, Project, UpdateProjectDto } from '../../data/models/Project';

class ProjectService {
  static readonly instance = new ProjectService();
  private repo = new NetworkProjectRepository();
  private constructor() {}

  list = (): Promise<Project[]> => this.repo.list();
  getById = (id: string): Promise<Project> => this.repo.getById(id);
  create = (dto: CreateProjectDto): Promise<Project> => this.repo.create(dto);
  update = (id: string, dto: UpdateProjectDto): Promise<Project> => this.repo.update(id, dto);
  remove = (id: string): Promise<void> => this.repo.remove(id);
  addMember = (id: string, userId: string): Promise<Project> => this.repo.addMember(id, userId);
  removeMember = (id: string, userId: string): Promise<Project> => this.repo.removeMember(id, userId);
}

export default ProjectService.instance;
