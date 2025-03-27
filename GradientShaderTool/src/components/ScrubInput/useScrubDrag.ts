import { useRef, useState, useEffect } from "preact/hooks";
import {
  initDragOverlay,
  initVirtualCursor,
  positionVirtualCursor,
  hideVirtualCursor,
  isPointerLockSupported,
  getPointerLockElement,
  exitPointerLock,
  requestPointerLock,
  forceCursorVisible,
  setPointerLockActiveState,
} from "./pointerLockUtils";

// Use the context instead of direct imports
import { useScrubInputContext } from "./ScrubInputContext";

// Define state shape
export interface DragState {
  isDragging: boolean;
  startX: number;
  startValue: number;
  currentValue: number;
  dragDirection: "none" | "left" | "right";
  virtualCursorPos: { x: number; y: number } | null;
}

// Calculate a stable step-based value from mouse movement
const calculateStableValue = (
  distanceMoved: number,
  shiftKey: boolean,
  startValue: number,
  min: number,
  max: number,
  step: number
) => {
  // Base pixels per step - how many pixels to move for one step change
  const basePixelsPerStep = 8; // Adjust for sensitivity

  // Apply shift modifier for fine-tuning
  const pixelsPerStep = shiftKey ? basePixelsPerStep * 5 : basePixelsPerStep;

  // Calculate how many steps we've moved
  const stepsMoved = distanceMoved / pixelsPerStep;

  // Calculate new value based on starting value and steps moved
  let newValue = startValue + stepsMoved * step;

  // Clamp the value between min and max
  newValue = Math.max(min, Math.min(max, newValue));

  // Round to the nearest step to ensure we're always on a valid step
  newValue = Math.round((newValue - min) / step) * step + min;

  return newValue;
};

export interface UseScrubDragOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  usePointerLock?: boolean;
}

/**
 * Handles drag interactions for the ScrubInput component
 *
 * Key features:
 * - Uses individual useState hooks for clear state management
 * - Implements proper cleanup with AbortController
 * - Prevents value jumps during drag operations
 * - Handles pointer lock for continuous dragging
 * - Supports cursor wrapping at screen edges
 */
export function useScrubDrag({
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  usePointerLock = true,
}: UseScrubDragOptions) {
  // Get the ScrubInput context
  const { setActiveInstance } = useScrubInputContext();

  // Use useState for state management
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startValue, setStartValue] = useState(value);
  const [currentValue, setCurrentValue] = useState(value);
  const [dragDirection, setDragDirection] = useState<"none" | "left" | "right">(
    "none"
  );
  const [virtualCursorPos, setVirtualCursorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Refs for tracking values between renders and for cleanup
  const instanceId = useRef(Symbol("ScrubInput")).current;
  const pointerLockSupported = useRef(isPointerLockSupported());
  const accumulatedMovementX = useRef(0);
  const requestPending = useRef(false);
  const frameId = useRef<number | null>(null);
  const isPointerLocked = useRef(false);
  const isDraggingRef = useRef(false);
  const cleanupInProgress = useRef(false);
  const mouseEventListenerAdded = useRef(false);
  const accumulatedMovementY = useRef(0);
  const initialCursorX = useRef(0);
  const initialCursorY = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use refs to track current values to avoid closure issues
  const currentValueRef = useRef(value);
  const startValueRef = useRef(value);

  // Update refs when state changes
  useEffect(() => {
    currentValueRef.current = currentValue;
  }, [currentValue]);

  useEffect(() => {
    startValueRef.current = startValue;
  }, [startValue]);

  // Update state when prop value changes
  useEffect(() => {
    if (!isDragging) {
      setCurrentValue(value);
      setStartValue(value);
      currentValueRef.current = value;
      startValueRef.current = value;
    }
  }, [value, isDragging]);

  // Combined drag state object for API compatibility
  const dragState: DragState = {
    isDragging,
    startX,
    startValue,
    currentValue,
    dragDirection,
    virtualCursorPos,
  };

  // Keep the ref updated with current dragging state
  useEffect(() => {
    isDraggingRef.current = isDragging;

    // If drag state changed to true, set this instance as active
    if (isDragging) {
      setActiveInstance(instanceId);
    } else if (!isDragging) {
      setActiveInstance(null);
    }
  }, [isDragging, setActiveInstance, instanceId, currentValue, startValue]);

  // Sync the currentValue with the value prop when not dragging
  useEffect(() => {
    if (!isDragging && value !== currentValue) {
      setCurrentValue(value);
      currentValueRef.current = value;
    }
  }, [value, isDragging, currentValue]);

  // Effect to update value when current value changes
  useEffect(() => {
    if (isDragging && currentValue !== value) {
      onChange(currentValue);
    }
  }, [currentValue, isDragging, onChange, value]);

  // Handle locked mouse movement for dragging
  const handleLockedMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    // Get the movement from the pointer lock API
    const movementX = e.movementX || 0;
    const movementY = e.movementY || 0;

    // Update accumulated movement for value calculation
    accumulatedMovementX.current += movementX;
    accumulatedMovementY.current += movementY;

    // Update virtual cursor position for visual feedback
    if (
      initialCursorX.current !== undefined &&
      initialCursorY.current !== undefined
    ) {
      // Calculate new position
      let newX = initialCursorX.current + accumulatedMovementX.current;
      let newY = initialCursorY.current + accumulatedMovementY.current;

      // Get window dimensions
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Define padding from the edge (in pixels)
      const edgePadding = 2;

      // Check if cursor is near the edge and wrap if needed
      if (newX < edgePadding) {
        // Wrap from left to right
        newX = windowWidth - edgePadding;
        // Adjust the initial position to maintain smooth movement
        initialCursorX.current = newX - accumulatedMovementX.current;
      } else if (newX > windowWidth - edgePadding) {
        // Wrap from right to left
        newX = edgePadding;
        // Adjust the initial position to maintain smooth movement
        initialCursorX.current = newX - accumulatedMovementX.current;
      }

      // Do the same for Y axis
      if (newY < edgePadding) {
        // Wrap from top to bottom
        newY = windowHeight - edgePadding;
        // Adjust the initial position to maintain smooth movement
        initialCursorY.current = newY - accumulatedMovementY.current;
      } else if (newY > windowHeight - edgePadding) {
        // Wrap from bottom to top
        newY = edgePadding;
        // Adjust the initial position to maintain smooth movement
        initialCursorY.current = newY - accumulatedMovementY.current;
      }

      // Update the virtual cursor position
      setVirtualCursorPos({ x: newX, y: newY });
      positionVirtualCursor(newX, newY);
    }

    // Determine drag direction based on accumulated movement
    if (accumulatedMovementX.current > 5 && dragDirection !== "right") {
      setDragDirection("right");
    } else if (accumulatedMovementX.current < -5 && dragDirection !== "left") {
      setDragDirection("left");
    }

    // Calculate new value based on accumulated movement
    const newValue = calculateStableValue(
      accumulatedMovementX.current,
      e.shiftKey,
      startValueRef.current, // Use ref for latest value
      min,
      max,
      step
    );

    // Only update if the value has changed
    if (newValue !== currentValueRef.current) {
      setCurrentValue(newValue);
      currentValueRef.current = newValue;
    }
  };

  // Handle standard mouse movement for dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    // Calculate the distance moved from the start position
    const distanceMoved = e.clientX - startX;

    // Determine drag direction based on distance moved
    if (distanceMoved > 5 && dragDirection !== "right") {
      setDragDirection("right");
    } else if (distanceMoved < -5 && dragDirection !== "left") {
      setDragDirection("left");
    }

    // Calculate new value based on distance moved
    const newValue = calculateStableValue(
      distanceMoved,
      e.shiftKey,
      startValueRef.current, // Use ref for latest value
      min,
      max,
      step
    );

    // Only update if the value has changed
    if (newValue !== currentValueRef.current) {
      setCurrentValue(newValue);
      currentValueRef.current = newValue;
    }
  };

  // Handle the start of a drag operation
  const handleDragStart = (e: MouseEvent) => {
    if (disabled || e.button !== 0) {
      return;
    }

    // Prevent default behavior to avoid text selection
    e.preventDefault();

    // Store the starting position and initial value
    initialCursorX.current = e.clientX;
    initialCursorY.current = e.clientY;
    setStartX(e.clientX);

    // Capture the current value directly from props to avoid stale state
    setStartValue(value);
    setCurrentValue(value);
    startValueRef.current = value;
    currentValueRef.current = value;

    // Set dragging state
    setIsDragging(true);
    isDraggingRef.current = true;
    setDragDirection("none");

    // Reset accumulated movement
    accumulatedMovementX.current = 0;
    accumulatedMovementY.current = 0;

    // Create a new abort controller for this drag operation
    abortControllerRef.current = new AbortController();

    // Setup event listeners for mouse movement and release
    setupMouseListeners();

    // Initialize and show the virtual cursor immediately at the current mouse position
    initDragOverlay();
    initVirtualCursor();
    setVirtualCursorPos({ x: e.clientX, y: e.clientY });
    positionVirtualCursor(e.clientX, e.clientY);

    // Request pointer lock if applicable
    if (usePointerLock && pointerLockSupported.current) {
      const target = e.currentTarget as HTMLElement;
      if (target) {
        requestLock(target);
      }
    }
  };

  // Set up mouse movement and release listeners
  const setupMouseListeners = () => {
    if (mouseEventListenerAdded.current) {
      return;
    }

    mouseEventListenerAdded.current = true;
    const signal = abortControllerRef.current?.signal;

    document.addEventListener("mousemove", handleLockedMouseMove, { signal });
    document.addEventListener("mouseup", handleMouseUp, { signal });
    document.addEventListener("keydown", handleKeyDown, { signal });
  };

  // Handle mouse up event to end dragging
  const handleMouseUp = () => {
    cleanup();
  };

  // Handle key down events during dragging
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cancel drag on Escape key
    if (e.key === "Escape" && isDraggingRef.current) {
      setCurrentValue(startValueRef.current); // Revert to the starting value using ref
      currentValueRef.current = startValueRef.current;
      cleanup();
    }
  };

  // Request pointer lock on an element
  const requestLock = (element: HTMLElement) => {
    if (requestPending.current || isPointerLocked.current) {
      return;
    }

    requestPending.current = true;

    try {
      requestPointerLock(element);

      // Set up a pointer lock change listener
      const handlePointerLockChange = () => {
        const lockElement = getPointerLockElement();
        isPointerLocked.current = lockElement === element;
        requestPending.current = false;

        // Update pointer lock active state for CSS
        setPointerLockActiveState(isPointerLocked.current);
      };

      // Add event listeners for pointer lock changes
      document.addEventListener("pointerlockchange", handlePointerLockChange, {
        signal: abortControllerRef.current?.signal,
      });
      document.addEventListener(
        "pointerlockerror",
        () => {
          console.error("[useScrubDrag] Pointer lock error");
          requestPending.current = false;
          isPointerLocked.current = false;
        },
        { signal: abortControllerRef.current?.signal }
      );
    } catch (error) {
      console.error("[useScrubDrag] Error requesting pointer lock:", error);
      requestPending.current = false;
    }
  };

  // Cleanup function to release resources and reset state
  const cleanup = () => {
    if (cleanupInProgress.current) {
      return;
    }

    cleanupInProgress.current = true;

    // Cancel any pending animation frame
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current);
      frameId.current = null;
    }

    // Exit pointer lock if it's currently locked
    if (isPointerLocked.current) {
      exitPointerLock();
      isPointerLocked.current = false;
      hideVirtualCursor();
      setPointerLockActiveState(false);
    }

    // Ensure cursor is visible after drag
    forceCursorVisible();

    // Reset state
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragDirection("none");
    setVirtualCursorPos(null);

    // Clean up event listeners
    mouseEventListenerAdded.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    cleanupInProgress.current = false;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        cleanup();
      }
    };
  }, []);

  // Return the drag state and handlers
  return {
    dragState,
    handleDragStart,
  };
}
