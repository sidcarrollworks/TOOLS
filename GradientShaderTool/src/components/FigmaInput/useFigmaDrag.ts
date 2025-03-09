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
  setPointerLockActiveState
} from "./pointerLockUtils";

// Create a helper to set active instance
import { setActiveInstance } from "./instanceManager";

export interface DragState {
  isDragging: boolean;
  startX: number;
  startValue: number;
  currentValue: number;
  dragDirection: "none" | "left" | "right";
  virtualCursorPos: { x: number; y: number } | null;
}

export interface UseFigmaDragOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  usePointerLock?: boolean;
}

export function useFigmaDrag({
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  usePointerLock = true,
}: UseFigmaDragOptions) {
  // State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startValue, setStartValue] = useState<number>(value);
  const [currentValue, setCurrentValue] = useState<number>(value);
  const [dragDirection, setDragDirection] = useState<"none" | "left" | "right">("none");
  const [virtualCursorPos, setVirtualCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Refs
  const instanceId = useRef(Symbol("FigmaInput")).current;
  const pointerLockSupported = useRef(isPointerLockSupported());
  const accumulatedMovementX = useRef(0);
  const requestPending = useRef(false);
  const frameId = useRef<number | null>(null);
  const isPointerLocked = useRef(false);
  const isDraggingRef = useRef(false);
  const cleanupInProgress = useRef(false);
  const mouseEventListenerAdded = useRef(false);

  // Update the ref when state changes
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Calculate a stable step-based value from mouse movement
  const calculateStableValue = (distanceMoved: number, shiftKey: boolean) => {
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

  // Clean up function to completely reset pointer lock state
  const cleanupPointerLock = () => {
    // Prevent multiple cleanups
    if (cleanupInProgress.current) {
      return;
    }

    cleanupInProgress.current = true;

    // Cancel any pending animation frames
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current);
      frameId.current = null;
    }

    // Hide virtual cursor
    hideVirtualCursor();

    // Exit pointer lock if active
    if (getPointerLockElement()) {
      exitPointerLock();
    }

    // Hide the overlay
    const overlay = initDragOverlay();
    if (overlay) {
      overlay.style.display = "none";
    }

    // Reset classes and cursor
    document.documentElement.classList.remove("figma-input-dragging-active");
    document.body.classList.remove("figma-input-dragging-active");
    setPointerLockActiveState(false);
    forceCursorVisible();

    // Reset request pending state
    requestPending.current = false;
    isPointerLocked.current = false;
    mouseEventListenerAdded.current = false;

    // Reset cleanup flag
    setTimeout(() => {
      cleanupInProgress.current = false;
    }, 100);
  };

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

    // Update virtual cursor position
    if (!virtualCursorPos) {
      // Initialize position if not set
      const initialPos = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
      setVirtualCursorPos(initialPos);
      positionVirtualCursor(initialPos.x, initialPos.y);
      return;
    }

    // Calculate new position with direct movement values
    const newX = virtualCursorPos.x + movementX;
    const newY = virtualCursorPos.y + movementY;

    // Update cursor position - do this BEFORE updating state to avoid delays
    positionVirtualCursor(newX, newY);

    // Update state after positioning the cursor
    setVirtualCursorPos({ x: newX, y: newY });

    // Update drag direction for visual feedback
    if (movementX > 0) {
      setDragDirection("right");
    } else if (movementX < 0) {
      setDragDirection("left");
    }

    // Calculate new value using stable calculation
    const newValue = calculateStableValue(
      accumulatedMovementX.current,
      e.shiftKey
    );

    // Update the current value
    setCurrentValue(newValue);
  };

  // Request pointer lock with a slight delay to avoid race conditions
  const requestLock = () => {
    if (
      requestPending.current ||
      !isDraggingRef.current ||
      isPointerLocked.current
    ) {
      return;
    }

    requestPending.current = true;

    // Use requestAnimationFrame for better timing
    frameId.current = requestAnimationFrame(() => {
      if (isDraggingRef.current && !isPointerLocked.current) {
        const overlay = initDragOverlay();
        if (overlay) {
          try {
            requestPointerLock(overlay);
          } catch (err) {
            requestPending.current = false;
          }
        }
      } else {
        requestPending.current = false;
      }
    });
  };

  // Setup on mount
  useEffect(() => {
    initDragOverlay();
    if (usePointerLock) {
      initVirtualCursor();
    }

    return () => {
      cleanupPointerLock();
      setActiveInstance(null);
    };
  }, []);

  // Update current value
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  // Handle value changes during dragging
  useEffect(() => {
    if (isDragging && currentValue !== value) {
      onChange(currentValue);
    }
  }, [currentValue, isDragging, onChange, value]);

  // Setup pointer lock when dragging starts
  useEffect(() => {
    if (!isDragging || !usePointerLock || !pointerLockSupported.current) {
      return;
    }

    // Set this instance as the active one
    setActiveInstance(instanceId);

    // Reset accumulated movement
    accumulatedMovementX.current = 0;

    // Position the virtual cursor at the mouse position initially
    if (virtualCursorPos) {
      positionVirtualCursor(virtualCursorPos.x, virtualCursorPos.y);
    }

    // Add a class to show we're dragging
    document.documentElement.classList.add("figma-input-dragging-active");
    document.body.classList.add("figma-input-dragging-active");

    // Show the overlay (needed as the lockable element)
    const overlay = initDragOverlay();
    if (overlay) {
      overlay.style.display = "block";
    }

    // Handle pointer lock changes
    const handlePointerLockChange = () => {
      const lockElement = getPointerLockElement();

      if (lockElement) {
        // Pointer lock acquired
        setPointerLockActiveState(true);
        isPointerLocked.current = true;

        // Only add the event listener once
        if (!mouseEventListenerAdded.current) {
          document.addEventListener("mousemove", handleLockedMouseMove);
          mouseEventListenerAdded.current = true;
        }
      } else {
        // Pointer lock released
        setPointerLockActiveState(false);
        isPointerLocked.current = false;

        // Clean up event listeners
        document.removeEventListener("mousemove", handleLockedMouseMove);
        mouseEventListenerAdded.current = false;

        // Hide the virtual cursor
        hideVirtualCursor();
      }
    };

    // Handle pointer lock errors
    const handlePointerLockError = () => {
      if (mouseEventListenerAdded.current) {
        document.removeEventListener("mousemove", handleLockedMouseMove);
        mouseEventListenerAdded.current = false;
      }
      isPointerLocked.current = false;
    };

    // Handle mouse up to end dragging
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      // Remove the mouse move listener if it was added
      if (mouseEventListenerAdded.current) {
        document.removeEventListener("mousemove", handleLockedMouseMove);
        mouseEventListenerAdded.current = false;
      }

      setIsDragging(false);
      setDragDirection("none");
      cleanupPointerLock();

      // Prevent default behavior
      e.preventDefault();
      e.stopPropagation();
    };

    // Add event listeners for pointer lock state changes
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mozpointerlockchange", handlePointerLockChange);
    document.addEventListener(
      "webkitpointerlockchange",
      handlePointerLockChange
    );
    document.addEventListener("pointerlockerror", handlePointerLockError);
    document.addEventListener("mozpointerlockerror", handlePointerLockError);
    document.addEventListener("webkitpointerlockerror", handlePointerLockError);
    document.addEventListener("mouseup", handleMouseUp, { capture: true });

    // Request the lock
    requestLock();

    return () => {
      // Clean up all event listeners
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
      document.removeEventListener(
        "mozpointerlockchange",
        handlePointerLockChange
      );
      document.removeEventListener(
        "webkitpointerlockchange",
        handlePointerLockChange
      );
      document.removeEventListener("pointerlockerror", handlePointerLockError);
      document.removeEventListener(
        "mozpointerlockerror",
        handlePointerLockError
      );
      document.removeEventListener(
        "webkitpointerlockerror",
        handlePointerLockError
      );

      if (mouseEventListenerAdded.current) {
        document.removeEventListener("mousemove", handleLockedMouseMove);
        mouseEventListenerAdded.current = false;
      }

      document.removeEventListener("mouseup", handleMouseUp, { capture: true });

      // Only clean up if we're not already in the process of cleaning up
      if (!cleanupInProgress.current) {
        cleanupPointerLock();
      }
    };
  }, [isDragging, usePointerLock]);

  // Handle drag start
  const handleDragStart = (e: MouseEvent) => {
    if (disabled) return;

    // Cancel any previous animation frame
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current);
      frameId.current = null;
    }

    // Reset flags
    cleanupInProgress.current = false;
    isPointerLocked.current = false;
    mouseEventListenerAdded.current = false;
    requestPending.current = false;

    // First capture the starting coordinates and value
    setIsDragging(true);
    setStartX(e.clientX);
    setStartValue(currentValue);
    accumulatedMovementX.current = 0;

    // Store the initial cursor position for virtual cursor
    const initialPos = { x: e.clientX, y: e.clientY };
    setVirtualCursorPos(initialPos);

    // Ensure virtual cursor is initialized and visible
    if (usePointerLock && pointerLockSupported.current) {
      // Force cursor initialization
      initVirtualCursor();

      // Immediately position and show the cursor
      positionVirtualCursor(initialPos.x, initialPos.y);
    }

    // Prevent text selection during drag
    e.preventDefault();
    e.stopPropagation();
  };

  return {
    dragState: {
      isDragging,
      startX,
      startValue,
      currentValue,
      dragDirection,
      virtualCursorPos
    },
    handleDragStart,
    cleanupPointerLock
  };
} 