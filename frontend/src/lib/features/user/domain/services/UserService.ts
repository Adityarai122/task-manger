import NetworkUserRepository from '../../data/repositories/NetworkUserRepository';
import type {
  InviteUserDto,
  RoleName,
  UpdateSelfDto,
  UpdateUserDto,
  User,
} from '../../data/models/User';

class UserService {
  static readonly instance = new UserService();
  private repo = new NetworkUserRepository();

  private constructor() {}

  list = (): Promise<User[]> => this.repo.list();
  getById = (id: string): Promise<User> => this.repo.getById(id);
  getMe = (): Promise<User> => this.repo.getMe();
  invite = (dto: InviteUserDto): Promise<User> => this.repo.invite(dto);
  update = (id: string, dto: UpdateUserDto): Promise<User> => this.repo.update(id, dto);
  changeRole = (id: string, role: RoleName): Promise<User> => this.repo.changeRole(id, role);
  deactivate = (id: string): Promise<void> => this.repo.deactivate(id);
  updateMe = (dto: UpdateSelfDto): Promise<User> => this.repo.updateMe(dto);
}

export default UserService.instance;
