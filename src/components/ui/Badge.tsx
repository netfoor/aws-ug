import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'primary' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-secondary text-text-primary dark:bg-white/20 dark:text-white dark:border-white/30 border border-border',
      accent: 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent border border-accent/20 dark:border-accent/30',
      primary: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-white border border-primary/20 dark:border-white/30',
      success: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
      warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20',
    };

    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-1',
      lg: 'text-base px-3 py-1.5',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-medium transition-colors theme-transition',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
