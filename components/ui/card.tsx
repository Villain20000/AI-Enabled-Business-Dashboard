/**
 * Card Components
 * 
 * A set of composable card components for creating content containers.
 * Includes Card, CardHeader, CardTitle, CardDescription, and CardContent.
 * 
 * @module Card
 * @description Collection of card-based UI components for content grouping
 */

// Import React for component creation
import * as React from "react"

// Import utility function for conditional class names
import { cn } from "@/lib/utils"

/**
 * Card Component
 * 
 * The main container component for card-based layouts.
 * Provides consistent styling with border, background, and shadow.
 * 
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div attributes
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref
 * @returns {JSX.Element} Card container element
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  // Rounded corners, light border, white background, subtle shadow
  <div ref={ref} className={cn("rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm", className)} {...props} />
))
Card.displayName = "Card"

/**
 * CardHeader Component
 * 
 * Container for card header content with vertical flex layout.
 * Typically contains CardTitle and CardDescription.
 * 
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div attributes
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref
 * @returns {JSX.Element} Card header element
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  // Vertical flex with spacing, padded
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

/**
 * CardTitle Component
 * 
 * Styled heading component for card titles.
 * Uses semibold font with tight tracking.
 * 
 * @param {React.HTMLAttributes<HTMLHeadingElement>} props - Standard heading attributes
 * @param {React.Ref<HTMLHeadingElement>} ref - Forwarded ref
 * @returns {JSX.Element} Card title heading element
 */
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

/**
 * CardDescription Component
 * 
 * Secondary text component for card descriptions.
 * Uses smaller font with muted gray color.
 * 
 * @param {React.HTMLAttributes<HTMLParagraphElement>} props - Standard paragraph attributes
 * @param {React.Ref<HTMLParagraphElement>} ref - Forwarded ref
 * @returns {JSX.Element} Card description element
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-slate-500", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

/**
 * CardContent Component
 * 
 * Main content area for cards.
 * Padded to create spacing from card edges.
 * 
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div attributes
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref
 * @returns {JSX.Element} Card content element
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  // Padding top for spacing after header, but allows override
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

// Export all card components as a collection
export { Card, CardHeader, CardTitle, CardDescription, CardContent }
