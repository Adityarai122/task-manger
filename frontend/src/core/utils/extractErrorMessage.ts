import { AxiosError } from 'axios';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

/**
 * Pull a human-readable message from any error.
 * Backend errors come as { error: { code, message, details } } — see backend errorHandler.
 */
export const extractErrorMessage = (err: unknown): string => {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (err.response?.status === 0 || err.code === 'ERR_NETWORK') {
      return 'Network error — check your connection';
    }
    return err.message || 'Request failed';
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
};

/**
 * For Zod validation errors from backend, surface field-level messages as one line.
 */
export const extractValidationMessages = (err: unknown): string[] => {
  if (!(err instanceof AxiosError)) return [];
  const details = (err.response?.data as ApiErrorBody | undefined)?.error?.details as
    | { fieldErrors?: Record<string, string[]> }
    | undefined;
  if (!details?.fieldErrors) return [];
  return Object.entries(details.fieldErrors).flatMap(([field, msgs]) =>
    (msgs ?? []).map((m) => `${field}: ${m}`),
  );
};
