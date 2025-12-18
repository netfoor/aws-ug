/**
 * 🎨 Icon Color Utilities
 * 
 * Provides consistent color schemes for icons that work in both light and dark modes.
 * Uses opacity-based backgrounds and proper color variants for theme compatibility.
 */

export type IconColorVariant = 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'yellow' | 'accent';

interface IconColorClasses {
  bgColor: string;
  textColor: string;
  hoverBg?: string;
}

/**
 * Get theme-aware color classes for icons
 * 
 * @param variant - Color variant to use
 * @returns Object with bgColor and textColor classes that work in both themes
 * 
 * @example
 * ```tsx
 * const { bgColor, textColor } = getIconColors('purple');
 * <div className={bgColor}>
 *   <Icon className={textColor} />
 * </div>
 * ```
 */
export function getIconColors(variant: IconColorVariant): IconColorClasses {
  const colorMap: Record<IconColorVariant, IconColorClasses> = {
    blue: {
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      hoverBg: 'group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30',
    },
    purple: {
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      hoverBg: 'group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/30',
    },
    orange: {
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      hoverBg: 'group-hover:bg-orange-500/20 dark:group-hover:bg-orange-500/30',
    },
    green: {
      bgColor: 'bg-green-500/10 dark:bg-green-500/20',
      textColor: 'text-green-600 dark:text-green-400',
      hoverBg: 'group-hover:bg-green-500/20 dark:group-hover:bg-green-500/30',
    },
    red: {
      bgColor: 'bg-red-500/10 dark:bg-red-500/20',
      textColor: 'text-red-600 dark:text-red-400',
      hoverBg: 'group-hover:bg-red-500/20 dark:group-hover:bg-red-500/30',
    },
    yellow: {
      bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      hoverBg: 'group-hover:bg-yellow-500/20 dark:group-hover:bg-yellow-500/30',
    },
    accent: {
      bgColor: 'bg-accent/10',
      textColor: 'text-accent',
      hoverBg: 'group-hover:bg-accent/20',
    },
  };

  return colorMap[variant];
}

/**
 * Gradient color variants for decorative elements
 * (These are kept separate as they're used for different purposes)
 */
export function getGradientColors(variant: IconColorVariant): string {
  const gradientMap: Record<IconColorVariant, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
    accent: 'from-accent to-accent-dark',
  };

  return gradientMap[variant];
}
