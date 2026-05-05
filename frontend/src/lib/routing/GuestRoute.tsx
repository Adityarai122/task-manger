import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { ROUTES } from './routes';

// Bounces authenticated users away from /login and /signup.
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (status === 'authed') return <Navigate to={ROUTES.dashboard} replace />;
  return <>{children}</>;
}
