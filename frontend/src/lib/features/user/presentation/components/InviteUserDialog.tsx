import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, ShieldCheck, UserPlus } from 'lucide-react';
import UserService from '../../domain/services/UserService';
import { inviteUserFormSchema, type InviteUserFormValues } from '../schemas/userForms';
import { extractErrorMessage } from '@/core/utils/extractErrorMessage';
import { Button } from '@/lib/widgets/button';
import { Input } from '@/lib/widgets/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/lib/widgets/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/lib/widgets/form';
import { toast } from '@/lib/widgets/sonner';

interface Props {
  onCreated: () => void;
}

const generatePassword = (): string => {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const sym = '!@#$%';
  const all = upper + lower + nums + sym;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(upper) + pick(lower) + pick(nums) + pick(sym);
  while (pwd.length < 12) pwd += pick(all);
  return pwd
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

export function InviteUserDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: { name: '', email: '', password: generatePassword(), role: 'User' },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset({ name: '', email: '', password: generatePassword(), role: 'User' });
  };

  const handleRegen = () => {
    form.setValue('password', generatePassword(), { shouldValidate: true });
  };

  const handleCopy = async () => {
    const pwd = form.getValues('password');
    if (!pwd) return;
    try {
      await navigator.clipboard.writeText(pwd);
      toast.success('Password copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const onSubmit = async (values: InviteUserFormValues) => {
    setSubmitting(true);
    try {
      const created = await UserService.invite(values);
      toast.success(`Invited ${created.email}`, {
        description: `Initial password: ${values.password}`,
        duration: 8000,
      });
      onCreated();
      setOpen(false);
      form.reset({ name: '', email: '', password: generatePassword(), role: 'User' });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a new user</DialogTitle>
          <DialogDescription>
            You set their initial password and share it with them. They can change it after first login.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="invite-user-form">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Alice Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="alice@example.com" {...field} />
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
                  <FormLabel>Initial password</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="text" {...field} className="font-mono" />
                      <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleRegen}>
                        Regenerate
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      {(['User', 'Admin'] as const).map((r) => {
                        const selected = field.value === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => field.onChange(r)}
                            className={`rounded-md border px-3 py-2.5 text-sm transition-colors text-left ${
                              selected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-medium">
                              {r === 'Admin' && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                              {r}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {r === 'Admin' ? 'Full access' : 'Read + own tasks only'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="invite-user-form" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
