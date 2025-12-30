import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'accent' | 'blue';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-16 w-16'
  };

  const variantClasses = {
    default: 'border-border border-t-transparent',
    accent: 'border-accent border-t-transparent',
    blue: 'border-blue-600 border-t-transparent'
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-4',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
};

export { LoadingSpinner };