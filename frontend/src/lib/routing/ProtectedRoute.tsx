import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { ROUTES } from './routes';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (status === 'guest') {
    // Preserve intended destination so we can return after login.
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
