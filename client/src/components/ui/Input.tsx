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
              'w-full px-5 py-4 bg-white border-2 border-border rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm shadow-soft',
              icon ? 'pl-12' : '',
              error ? 'border-destructive focus:ring-destructive/10 focus:border-destructive' : '',
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
