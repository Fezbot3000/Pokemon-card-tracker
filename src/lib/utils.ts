import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and twMerge for Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format class names for consistent styling
 * Removes extra whitespace and sorts classes for consistency
 */
export function formatClassName(className: string): string {
  return className.split(' ').filter(Boolean).join(' ');
}

/**
 * Conditional class helper for common patterns
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass: string = ''
): string {
  return condition ? trueClass : falseClass;
}

/**
 * Responsive class helper
 */
export function responsiveClass(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  const classes = [mobile];

  if (tablet) {
    classes.push(`sm:${tablet}`);
  }

  if (desktop) {
    classes.push(`lg:${desktop}`);
  }

  return classes.join(' ');
}

/**
 * Theme-aware class helper
 */
export function themeClass(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`;
}
