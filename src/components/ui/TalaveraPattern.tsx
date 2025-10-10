'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TalaveraPatternProps {
  className?: string;
  variant?: 'corner' | 'border' | 'background' | 'floating';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function TalaveraPattern({ 
  className, 
  variant = 'corner', 
  size = 'md',
  animate = false 
}: TalaveraPatternProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  };

  const patterns = {
    corner: (
      <svg viewBox="0 0 80 80" className={cn(sizes[size], animate && 'animate-talavera-float')}>
        <defs>
          <radialGradient id="talavera-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--pattern-primary)" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="var(--pattern-primary)" stopOpacity="0.3"/>
          </radialGradient>
          <pattern id="talavera-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill="var(--pattern-primary)" opacity="0.4"/>
          </pattern>
        </defs>
        
        <circle cx="40" cy="40" r="35" fill="url(#talavera-gradient)" stroke="var(--pattern-primary)" strokeWidth="2"/>
        <circle cx="40" cy="40" r="28" fill="url(#talavera-dots)"/>
        <circle cx="40" cy="40" r="20" fill="none" stroke="var(--pattern-primary)" strokeWidth="1.5" opacity="0.6"/>
        <circle cx="40" cy="40" r="12" fill="none" stroke="var(--pattern-primary)" strokeWidth="1" opacity="0.8"/>
        
        <g transform="translate(40,40)">
          <circle r="4" fill="var(--pattern-primary)"/>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <ellipse rx="8" ry="3" fill="var(--pattern-primary)" opacity="0.5"/>
            </g>
          ))}
        </g>
      </svg>
    ),
    
    border: (
      <svg viewBox="0 0 400 30" className={cn('w-full h-8', animate && 'animate-talavera-pulse')}>
        <defs>
          <pattern id="border-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="8" fill="none" stroke="var(--pattern-primary)" strokeWidth="1.5" opacity="0.4"/>
            <circle cx="15" cy="15" r="3" fill="var(--pattern-primary)" opacity="0.6"/>
            <path d="M15,7 L15,23 M7,15 L23,15" stroke="var(--pattern-primary)" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="400" height="30" fill="url(#border-pattern)"/>
      </svg>
    ),
    
    background: (
      <svg viewBox="0 0 200 200" className={cn('w-full h-full absolute inset-0 opacity-[0.03]', animate && 'animate-talavera-pulse')} preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="bg-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="12" fill="none" stroke="var(--pattern-primary)" strokeWidth="1"/>
            <circle cx="20" cy="20" r="6" fill="none" stroke="var(--pattern-primary)" strokeWidth="0.5"/>
            <circle cx="20" cy="20" r="2" fill="var(--pattern-primary)"/>
            <path d="M20,8 L20,32 M8,20 L32,20" stroke="var(--pattern-primary)" strokeWidth="0.5" opacity="0.5"/>
            {[0, 90, 180, 270].map((angle, i) => (
              <g key={i} transform={`rotate(${angle} 20 20)`}>
                <path d="M20,14 Q24,16 20,18" fill="none" stroke="var(--pattern-primary)" strokeWidth="0.5" opacity="0.3"/>
              </g>
            ))}
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#bg-pattern)"/>
      </svg>
    ),
    
    floating: (
      <div className={cn(
        'absolute opacity-10 pointer-events-none',
        animate && 'animate-talavera-float',
        sizes[size],
        className
      )}>
        <svg viewBox="0 0 60 60" className="w-full h-full">
          <defs>
            <radialGradient id="float-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--pattern-primary)" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="var(--pattern-primary)" stopOpacity="0.2"/>
            </radialGradient>
          </defs>
          <circle cx="30" cy="30" r="25" fill="url(#float-gradient)"/>
          <circle cx="30" cy="30" r="20" fill="none" stroke="var(--pattern-primary)" strokeWidth="1"/>
          <circle cx="30" cy="30" r="12" fill="none" stroke="var(--pattern-primary)" strokeWidth="0.8"/>
          <circle cx="30" cy="30" r="4" fill="var(--pattern-primary)"/>
          <path d="M30,10 L30,50 M10,30 L50,30" stroke="var(--pattern-primary)" strokeWidth="0.5" opacity="0.5"/>
        </svg>
      </div>
    )
  };

  return (
    <div className={cn('select-none', variant !== 'floating' && className)}>
      {patterns[variant]}
    </div>
  );
}
