import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-hidden flex flex-col animate-scale-in',
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
