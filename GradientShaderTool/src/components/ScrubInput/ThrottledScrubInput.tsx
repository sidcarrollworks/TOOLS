import type { FunctionComponent } from "preact";
import { useCallback, useRef, useState, useEffect } from "preact/hooks";
import { ScrubInput } from "./ScrubInput";
import type { ScrubInputProps } from "./ScrubInput";

interface ThrottledScrubInputProps extends ScrubInputProps {
  delay?: number;
  mode?: "throttle" | "debounce";
  /** If true, optimizes for very expensive updates (like high segment counts) */
  highPerformanceMode?: boolean;
}

// Lightweight performance monitor
const performanceMonitor = {
  lastDuration: 0,
  recordUpdate: (duration: number) => {
    performanceMonitor.lastDuration = duration;
  },
  isExpensive: () => performanceMonitor.lastDuration > 50,
};

// Create a controller that provides either throttle or debounce functionality
function createUpdateController(
  callback: (value: number) => void,
  delay: number = 150,
  mode: "throttle" | "debounce" = "throttle",
  highPerformanceMode: boolean = false
) {
  // Core state
  let pendingRaf: number | null = null;
  let pendingTimeout: number | null = null;
  let lastValue: number | null = null;
  let lastUpdateTime = 0;
  let adaptiveDelay = delay;

  // Schedule an update via requestAnimationFrame for smoother updates
  const scheduleUpdate = (value: number) => {
    // Store the value
    lastValue = value;

    // Cancel any pending animation frame
    if (pendingRaf !== null) {
      cancelAnimationFrame(pendingRaf);
      pendingRaf = null;
    }

    // For expensive operations in high performance mode, use direct callback
    if (
      highPerformanceMode &&
      performanceMonitor.isExpensive() &&
      adaptiveDelay > delay
    ) {
      const start = performance.now();
      callback(value);
      performanceMonitor.recordUpdate(performance.now() - start);
      // Increase adaptive delay if still expensive
      if (performance.now() - start > 50) {
        adaptiveDelay = Math.min(500, adaptiveDelay * 1.2);
      }
    } else {
      // Standard update path
      pendingRaf = requestAnimationFrame(() => {
        pendingRaf = null;
        const start = performance.now();
        callback(value);
        const duration = performance.now() - start;
        performanceMonitor.recordUpdate(duration);

        // Update adaptive delay for high performance mode
        if (highPerformanceMode) {
          if (duration > 80) {
            adaptiveDelay = Math.min(500, delay * 1.5);
          } else if (duration < 30 && adaptiveDelay > delay) {
            adaptiveDelay = Math.max(delay, adaptiveDelay * 0.8);
          }
        }
      });
    }
  };

  // Handle timeout completion
  const timeoutHandler = () => {
    pendingTimeout = null;

    if (lastValue !== null) {
      const valueToUpdate = lastValue;
      lastValue = null;
      scheduleUpdate(valueToUpdate);
      lastUpdateTime = performance.now();
    }
  };

  // Main update function
  const update = (value: number) => {
    const now = performance.now();

    // Always store the latest value
    lastValue = value;

    // Clear any existing timeout
    if (pendingTimeout !== null) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }

    // Get current effective delay based on performance
    const currentDelay = adaptiveDelay;

    if (mode === "debounce") {
      // Debounce mode - only update after changes stop
      pendingTimeout = window.setTimeout(timeoutHandler, currentDelay);
    } else {
      // Throttle mode - update at most once per delay period
      const timeSinceLastUpdate = now - lastUpdateTime;

      if (timeSinceLastUpdate >= currentDelay) {
        // Enough time has passed, update now
        lastUpdateTime = now;
        scheduleUpdate(value);
      } else {
        // Schedule update for when throttle period ends
        pendingTimeout = window.setTimeout(
          timeoutHandler,
          currentDelay - timeSinceLastUpdate
        );
      }
    }
  };

  // Clean up function
  const cancel = () => {
    if (pendingTimeout !== null) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }

    if (pendingRaf !== null) {
      cancelAnimationFrame(pendingRaf);
      pendingRaf = null;
    }
  };

  // Apply final value immediately
  const flush = () => {
    cancel();
    if (lastValue !== null) {
      // For final values, bypass all throttling
      callback(lastValue);
      lastValue = null;
    }
  };

  return { update, flush, cancel };
}

export const ThrottledScrubInput: FunctionComponent<
  ThrottledScrubInputProps
> = ({
  onChange,
  delay = 150,
  mode = "throttle",
  highPerformanceMode = false,
  ...props
}) => {
  // State to track the displayed value
  const [displayValue, setDisplayValue] = useState(props.value);

  // Flag to track if we're currently dragging
  const isDraggingRef = useRef(false);

  // Controller ref
  const controllerRef = useRef<ReturnType<
    typeof createUpdateController
  > | null>(null);

  // Drag detection timeout
  const dragStopTimeoutRef = useRef<number>();

  // Calculate effective delay based on props
  const effectiveDelay = useCallback(() => {
    // For high segment counts, use higher default delay
    if (highPerformanceMode && props.max > 100) {
      // Scale delay with max value for very high segment counts
      if (props.max > 200) {
        return Math.max(delay, 300);
      }
      return Math.max(delay, 250);
    }
    return delay;
  }, [delay, highPerformanceMode, props.max]);

  // Update displayValue when props.value changes and not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setDisplayValue(props.value);
    }
  }, [props.value]);

  // Create controller once
  useEffect(() => {
    controllerRef.current = createUpdateController(
      (value: number) => onChange(value),
      effectiveDelay(),
      mode,
      highPerformanceMode
    );

    return () => {
      if (dragStopTimeoutRef.current) {
        clearTimeout(dragStopTimeoutRef.current);
      }

      if (controllerRef.current) {
        controllerRef.current.flush();
      }
    };
  }, [onChange, effectiveDelay, mode, highPerformanceMode]);

  // Handle value changes
  const handleValueChange = useCallback(
    (value: number) => {
      // Update local state for immediate UI feedback
      setDisplayValue(value);

      // Mark as dragging
      isDraggingRef.current = true;

      // Delegate to controller with special handling for high segment counts
      if (highPerformanceMode && props.max > 200 && value > props.max * 0.7) {
        // For very high segments, limit update frequency
        if (controllerRef.current) {
          controllerRef.current.update(value);
        }
      } else {
        // Normal handling
        if (controllerRef.current) {
          controllerRef.current.update(value);
        }
      }

      // Reset drag detection
      if (dragStopTimeoutRef.current) {
        clearTimeout(dragStopTimeoutRef.current);
      }

      dragStopTimeoutRef.current = window.setTimeout(() => {
        isDraggingRef.current = false;

        // Ensure we commit the final value
        if (controllerRef.current) {
          controllerRef.current.flush();
        }
      }, 100);
    },
    [highPerformanceMode, props.max]
  );

  return (
    <ScrubInput {...props} value={displayValue} onChange={handleValueChange} />
  );
};

export default ThrottledScrubInput;
