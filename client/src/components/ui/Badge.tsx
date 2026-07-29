import React from 'react';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'destructive' | 'warning';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'primary', ...props }) => {
  const baseStyles =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold select-none border transition-all duration-150';

  const variants = {
    primary:
      'bg-violet-950/40 text-violet-400 border-violet-800/30 dark:bg-violet-950/40 dark:text-violet-400 light:bg-violet-50 light:text-violet-700 light:border-violet-200',
    secondary:
      'bg-zinc-800/50 text-zinc-300 border-zinc-700/50 dark:bg-zinc-800/50 dark:text-zinc-300 light:bg-zinc-100 light:text-zinc-700 light:border-zinc-350',
    success:
      'bg-emerald-950/40 text-emerald-400 border-emerald-800/30 dark:bg-emerald-950/40 dark:text-emerald-400 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-200',
    destructive:
      'bg-red-950/40 text-red-400 border-red-800/30 dark:bg-red-950/40 dark:text-red-400 light:bg-red-50 light:text-red-700 light:border-red-200',
    warning:
      'bg-amber-950/40 text-amber-400 border-amber-800/30 dark:bg-amber-950/40 dark:text-amber-400 light:bg-amber-50 light:text-amber-700 light:border-amber-200',
  };

  return (
    <span className={twMerge(baseStyles, variants[variant], className)} {...props} />
  );
};

export default Badge;
