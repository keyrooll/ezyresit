import { initials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center bg-primary-100 text-primary-700 font-semibold dark:bg-primary-900/40 dark:text-primary-300',
        sizeClasses[size],
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
