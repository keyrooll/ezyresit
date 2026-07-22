import { createContext, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200',
};

const iconColors = {
  success: 'text-primary-600 dark:text-primary-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-slide-up backdrop-blur-sm',
                styles[t.type]
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColors[t.type])} />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
