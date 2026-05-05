import { Toaster as Sonner, toast } from 'sonner';

export const Toaster = (props: React.ComponentProps<typeof Sonner>) => (
  <Sonner
    position="top-right"
    richColors
    closeButton
    toastOptions={{
      classNames: {
        toast: 'group toast bg-background text-foreground border-border shadow-lg',
      },
    }}
    {...props}
  />
);

export { toast };
