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
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-zinc-300 light:text-zinc-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-4 text-zinc-500 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={twMerge(
              'w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50 focus:border-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900 light:placeholder-zinc-400',
              icon ? 'pl-11' : '',
              error ? 'border-red-650 focus:ring-red-650/30 focus:border-red-650' : '',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-semibold text-red-500 leading-none">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
