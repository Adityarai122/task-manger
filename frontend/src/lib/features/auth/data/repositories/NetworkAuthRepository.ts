import Network from '@/core/network';
import type { AuthResult, AuthUser, LoginDto } from '../models/Auth';

interface ApiEnvelope<T> { data: T }

export default class NetworkAuthRepository {
  private network = new Network();

  async login(dto: LoginDto): Promise<AuthResult> {
    const res = await this.network.post<ApiEnvelope<AuthResult>>('/auth/login', {
      body: dto,
      useAuth: false,
    });
    return res.data;
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const res = await this.network.post<ApiEnvelope<AuthResult>>('/auth/refresh', {
      body: { refreshToken },
      useAuth: false,
    });
    return res.data;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.network.post('/auth/logout', {
      body: { refreshToken },
      useAuth: false,
    });
  }

  async me(): Promise<AuthUser> {
    const res = await this.network.get<ApiEnvelope<AuthUser>>('/auth/me');
    return res.data;
  }
}
