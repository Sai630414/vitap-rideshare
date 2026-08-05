import React from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center group">
          {icon && (
            <div className="absolute left-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={twMerge(
              'w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all text-xs sm:text-sm shadow-sm',
              icon ? 'pl-11' : '',
              error ? 'border-rose-500 focus:ring-rose-500/10 focus:border-rose-500' : '',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-medium text-destructive ml-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
