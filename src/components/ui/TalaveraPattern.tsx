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
    lg: 'w-16 h-16'
  };

  const patterns = {
    corner: (
      <svg viewBox="0 0 100 100" className={cn(sizes[size], animate && 'animate-talavera-float')}>
        <defs>
          <radialGradient id="talavera-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--pattern-primary)" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="var(--pattern-primary)" stopOpacity="0.05"/>
          </radialGradient>
        </defs>
        
        {/* Círculo base */}
        <circle cx="50" cy="50" r="45" fill="url(#talavera-grad)" stroke="var(--pattern-primary)" strokeWidth="1.5" opacity="0.3"/>
        
        {/* Flor de 8 pétalos - patrón clásico de Talavera */}
        <g transform="translate(50,50)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <ellipse cx="0" cy="-20" rx="6" ry="12" fill="var(--pattern-primary)" opacity="0.2"/>
            </g>
          ))}
          
          {/* Círculos concéntricos */}
          <circle r="15" fill="none" stroke="var(--pattern-primary)" strokeWidth="1" opacity="0.25"/>
          <circle r="8" fill="none" stroke="var(--pattern-primary)" strokeWidth="1" opacity="0.3"/>
          <circle r="3" fill="var(--pattern-primary)" opacity="0.4"/>
        </g>
      </svg>
    ),
    
    border: (
      <svg viewBox="0 0 400 40" className={cn('w-full h-6', animate && 'animate-talavera-pulse')}>
        <defs>
          <pattern id="border-tile" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="12" fill="none" stroke="var(--pattern-primary)" strokeWidth="1" opacity="0.2"/>
            <circle cx="20" cy="20" r="6" fill="none" stroke="var(--pattern-primary)" strokeWidth="0.8" opacity="0.25"/>
            <circle cx="20" cy="20" r="2" fill="var(--pattern-primary)" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="400" height="40" fill="url(#border-tile)"/>
      </svg>
    ),
    
    background: (
      <svg viewBox="0 0 400 400" className={cn('w-full h-full absolute inset-0 opacity-[0.02]', animate && 'animate-talavera-pulse')} preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="bg-tile" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* Flor de Talavera simplificada */}
            <g transform="translate(40,40)">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <g key={i} transform={`rotate(${angle})`}>
                  <ellipse cx="0" cy="-18" rx="4" ry="10" fill="var(--pattern-primary)"/>
                </g>
              ))}
              <circle r="8" fill="none" stroke="var(--pattern-primary)" strokeWidth="1"/>
              <circle r="3" fill="var(--pattern-primary)"/>
            </g>
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#bg-tile)"/>
      </svg>
    ),
    
    floating: (
      <div className={cn(
        'absolute opacity-5 pointer-events-none',
        animate && 'animate-talavera-float',
        sizes[size],
        className
      )}>
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <g transform="translate(40,40)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <ellipse cx="0" cy="-22" rx="5" ry="12" fill="var(--pattern-primary)"/>
              </g>
            ))}
            <circle r="12" fill="none" stroke="var(--pattern-primary)" strokeWidth="1.5"/>
            <circle r="5" fill="var(--pattern-primary)"/>
          </g>
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
