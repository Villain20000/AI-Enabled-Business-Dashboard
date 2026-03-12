/**
 * Mobile Detection Hook
 * 
 * A custom React hook that detects whether the current viewport
 * is in mobile mode (below 768px breakpoint).
 * 
 * @module useIsMobile
 * @description Hook for responsive mobile device detection
 */

// Import React for hooks
import * as React from "react"

/**
 * Mobile Breakpoint
 * 
 * The viewport width (in pixels) below which a device is considered "mobile".
 * 768px corresponds to the common tablet/mobile breakpoint in Tailwind CSS.
 */
const MOBILE_BREAKPOINT = 768

/**
 * useIsMobile Hook
 * 
 * Detects if the viewport is in mobile mode by listening to window resize events.
 * Returns a boolean indicating mobile status, or undefined during initial render.
 * 
 * @returns {boolean | undefined} True if viewport is mobile width, false otherwise
 * 
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * 
 * if (isMobile) {
 *   return <MobileNavigation />;
 * }
 * ```
 */
export function useIsMobile() {
  // State to track mobile status (undefined until mounted)
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  // Effect to monitor viewport changes
  React.useEffect(() => {
    // Create a media query for max-width (breakpoint - 1)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Handler function to update state when media query changes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Add listener for media query changes
    mql.addEventListener("change", onChange)
    
    // Set initial value based on current viewport
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup: remove event listener when component unmounts
    return () => mql.removeEventListener("change", onChange)
  }, []) // Empty dependency array = run once on mount

  // Return boolean value (coerce undefined to false)
  return !!isMobile
}
