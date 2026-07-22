import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4', className)}>
      <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
