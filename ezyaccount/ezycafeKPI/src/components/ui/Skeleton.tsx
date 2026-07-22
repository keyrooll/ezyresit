import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-neutral-200/70 dark:bg-neutral-800/70 animate-pulse',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
