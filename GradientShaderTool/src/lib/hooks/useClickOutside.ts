import { useEffect, useRef } from "preact/hooks";
import type { RefObject } from "preact";

/**
 * Hook that triggers a callback when a click occurs outside of the specified element
 * @param ref - Reference to the element to detect clicks outside of
 * @param callback - Function to call when a click outside occurs
 */
export const useClickOutside = (
  ref: RefObject<HTMLElement>,
  callback: () => void
): void => {
  // Track mouse positions to ensure mousedown and mouseup are in the same area
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  // Add a flag to prevent rapid consecutive triggers
  const lastCallbackTime = useRef<number>(0);

  useEffect(() => {
    // Handler for mousedown event
    const handleMouseDown = (event: MouseEvent) => {
      // Only track if the mousedown is outside the element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Store position where mousedown occurred
        mouseDownPos.current = { x: event.clientX, y: event.clientY };
      } else {
        // If mousedown is inside the element, clear the position
        mouseDownPos.current = null;
      }
    };

    // Handler for mouseup event - only trigger callback if mouseup happens outside
    const handleMouseUp = (event: MouseEvent) => {
      // Skip if no mousedown position (shouldn't happen)
      if (!mouseDownPos.current) return;

      // Calculate distance between mousedown and mouseup (to prevent triggering on drags)
      const distance = Math.sqrt(
        Math.pow(mouseDownPos.current.x - event.clientX, 2) +
          Math.pow(mouseDownPos.current.y - event.clientY, 2)
      );

      // Only consider as a click if:
      // 1. Distance is small (not a drag)
      // 2. Click is outside the element
      // 3. We haven't triggered the callback too recently
      if (
        distance < 15 && // Increased movement threshold to be more forgiving
        ref.current &&
        event.target &&
        !ref.current.contains(event.target as Node) &&
        Date.now() - lastCallbackTime.current > 300 // Prevent rapid consecutive triggers
      ) {
        // Set the last callback time
        lastCallbackTime.current = Date.now();

        // Use a small timeout to let other event handlers execute first
        setTimeout(() => {
          callback();
        }, 10);
      }

      // Reset mousedown position
      mouseDownPos.current = null;
    };

    // Handler for click event - ensure we're also handling normal clicks
    const handleClick = (event: MouseEvent) => {
      // Skip if the click is inside the element
      if (ref.current && ref.current.contains(event.target as Node)) return;

      // Prevent too-frequent callbacks
      if (Date.now() - lastCallbackTime.current < 300) return;

      // Set the last callback time
      lastCallbackTime.current = Date.now();

      // Use timeout to ensure this is processed after other handlers
      setTimeout(() => {
        callback();
      }, 10);
    };

    // Add event listeners
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("click", handleClick);

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleClick);
    };
  }, [ref, callback]);
};
