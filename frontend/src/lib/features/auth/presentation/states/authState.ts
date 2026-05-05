import { create } from 'zustand';
import AuthService from '../../domain/services/AuthService';
import type { AuthUser } from '../../data/models/Auth';

interface AuthState {
  user: AuthUser | null;
  // 'idle' before hydrate runs; 'authed'/'guest' after; 'loading' during transitions.
  status: 'idle' | 'loading' | 'authed' | 'guest';
  setUser: (u: AuthUser | null) => void;
  setStatus: (s: AuthState['status']) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: user ? 'authed' : 'guest' }),
  setStatus: (status) => set({ status }),
}));

// Bridge AuthService → Zustand (keeps AuthService UI-framework-agnostic).
AuthService.subscribe((user) => {
  useAuthStore.getState().setUser(user);
});
