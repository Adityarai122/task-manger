import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/lib/widgets/button';
import { ROUTES } from '@/lib/routing/routes';

export function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
      <ShieldAlert className="h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="text-muted-foreground max-w-sm">
        You don&apos;t have permission to view this page. If you think this is a mistake, ask an admin.
      </p>
      <Button asChild>
        <Link to={ROUTES.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
