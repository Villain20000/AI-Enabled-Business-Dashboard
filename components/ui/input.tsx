/**
 * Input Component
 * 
 * A styled input component for user text entry.
 * Provides consistent styling with borders, focus states, and disabled handling.
 * 
 * @module Input
 * @description Reusable input field component with styling
 */

// Import React for component creation
import * as React from "react"

// Import utility function for conditional class names
import { cn } from "@/lib/utils"

/**
 * Input Props Interface
 * 
 * Extends standard HTML input attributes with React-specific types.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input Component
 * 
 * A styled input field with:
 * - Border and shadow styling
 * - Focus ring on interaction
 * - Placeholder text support
 * - Disabled state handling
 * 
 * Uses React.forwardRef to support ref forwarding.
 * 
 * @param {InputProps} props - Input element properties
 * @param {React.Ref<HTMLInputElement>} ref - Forwarded ref for the input element
 * @returns {JSX.Element} Styled input element
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles: flex for layout, h-9 for consistent height,
          // rounded-md for rounded corners, border for visible boundary,
          // bg-transparent for transparent background
          "flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors ",
          // File input specific styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium ",
          // Placeholder text styling
          "placeholder:text-slate-500 ",
          // Focus visible styles: outline ring for accessibility
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 ",
          // Disabled state: not-allowed cursor and reduced opacity
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
// Set display name for debugging and React DevTools
Input.displayName = "Input"

export { Input }
