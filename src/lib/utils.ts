import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

/**
 * Utility function to merge Tailwind CSS classes
 * Automatically resolves conflicts (e.g., w-full vs w-24)
 * 
 * @example
 * cn('w-full', 'w-24') // Returns 'w-24' (w-full is removed)
 * cn('bg-red-500', className) // Merges with custom className
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

















