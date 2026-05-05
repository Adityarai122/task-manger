import Network from '@/core/network';
import type {
  InviteUserDto,
  RoleName,
  UpdateSelfDto,
  UpdateUserDto,
  User,
} from '../models/User';

interface ApiEnvelope<T> { data: T }

export default class NetworkUserRepository {
  private network = new Network();

  async list(): Promise<User[]> {
    const res = await this.network.get<ApiEnvelope<User[]>>('/users');
    return res.data;
  }

  async getById(id: string): Promise<User> {
    const res = await this.network.get<ApiEnvelope<User>>('/users/:id', { pathParams: { id } });
    return res.data;
  }

  async getMe(): Promise<User> {
    const res = await this.network.get<ApiEnvelope<User>>('/users/me');
    return res.data;
  }

  async invite(dto: InviteUserDto): Promise<User> {
    const res = await this.network.post<ApiEnvelope<User>>('/users', { body: dto });
    return res.data;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const res = await this.network.patch<ApiEnvelope<User>>('/users/:id', {
      pathParams: { id },
      body: dto,
    });
    return res.data;
  }

  async changeRole(id: string, role: RoleName): Promise<User> {
    const res = await this.network.patch<ApiEnvelope<User>>('/users/:id/role', {
      pathParams: { id },
      body: { role },
    });
    return res.data;
  }

  async deactivate(id: string): Promise<void> {
    await this.network.delete('/users/:id', { pathParams: { id } });
  }

  async updateMe(dto: UpdateSelfDto): Promise<User> {
    const res = await this.network.patch<ApiEnvelope<User>>('/users/me', { body: dto });
    return res.data;
  }
}
