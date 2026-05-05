import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ROUTES } from './routes';

interface Props {
  perm?: string;
  anyOf?: string[];
  children: React.ReactNode;
}

export function RequirePermission({ perm, anyOf, children }: Props) {
  const { has, hasAny } = usePermissions();

  const allowed = perm ? has(perm) : anyOf ? hasAny(anyOf) : true;
  if (!allowed) return <Navigate to={ROUTES.forbidden} replace />;
  return <>{children}</>;
}
