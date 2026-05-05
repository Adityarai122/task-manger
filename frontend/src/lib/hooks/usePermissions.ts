import { useMemo } from 'react';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';

export const usePermissions = () => {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => {
    const set = new Set(user?.permissions ?? []);
    return {
      user,
      has: (key: string) => set.has(key),
      hasAny: (keys: string[]) => keys.some((k) => set.has(k)),
      hasAll: (keys: string[]) => keys.every((k) => set.has(k)),
    };
  }, [user]);
};
