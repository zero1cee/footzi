import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'sand' | 'outline' | 'subtle';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-charcoal-900 text-ivory-50 border-charcoal-900',
    sand: 'bg-sand-100 text-sand-700 border-sand-300 font-medium',
    outline: 'bg-transparent text-charcoal-800 border-charcoal-300',
    subtle: 'bg-ivory-200 text-charcoal-700 border-ivory-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-medium border rounded-xs select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
