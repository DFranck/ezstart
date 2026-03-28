import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names and merges Tailwind CSS classes intelligently.
 *
 * Uses `clsx` for conditional class names and `tailwind-merge` to resolve
 * conflicting Tailwind utility classes (e.g., `px-2` vs `px-4`).
 *
 * @param inputs - Class values to combine (strings, objects, arrays, conditionals)
 * @returns Merged class string with Tailwind conflicts resolved
 *
 * @example
 * // Simple class merging
 * cn('px-2 py-1', 'bg-white')
 * // => "px-2 py-1 bg-white"
 *
 * @example
 * // Conditional classes
 * cn('px-2', condition && 'mt-2', { 'bg-red': isError })
 * // => "px-2 mt-2 bg-red" (if condition and isError are true)
 *
 * @example
 * // Tailwind conflicts resolved (last wins)
 * cn('px-2', 'px-4')
 * // => "px-4"
 *
 * @example
 * // Typical usage in components
 * <div className={cn('base-class', className, { 'variant': isActive })}>
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
