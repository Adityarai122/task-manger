import { jwtDecode } from 'jwt-decode';
import { tokenStorage } from '@/core/storage/LocalStorage';
import {
  registerRefreshHandler,
  registerAuthFailureHandler,
} from '@/core/network';
import NetworkAuthRepository from '../../data/repositories/NetworkAuthRepository';
import type { AuthResult, AuthUser, JwtPayload, LoginDto } from '../../data/models/Auth';

type AuthListener = (user: AuthUser | null) => void;

class AuthService {
  static readonly instance = new AuthService();
  private network = new NetworkAuthRepository();
  private listeners = new Set<AuthListener>();
  private currentUser: AuthUser | null = null;

  private constructor() {
    registerRefreshHandler(async () => {
      const refresh = tokenStorage.getRefresh();
      if (!refresh) throw new Error('No refresh token');
      const result = await this.network.refresh(refresh);
      this.persist(result);
      return result.accessToken;
    });

    registerAuthFailureHandler(() => {
      this.clear();
    });
  }

  subscribe(fn: AuthListener): () => void {
    this.listeners.add(fn);
    fn(this.currentUser);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const l of this.listeners) l(this.currentUser);
  }

  getUser(): AuthUser | null {
    return this.currentUser;
  }

  decodeStoredAccessToken(): JwtPayload | null {
    const token = tokenStorage.getAccess();
    if (!token) return null;
    try {
      const payload = jwtDecode<JwtPayload>(token);
      if (payload.exp * 1000 < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  async login(dto: LoginDto): Promise<AuthUser> {
    const result = await this.network.login(dto);
    this.persist(result);
    return result.user;
  }

  async hydrate(): Promise<AuthUser | null> {
    if (!tokenStorage.getAccess() && !tokenStorage.getRefresh()) return null;

    try {
      const user = await this.network.me();
      this.currentUser = user;
      this.emit();
      return user;
    } catch {
      this.clear();
      return null;
    }
  }

  async logout(): Promise<void> {
    const refresh = tokenStorage.getRefresh();
    if (refresh) {
      try {
        await this.network.logout(refresh);
      } catch {
        // best-effort
      }
    }
    this.clear();
  }

  // Update local state after a profile self-update (so name/email refresh in UI).
  refreshLocalUser(user: AuthUser): void {
    this.currentUser = user;
    this.emit();
  }

  private persist(result: AuthResult): void {
    tokenStorage.save(result.accessToken, result.refreshToken);
    this.currentUser = result.user;
    this.emit();
  }

  private clear(): void {
    tokenStorage.clear();
    this.currentUser = null;
    this.emit();
  }
}

export default AuthService.instance;
