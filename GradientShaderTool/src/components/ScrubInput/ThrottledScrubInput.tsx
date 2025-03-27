import type { FunctionComponent } from "preact";
import { useCallback, useRef, useState, useEffect } from "preact/hooks";
import { ScrubInput } from "./ScrubInput";
import type { ScrubInputProps } from "./ScrubInput";

interface ThrottledScrubInputProps extends ScrubInputProps {
  throttleDelay?: number;
  debounceDelay?: number;
  changeCountThreshold?: number;
}

// Hybrid throttle/debounce function that adapts based on change frequency
function hybridThrottle<T extends (...args: any[]) => any>(
  func: T,
  throttleLimit: number = 150,
  debounceLimit: number = 300,
  changeThreshold: number = 5
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let isThrottled = false;

  // Track rapid changes
  let changeCount = 0;
  let changeCountStartTime = 0;
  let isDebounceMode = false;

  // Function to flush the last value
  const flush = () => {
    if (lastArgs) {
      func(...lastArgs);
      lastArgs = null;
    }
    isThrottled = false;
    isDebounceMode = false;
    changeCount = 0;
  };

  // Reset change counter after some time
  const resetChangeTracking = () => {
    changeCount = 0;
    changeCountStartTime = Date.now();
    isDebounceMode = false;
  };

  return (...args: Parameters<T>) => {
    const now = Date.now();

    // Always store the latest arguments
    lastArgs = args;

    // Track changes for mode switching
    changeCount++;

    // Initialize change tracking time on first call
    if (changeCountStartTime === 0) {
      changeCountStartTime = now;
    }

    // Calculate changes per second
    const timeWindow = now - changeCountStartTime;
    if (timeWindow > 1000) {
      // Reset after 1 second
      resetChangeTracking();
    }

    // Determine if we should switch to debounce mode based on change frequency
    // If we get more than changeThreshold changes in under 500ms, switch to debounce
    if (!isDebounceMode && timeWindow < 500 && changeCount > changeThreshold) {
      isDebounceMode = true;
    }

    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // If in debounce mode, just wait for changes to stop
    if (isDebounceMode) {
      timeoutId = window.setTimeout(() => {
        flush();
        resetChangeTracking();
      }, debounceLimit);
      return;
    }

    // Otherwise use throttle behavior
    if (!isThrottled) {
      // Not throttled, execute immediately
      lastCall = now;
      isThrottled = true;
      func(...args);

      // Schedule the next possible execution
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        lastCall = Date.now();

        // If there were updates during throttle period, process the last one
        if (lastArgs) {
          flush();
        } else {
          isThrottled = false;
          // Reset change counter after successful throttled execution
          resetChangeTracking();
        }
      }, throttleLimit);
    }
  };
}

export const ThrottledScrubInput: FunctionComponent<
  ThrottledScrubInputProps
> = ({
  onChange,
  throttleDelay = 150,
  debounceDelay = 300,
  changeCountThreshold = 5,
  ...props
}) => {
  // State to track the displayed value (UI state)
  const [displayValue, setDisplayValue] = useState(props.value);

  // Flag to track if we're currently dragging/scrubbing
  const isDraggingRef = useRef(false);

  // Keep track of the latest value for the throttled function
  const latestValueRef = useRef(props.value);

  // Ref to store the throttled function instance to avoid recreation
  const throttledFnRef = useRef<(value: number) => void>();

  // Ref to store timeout ID for drag detection
  const dragStopTimeoutRef = useRef<number>();

  // Update displayValue and ref when props.value changes, but only if we're not dragging
  useEffect(() => {
    // Only sync with incoming props if we're not in the middle of a drag operation
    if (!isDraggingRef.current) {
      setDisplayValue(props.value);
      latestValueRef.current = props.value;
    }
  }, [props.value]);

  // Create hybrid throttle/debounce handler once
  useEffect(() => {
    throttledFnRef.current = hybridThrottle(
      (value: number) => {
        onChange(value);
      },
      throttleDelay,
      debounceDelay,
      changeCountThreshold
    );

    // Cleanup function to ensure any pending changes are applied when unmounting
    return () => {
      // If there's an active drag timeout, clear it
      if (dragStopTimeoutRef.current) {
        clearTimeout(dragStopTimeoutRef.current);
      }

      // If there's a final value that's different from what the parent knows,
      // make sure to sync it before unmounting
      if (latestValueRef.current !== props.value) {
        onChange(latestValueRef.current);
      }
    };
  }, [
    onChange,
    throttleDelay,
    debounceDelay,
    changeCountThreshold,
    props.value,
  ]);

  // Handle value changes
  const handleValueChange = useCallback((value: number) => {
    // Set the dragging flag when values start changing
    isDraggingRef.current = true;

    // Always update the display value immediately for smooth UI
    setDisplayValue(value);
    latestValueRef.current = value;

    // Use the throttled function from our ref
    if (throttledFnRef.current) {
      throttledFnRef.current(value);
    }

    // Clear any existing timeout and set a new one to detect when dragging stops
    if (dragStopTimeoutRef.current) {
      clearTimeout(dragStopTimeoutRef.current);
    }
    dragStopTimeoutRef.current = window.setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  }, []);

  return (
    <ScrubInput {...props} value={displayValue} onChange={handleValueChange} />
  );
};

export default ThrottledScrubInput;
