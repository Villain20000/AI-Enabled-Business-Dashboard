/**
 * Button Component
 * 
 * A customizable button component with multiple variants and sizes.
 * Supports default (primary), outline, ghost, and secondary styles.
 * 
 * @module Button
 * @description Reusable button component with variant and size options
 */

// Import React for component creation
import * as React from "react"

// Import utility function for conditional class names
import { cn } from "@/lib/utils"

/**
 * Button Props Interface
 * 
 * Extends standard HTML button attributes with custom variant and size options.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Size of the button */
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button Component
 * 
 * A reusable button with customizable appearance through variants and sizes.
 * Uses React.forwardRef to support ref forwarding for parent component access.
 * 
 * @param {ButtonProps} props - Button properties including variant and size
 * @param {React.Ref<HTMLButtonElement>} ref - Forwarded ref for the button element
 * @returns {JSX.Element} Styled button component
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles: inline-flex for alignment, whitespace-nowrap to prevent wrapping,
          // rounded-md for rounded corners, text-sm for consistent sizing,
          // transition-colors for smooth hover transitions
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50",
          {
            // Variant styles
            "bg-blue-600 text-white shadow hover:bg-blue-700": variant === "default",      // Primary blue
            "border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900": variant === "outline", // Outlined
            "hover:bg-slate-100 hover:text-slate-900": variant === "ghost",                // Ghost (minimal)
            "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200": variant === "secondary", // Secondary gray
            
            // Size styles
            "h-9 px-4 py-2": size === "default",      // Default size
            "h-8 rounded-md px-3 text-xs": size === "sm",   // Small size
            "h-10 rounded-md px-8": size === "lg",    // Large size
            "h-9 w-9": size === "icon",               // Icon-only square button
          },
          className
        )}
        {...props}
      />
    )
  }
)
// Set display name for debugging and React DevTools
Button.displayName = "Button"

export { Button }
