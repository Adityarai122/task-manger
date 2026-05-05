import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/lib/widgets/button';
import { ROUTES } from '@/lib/routing/routes';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
      <Compass className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild>
        <Link to={ROUTES.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
