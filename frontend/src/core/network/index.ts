import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import env from '@/config/env';
import { tokenStorage } from '@/core/storage/LocalStorage';

interface RequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  useAuth?: boolean;
  skipErrorToast?: boolean;
}

// Decoupled refresh hook so AuthService can register its own refresh logic
// without creating an import cycle (Network is imported by AuthService too).
type RefreshFn = () => Promise<string>; // returns new access token
let refreshFn: RefreshFn | null = null;
let onAuthFailure: (() => void) | null = null;

export const registerRefreshHandler = (fn: RefreshFn) => {
  refreshFn = fn;
};
export const registerAuthFailureHandler = (fn: () => void) => {
  onAuthFailure = fn;
};

// Coalesce concurrent 401s to a single refresh call.
let inflightRefresh: Promise<string> | null = null;

class Network {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.apiUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    this.client.interceptors.request.use((req) => {
      const cfg = req as RequestConfig;
      if (cfg.useAuth !== false) {
        const token = tokenStorage.getAccess();
        if (token) req.headers.Authorization = `Bearer ${token}`;
      }
      return req;
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config as RequestConfig | undefined;
        const status = error.response?.status;

        // Auto-refresh on 401 (only once per request, not on auth endpoints)
        const isAuthEndpoint = original?.url?.includes('/auth/');
        if (status === 401 && original && !original._retry && !isAuthEndpoint && refreshFn) {
          original._retry = true;
          try {
            inflightRefresh = inflightRefresh ?? refreshFn();
            const newToken = await inflightRefresh;
            inflightRefresh = null;

            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newToken}`;
            return this.client.request(original);
          } catch (refreshErr) {
            inflightRefresh = null;
            onAuthFailure?.();
            return Promise.reject(refreshErr);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  private resolvePathParams(endpoint: string, pathParams: Record<string, string>): string {
    return Object.keys(pathParams).reduce(
      (acc, key) => acc.replace(`:${key}`, encodeURIComponent(pathParams[key])),
      endpoint,
    );
  }

  async get<T>(
    endpoint: string,
    opts: {
      pathParams?: Record<string, string>;
      queryParams?: Record<string, unknown>;
      useAuth?: boolean;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const url = this.resolvePathParams(endpoint, opts.pathParams ?? {});
    const res = await this.client.get<T>(url, {
      params: opts.queryParams,
      signal: opts.signal,
      useAuth: opts.useAuth,
    } as AxiosRequestConfig);
    return res.data;
  }

  async post<T>(
    endpoint: string,
    opts: {
      body?: unknown;
      pathParams?: Record<string, string>;
      queryParams?: Record<string, unknown>;
      useAuth?: boolean;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const url = this.resolvePathParams(endpoint, opts.pathParams ?? {});
    const res = await this.client.post<T>(url, opts.body, {
      params: opts.queryParams,
      signal: opts.signal,
      useAuth: opts.useAuth,
    } as AxiosRequestConfig);
    return res.data;
  }

  async patch<T>(
    endpoint: string,
    opts: {
      body?: unknown;
      pathParams?: Record<string, string>;
      useAuth?: boolean;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const url = this.resolvePathParams(endpoint, opts.pathParams ?? {});
    const res = await this.client.patch<T>(url, opts.body, {
      signal: opts.signal,
      useAuth: opts.useAuth,
    } as AxiosRequestConfig);
    return res.data;
  }

  async put<T>(
    endpoint: string,
    opts: {
      body?: unknown;
      pathParams?: Record<string, string>;
      useAuth?: boolean;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const url = this.resolvePathParams(endpoint, opts.pathParams ?? {});
    const res = await this.client.put<T>(url, opts.body, {
      signal: opts.signal,
      useAuth: opts.useAuth,
    } as AxiosRequestConfig);
    return res.data;
  }

  async delete<T>(
    endpoint: string,
    opts: {
      pathParams?: Record<string, string>;
      queryParams?: Record<string, unknown>;
      useAuth?: boolean;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const url = this.resolvePathParams(endpoint, opts.pathParams ?? {});
    const res = await this.client.delete<T>(url, {
      params: opts.queryParams,
      signal: opts.signal,
      useAuth: opts.useAuth,
    } as AxiosRequestConfig);
    return res.data;
  }
}

export default Network;
