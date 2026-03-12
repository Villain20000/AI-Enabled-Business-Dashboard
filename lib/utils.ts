/**
 * Utility Functions
 * 
 * Common utility functions used throughout the application.
 * Provides helper functions for class name manipulation and formatting.
 * 
 * @module utils
 * @description Shared utility functions
 */

// Import clsx for conditional class name joining
import { clsx, type ClassValue } from "clsx"

// Import tailwind-merge for merging Tailwind CSS classes
import { twMerge } from "tailwind-merge"

/**
 * Class Name Merger (cn)
 * 
 * A utility function that combines clsx and tailwind-merge to:
 * 1. Handle conditional class names (clsx)
 * 2. Resolve Tailwind CSS class conflicts (twMerge)
 * 
 * This is the standard utility for handling className props in the project.
 * 
 * @param {...ClassValue[]} inputs - Class values to merge
 * @returns {string} Combined class name string
 * 
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-4', 'py-2') // => 'px-4 py-2'
 * 
 * // Conditional classes
 * cn('px-4', isActive && 'bg-blue-500') // => 'px-4 bg-blue-500' (if active)
 * 
 * // With twMerge - later classes override earlier ones
 * cn('px-4 py-2', 'py-4') // => 'px-4 py-4'
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
