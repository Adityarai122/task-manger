import { Avatar, AvatarFallback } from '@/lib/widgets/avatar';
import { cn } from '@/core/utils/cn';

// Deterministic colour palette — same name always picks the same swatch.
const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-fuchsia-100 text-fuchsia-700',
];

const colourFor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

interface Props {
  name: string;
  /** Optional id/email used to seed the colour — falls back to name. */
  seed?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE: Record<NonNullable<Props['size']>, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function UserAvatar({ name, seed, size = 'sm', className }: Props) {
  const colour = colourFor(seed ?? name);
  return (
    <Avatar className={cn(SIZE[size], 'shrink-0 ring-1 ring-white/60', className)}>
      <AvatarFallback className={cn('font-semibold', colour)}>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}

interface NamedProps {
  name: string;
  email?: string;
  seed?: string;
  size?: Props['size'];
  /** Show the name next to the avatar. Default true. */
  showName?: boolean;
  className?: string;
}

export function NamedUser({
  name,
  email,
  seed,
  size = 'sm',
  showName = true,
  className,
}: NamedProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 min-w-0', className)}>
      <UserAvatar name={name} seed={seed ?? email ?? name} size={size} />
      {showName && (
        <div className="min-w-0">
          <div className="text-sm font-medium truncate leading-tight">{name}</div>
          {email && <div className="text-xs text-muted-foreground truncate leading-tight">{email}</div>}
        </div>
      )}
    </div>
  );
}
