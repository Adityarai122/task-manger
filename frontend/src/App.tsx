import { AppRouter } from '@/lib/routing/AppRouter';
import { Toaster } from '@/lib/widgets/sonner';
import { ConfirmProvider } from '@/lib/widgets/confirm';

export default function App() {
  return (
    <ConfirmProvider>
      <AppRouter />
      <Toaster />
    </ConfirmProvider>
  );
}
