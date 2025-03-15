import { useCallback, useRef } from "preact/hooks";

/**
 * Custom hook for debouncing function calls
 * @param callback The function to be debounced
 * @param delay The delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  // Store the timeout ID
  const timeoutRef = useRef<number | null>(null);

  // Create a memoized debounced function
  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      // Clear any existing timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      // Set a new timeout
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay]
  );

  // Cast to the original function type
  return debouncedFn as T;
}
