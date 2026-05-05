import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ShieldCheck, Sparkles } from 'lucide-react';
import UserService from '../../domain/services/UserService';
import { updateProfileFormSchema, type UpdateProfileFormValues } from '../schemas/userForms';
import AuthService from '@/lib/features/auth/domain/services/AuthService';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Button } from '@/lib/widgets/button';
import { Input } from '@/lib/widgets/input';
import { Card, CardContent } from '@/lib/widgets/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/lib/widgets/form';
import { Badge } from '@/lib/widgets/badge';
import { UserAvatar } from '@/lib/widgets/user-avatar';
import { toast } from '@/lib/widgets/sonner';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: { name: user?.name ?? '', password: '' },
  });

  const onSubmit = async (values: UpdateProfileFormValues) => {
    setSubmitting(true);
    try {
      const payload: { name?: string; password?: string } = { name: values.name };
      if (values.password) payload.password = values.password;
      const updated = await UserService.updateMe(payload);
      AuthService.refreshLocalUser({
        ...(user as NonNullable<typeof user>),
        name: updated.name,
        email: updated.email,
      });
      toast.success('Profile updated');
      form.reset({ name: updated.name, password: '' });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;
  const isAdmin = user.roles.includes('Admin');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">View your account and update your password.</p>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-5">
          <UserAvatar name={user.name} seed={user.email} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold truncate">{user.name}</h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="gap-1">
                {isAdmin && <ShieldCheck className="h-3 w-3" />}
                {user.roles.join(', ')}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {user.permissions.length} permissions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <h3 className="font-semibold">Update your details</h3>
            <p className="text-xs text-muted-foreground">Change your display name or password.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep current"
                        autoComplete="new-password"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Min 8 characters. Leave blank to keep your current password.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div>
            <h3 className="font-semibold">Your permissions</h3>
            <p className="text-xs text-muted-foreground">
              Server enforces these on every request. You don't need to memorise them.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {user.permissions.map((p) => (
              <code
                key={p}
                className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground border"
              >
                {p}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
