import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full h-10 px-3.5 rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
          error ? 'border-red-300 dark:border-red-800' : 'border-neutral-200 dark:border-neutral-700',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className, id, children, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const textareaId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
          className
        )}
        {...props}
      />
    </div>
  );
}
