import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'sand';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sand-400/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none tracking-wide text-xs uppercase';

    const variants = {
      primary: 'bg-charcoal-900 text-ivory-50 hover:bg-charcoal-800 border border-charcoal-900 shadow-sm',
      secondary: 'bg-ivory-200 text-charcoal-900 hover:bg-ivory-300 border border-ivory-300',
      outline: 'bg-transparent text-charcoal-900 border border-charcoal-900/30 hover:border-charcoal-900 hover:bg-charcoal-900/5',
      ghost: 'bg-transparent text-charcoal-800 hover:bg-charcoal-900/5 hover:text-charcoal-950',
      sand: 'bg-sand-400 text-charcoal-950 hover:bg-sand-500 font-semibold shadow-sm',
    };

    const sizes = {
      sm: 'h-9 px-4 rounded-xs text-[11px]',
      md: 'h-11 px-6 rounded-xs text-xs tracking-wider',
      lg: 'h-13 px-8 rounded-xs text-sm tracking-widest',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
