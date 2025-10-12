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

  // Pétalo en forma de gota/lágrima - base más ancha, punta redondeada
  const Petal = ({ rotation, distance, color }: { rotation: number; distance: number; color: string }) => (
    <g transform={`rotate(${rotation})`}>
      <ellipse 
        cx="0" 
        cy={-distance} 
        rx="3" 
        ry="8" 
        fill={color}
        opacity="0.85"
      />
    </g>
  );

  // Puntos decorativos en azul celeste
  const DecorativeDots = ({ positions }: { positions: Array<{x: number, y: number}> }) => (
    <>
      {positions.map((pos, i) => (
        <circle 
          key={i}
          cx={pos.x} 
          cy={pos.y} 
          r="1.5" 
          fill="var(--color-accent)"
          opacity="0.4"
        />
      ))}
    </>
  );

  const patterns = {
    corner: (
      <svg viewBox="0 0 100 100" className={cn(sizes[size], animate && 'animate-talavera-float')}>
        <g transform="translate(50,50)">
          {/* Flor principal - 6 pétalos en azul marino */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <Petal key={angle} rotation={angle} distance={18} color="var(--pattern-primary)" />
          ))}
          
          {/* Centro de la flor */}
          <circle r="4" fill="var(--pattern-primary)" opacity="0.9"/>
          
          {/* Puntos decorativos alrededor */}
          <DecorativeDots positions={[
            {x: 25, y: 0}, {x: 28, y: 3}, {x: 28, y: -3},
            {x: -25, y: 0}, {x: -28, y: 3}, {x: -28, y: -3},
            {x: 0, y: 25}, {x: 3, y: 28}, {x: -3, y: 28},
            {x: 0, y: -25}, {x: 3, y: -28}, {x: -3, y: -28}
          ]} />
        </g>
      </svg>
    ),
    
    border: (
      <svg viewBox="0 0 400 60" className={cn('w-full h-8', animate && 'animate-talavera-pulse')}>
        <defs>
          <g id="floral-motif">
            {/* Flor de 5 pétalos */}
            {[0, 72, 144, 216, 288].map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <ellipse cx="0" cy="-12" rx="2.5" ry="7" fill="var(--pattern-primary)" opacity="0.8"/>
              </g>
            ))}
            <circle r="3" fill="var(--pattern-primary)" opacity="0.9"/>
            
            {/* Puntos decorativos */}
            <circle cx="16" cy="0" r="1.2" fill="var(--color-accent)" opacity="0.5"/>
            <circle cx="18" cy="2" r="1" fill="var(--color-accent)" opacity="0.4"/>
            <circle cx="18" cy="-2" r="1" fill="var(--color-accent)" opacity="0.4"/>
          </g>
        </defs>
        
        {/* Repetir motivo a lo largo del borde */}
        {Array.from({length: 10}).map((_, i) => (
          <use key={i} href="#floral-motif" x={i * 40 + 20} y="30" />
        ))}
      </svg>
    ),
    
    background: (
      <svg viewBox="0 0 400 400" className={cn('w-full h-full absolute inset-0 opacity-[0.015]', animate && 'animate-talavera-pulse')} preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="bg-floral" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <g transform="translate(50,50)">
              {/* Flor de 6 pétalos */}
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <g key={angle} transform={`rotate(${angle})`}>
                  <ellipse cx="0" cy="-20" rx="4" ry="10" fill="var(--pattern-primary)"/>
                </g>
              ))}
              <circle r="5" fill="var(--pattern-primary)"/>
              
              {/* Puntos decorativos */}
              {[0, 90, 180, 270].map((angle) => (
                <g key={angle} transform={`rotate(${angle})`}>
                  <circle cx="32" cy="0" r="2" fill="var(--color-accent)" opacity="0.6"/>
                  <circle cx="35" cy="3" r="1.5" fill="var(--color-accent)" opacity="0.5"/>
                  <circle cx="35" cy="-3" r="1.5" fill="var(--color-accent)" opacity="0.5"/>
                </g>
              ))}
            </g>
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#bg-floral)"/>
      </svg>
    ),
    
    floating: (
      <div className={cn(
        'absolute opacity-8 pointer-events-none',
        animate && 'animate-talavera-float',
        sizes[size],
        className
      )}>
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <g transform="translate(40,40)">
            {/* Flor de 5 pétalos */}
            {[0, 72, 144, 216, 288].map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <ellipse cx="0" cy="-18" rx="4" ry="10" fill="var(--pattern-primary)" opacity="0.7"/>
              </g>
            ))}
            <circle r="5" fill="var(--pattern-primary)" opacity="0.8"/>
            
            {/* Puntos decorativos */}
            <circle cx="25" cy="0" r="2" fill="var(--color-accent)" opacity="0.5"/>
            <circle cx="28" cy="3" r="1.5" fill="var(--color-accent)" opacity="0.4"/>
            <circle cx="28" cy="-3" r="1.5" fill="var(--color-accent)" opacity="0.4"/>
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
