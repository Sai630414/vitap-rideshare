import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, glass = false, ...props }) => {
  return (
    <div
      className={twMerge(
        'bg-card border border-border rounded-[2rem] shadow-premium overflow-hidden transition-all duration-300',
        className
      )}
      {...props}
    />
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={twMerge('flex flex-col space-y-2 p-8', className)} {...props} />;
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => {
  return (
    <h3
      className={twMerge('text-2xl font-bold tracking-tight text-foreground', className)}
      {...props}
    />
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => {
  return <p className={twMerge('text-sm font-medium text-muted-foreground', className)} {...props} />;
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={twMerge('px-8 pb-8', className)} {...props} />;
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={twMerge('flex items-center p-8 pt-0', className)} {...props} />;
};

export default Card;
