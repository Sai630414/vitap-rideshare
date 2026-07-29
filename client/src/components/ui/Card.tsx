import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, glass = false, ...props }) => {
  return (
    <div
      className={twMerge(
        glass
          ? 'glass-card'
          : 'bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm text-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 light:bg-white light:border-zinc-200 light:text-zinc-900',
        className
      )}
      {...props}
    />
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={twMerge('flex flex-col space-y-1.5 p-6', className)} {...props} />;
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => {
  return (
    <h3
      className={twMerge('text-lg font-semibold leading-none tracking-tight font-sans', className)}
      {...props}
    />
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => {
  return <p className={twMerge('text-sm text-zinc-400 light:text-zinc-500', className)} {...props} />;
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={twMerge('p-6 pt-0', className)} {...props} />;
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={twMerge('flex items-center p-6 pt-0', className)} {...props} />;
};

export default Card;


