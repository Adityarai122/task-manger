import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { CheckSquare2 } from 'lucide-react';
import AuthService from '../../domain/services/AuthService';
import { loginFormSchema, type LoginFormValues } from '../schemas/authForms';
import { ROUTES } from '@/lib/routing/routes';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Button } from '@/lib/widgets/button';
import { Input } from '@/lib/widgets/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/lib/widgets/form';
import { toast } from '@/lib/widgets/sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await AuthService.login(values);
      toast.success('Welcome back');
      navigate(ROUTES.dashboard, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 mx-auto">
            <CheckSquare2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Team Task Manager</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your projects and tasks.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Form>

          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Demo admin</p>
            <p><span className="text-muted-foreground">Email:</span> admin@taskmanager.local</p>
            <p><span className="text-muted-foreground">Password:</span> Admin@123</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Accounts are created by administrators. Ask your admin if you need access.
        </p>
      </div>
    </div>
  );
}
