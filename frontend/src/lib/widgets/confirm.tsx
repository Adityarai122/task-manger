import { createContext, useCallback, useContext, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { buttonVariants } from './button';
import { cn } from '@/core/utils/cn';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** Use the destructive button style for the confirm action. */
  destructive?: boolean;
}

type Resolver = (value: boolean) => void;

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<ConfirmCtx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<Resolver | null>(null);

  const confirm = useCallback((next: ConfirmOptions): Promise<boolean> => {
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const finish = useCallback(
    (value: boolean) => {
      resolver?.(value);
      setResolver(null);
      setOpts(null);
    },
    [resolver],
  );

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={!!opts} onOpenChange={(open) => !open && finish(false)}>
        <AlertDialogContent>
          {opts && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{opts.title}</AlertDialogTitle>
                {opts.description && (
                  <AlertDialogDescription>{opts.description}</AlertDialogDescription>
                )}
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => finish(false)}>
                  {opts.cancelText ?? 'Cancel'}
                </AlertDialogCancel>
                <AlertDialogAction
                  className={cn(opts.destructive && buttonVariants({ variant: 'destructive' }))}
                  onClick={() => finish(true)}
                >
                  {opts.confirmText ?? 'Confirm'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx.confirm;
}
