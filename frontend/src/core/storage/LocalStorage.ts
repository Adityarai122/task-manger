// Typed localStorage wrapper. Centralizes keys; never spread `localStorage.getItem` calls.
const KEYS = {
  ACCESS_TOKEN: 'tm_access_token',
  REFRESH_TOKEN: 'tm_refresh_token',
} as const;

export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(KEYS.ACCESS_TOKEN),
  getRefresh: (): string | null => localStorage.getItem(KEYS.REFRESH_TOKEN),

  save: (access: string, refresh: string): void => {
    localStorage.setItem(KEYS.ACCESS_TOKEN, access);
    localStorage.setItem(KEYS.REFRESH_TOKEN, refresh);
  },

  clear: (): void => {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
  },
};
