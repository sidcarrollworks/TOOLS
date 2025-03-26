import { useRef, useReducer, useEffect } from "preact/hooks";
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
import { useFigmaInputContext } from "./FigmaInputContext";

// Define state shape
export interface DragState {
  isDragging: boolean;
  startX: number;
  startValue: number;
  currentValue: number;
  dragDirection: "none" | "left" | "right";
  virtualCursorPos: { x: number; y: number } | null;
}

// Define action types
type DragAction =
  | { type: "START_DRAG"; x: number; value: number }
  | { type: "END_DRAG" }
  | { type: "UPDATE_CURSOR"; x: number; y: number }
  | { type: "SET_DIRECTION"; direction: "left" | "right" | "none" }
  | { type: "UPDATE_VALUE"; value: number };

// Define the initial state
const initialDragState: DragState = {
  isDragging: false,
  startX: 0,
  startValue: 0,
  currentValue: 0,
  dragDirection: "none",
  virtualCursorPos: null,
};

// Reducer function to manage drag state
const dragReducer = (state: DragState, action: DragAction): DragState => {
  switch (action.type) {
    case "START_DRAG":
      console.log(
        "[dragReducer] START_DRAG - startX:",
        action.x,
        "startValue:",
        action.value
      );
      return {
        ...state,
        isDragging: true,
        startX: action.x,
        startValue: action.value,
        currentValue: action.value,
        dragDirection: "none",
      };

    case "END_DRAG":
      console.log("[dragReducer] END_DRAG");
      return {
        ...state,
        isDragging: false,
        dragDirection: "none",
        virtualCursorPos: null,
      };

    case "UPDATE_CURSOR":
      return {
        ...state,
        virtualCursorPos: { x: action.x, y: action.y },
      };

    case "SET_DIRECTION":
      return {
        ...state,
        dragDirection: action.direction,
      };

    case "UPDATE_VALUE":
      console.log(
        "[dragReducer] UPDATE_VALUE - new value:",
        action.value,
        "previous value:",
        state.currentValue
      );
      return {
        ...state,
        currentValue: action.value,
      };

    default:
      return state;
  }
};

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

export interface UseFigmaDragOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  usePointerLock?: boolean;
}

/**
 * Refactored version of useFigmaDrag with improved state management
 *
 * Key features:
 * - Uses useReducer instead of multiple useState calls
 * - Implements proper cleanup with AbortController
 * - Protects against value jumps during drag start
 * - Handles pointer lock behavior correctly
 */
export function useFigmaDragRefactored({
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  usePointerLock = true,
}: UseFigmaDragOptions) {
  // Get the FigmaInput context
  const { setActiveInstance } = useFigmaInputContext();

  console.log("[useFigmaDrag] Initializing with value:", value);

  // Use reducer for state management
  const [dragState, dispatch] = useReducer(dragReducer, {
    ...initialDragState,
    currentValue: value,
    startValue: value,
  });

  console.log("[useFigmaDrag] Current dragState:", dragState);

  // Refs for tracking values between renders and for cleanup
  const instanceId = useRef(Symbol("FigmaInput")).current;
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

  // Keep the ref updated with current dragging state
  useEffect(() => {
    isDraggingRef.current = dragState.isDragging;
    console.log(
      "[useFigmaDrag] isDragging changed:",
      dragState.isDragging,
      "currentValue:",
      dragState.currentValue,
      "startValue:",
      dragState.startValue
    );

    // If drag state changed to true, set this instance as active
    if (dragState.isDragging) {
      setActiveInstance(instanceId);
    } else if (!dragState.isDragging) {
      setActiveInstance(null);
    }
  }, [dragState.isDragging, setActiveInstance, instanceId]);

  // Sync the currentValue with the value prop when not dragging
  useEffect(() => {
    console.log(
      "[useFigmaDrag] Value sync effect - prop value:",
      value,
      "current:",
      dragState.currentValue,
      "isDragging:",
      dragState.isDragging
    );
    if (!dragState.isDragging && value !== dragState.currentValue) {
      console.log("[useFigmaDrag] Updating value from prop:", value);
      dispatch({ type: "UPDATE_VALUE", value });
    }
  }, [value, dragState.isDragging, dragState.currentValue]);

  // Effect to update value when current value changes
  useEffect(() => {
    if (dragState.isDragging && dragState.currentValue !== value) {
      console.log(
        "[useFigmaDrag] Calling onChange with:",
        dragState.currentValue
      );
      onChange(dragState.currentValue);
    }
  }, [dragState.currentValue, dragState.isDragging, onChange, value]);

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

    // Calculate new position based on accumulated movement from initial position
    let newX = initialCursorX.current + accumulatedMovementX.current;
    let newY = initialCursorY.current + accumulatedMovementY.current;

    // Skip the fallback check - we've ensured cursor position is initialized properly
    // in both handleDragStart and after pointer lock is established

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

    // Update cursor position - do this BEFORE updating state to avoid delays
    positionVirtualCursor(newX, newY);

    // Update state after positioning the cursor
    dispatch({ type: "UPDATE_CURSOR", x: newX, y: newY });

    // Update drag direction for visual feedback
    if (movementX > 0) {
      dispatch({ type: "SET_DIRECTION", direction: "right" });
    } else if (movementX < 0) {
      dispatch({ type: "SET_DIRECTION", direction: "left" });
    }

    // Calculate the new value directly
    const newValue = calculateStableValue(
      accumulatedMovementX.current,
      e.shiftKey,
      dragState.startValue,
      min,
      max,
      step
    );

    console.log(
      "[useFigmaDrag] Calculated newValue:",
      newValue,
      "from startValue:",
      dragState.startValue,
      "distanceX:",
      accumulatedMovementX.current
    );

    // Update the current value if it changed
    if (newValue !== dragState.currentValue) {
      dispatch({ type: "UPDATE_VALUE", value: newValue });
    }
  };

  // Handle mouse movement for non-pointer-lock dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    // If pointer lock is active, handle it differently
    if (getPointerLockElement()) {
      handleLockedMouseMove(e);
      return;
    }

    // For non-pointer-lock dragging, calculate the distance moved
    const distanceX = e.clientX - dragState.startX;

    // Update direction for visual feedback
    if (distanceX > 0) {
      dispatch({ type: "SET_DIRECTION", direction: "right" });
    } else if (distanceX < 0) {
      dispatch({ type: "SET_DIRECTION", direction: "left" });
    }

    // Calculate new value
    const newValue = calculateStableValue(
      distanceX,
      e.shiftKey,
      dragState.startValue,
      min,
      max,
      step
    );

    console.log(
      "[useFigmaDrag] Calculated newValue:",
      newValue,
      "from startValue:",
      dragState.startValue,
      "distanceX:",
      distanceX
    );

    // Update value if it changed
    if (newValue !== dragState.currentValue) {
      dispatch({ type: "UPDATE_VALUE", value: newValue });
    }
  };

  // Handle drag start
  const handleDragStart = (e: MouseEvent) => {
    // Prevent default to avoid text selection and other browser behaviors
    e.preventDefault();

    // Don't start drag if disabled
    if (disabled) {
      return;
    }

    console.log(
      "[useFigmaDrag] Drag start - currentValue:",
      dragState.currentValue,
      "startValue:",
      dragState.startValue,
      "prop value:",
      value
    );

    // Reset accumulated movement from any previous drag operations
    accumulatedMovementX.current = 0;
    accumulatedMovementY.current = 0;

    // Set initial drag state - ensure we preserve the exact value from props
    // without any recalculation that might cause a jump
    dispatch({ type: "START_DRAG", x: e.clientX, value });
    console.log("[useFigmaDrag] Dispatched START_DRAG with value:", value);

    // Set up drag event handling
    if (usePointerLock && pointerLockSupported.current) {
      // Show the overlay
      const overlay = initDragOverlay();
      if (overlay) {
        overlay.style.display = "block";

        // Set up the abort controller for event cleanup
        abortControllerRef.current = new AbortController();

        // Trap cursor for more reliable dragging
        document.documentElement.classList.add("figma-input-dragging-active");
        document.body.classList.add("figma-input-dragging-active");

        // Initialize the cursor with the mouse position
        initVirtualCursor();

        // Set initial cursor position to the mouse coordinates
        const initialPos = {
          x: e.clientX,
          y: e.clientY,
        };
        initialCursorX.current = initialPos.x;
        initialCursorY.current = initialPos.y;
        dispatch({ type: "UPDATE_CURSOR", x: initialPos.x, y: initialPos.y });
        positionVirtualCursor(initialPos.x, initialPos.y);

        // Request pointer lock on the overlay
        requestLock(overlay);
      }
    } else {
      // For non-pointer-lock dragging, just add the mouse listeners
      setupMouseListeners();
    }
  };

  // Set up mouse event listeners
  const setupMouseListeners = () => {
    if (mouseEventListenerAdded.current) {
      return;
    }

    mouseEventListenerAdded.current = true;

    // Create new abort controller for event cleanup
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Add event listeners with the signal for automatic cleanup
    document.addEventListener("mousemove", handleMouseMove, { signal });
    document.addEventListener("mouseup", handleMouseUp, { signal });
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      cleanup();
    }
  };

  // Request pointer lock with a slight delay
  const requestLock = (element: HTMLElement) => {
    if (requestPending.current || isPointerLocked.current) {
      return;
    }

    requestPending.current = true;

    // Store original cursor position before pointer lock
    const originalCursorX = initialCursorX.current;
    const originalCursorY = initialCursorY.current;
    const originalPosition = dragState.virtualCursorPos;

    // Delay to avoid race conditions
    setTimeout(() => {
      try {
        requestPointerLock(element);

        // Handle pointer lock change
        const handlePointerLockChange = () => {
          const isCurrentlyLocked = !!getPointerLockElement();
          isPointerLocked.current = isCurrentlyLocked;

          if (isCurrentlyLocked && isDraggingRef.current) {
            // Successfully locked, set up mouse movement listener
            setupMouseListeners();

            // When pointer lock is activated, the browser centers the cursor
            // Calculate the center of the window
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            // Calculate offset from where cursor was to where it is after pointer lock (center)
            const offsetX = centerX - originalCursorX;
            const offsetY = centerY - originalCursorY;

            // Adjust the initial reference points to the center
            initialCursorX.current = centerX;
            initialCursorY.current = centerY;

            // Reset accumulated movement to compensate for the position jump
            accumulatedMovementX.current = -offsetX;
            accumulatedMovementY.current = -offsetY;

            // Reposition virtual cursor to original position (visual consistency)
            if (originalPosition) {
              positionVirtualCursor(originalPosition.x, originalPosition.y);
            }
          } else if (isDraggingRef.current) {
            // Lost pointer lock but still dragging, clean up
            cleanup();
          }
        };

        // Add pointer lock change listeners with cleanup
        const abortSignal = abortControllerRef.current?.signal;
        if (abortSignal) {
          document.addEventListener(
            "pointerlockchange",
            handlePointerLockChange,
            { signal: abortSignal }
          );
          document.addEventListener(
            "mozpointerlockchange",
            handlePointerLockChange,
            { signal: abortSignal }
          );
          document.addEventListener(
            "webkitpointerlockchange",
            handlePointerLockChange,
            { signal: abortSignal }
          );

          // Add pointer lock error listeners
          document.addEventListener("pointerlockerror", cleanup, {
            signal: abortSignal,
          });
          document.addEventListener("mozpointerlockerror", cleanup, {
            signal: abortSignal,
          });
          document.addEventListener("webkitpointerlockerror", cleanup, {
            signal: abortSignal,
          });
        }
      } catch (err) {
        console.error("Error requesting pointer lock:", err);
        cleanup();
      }

      requestPending.current = false;
    }, 50);
  };

  // Clean up function to completely reset pointer lock state
  const cleanup = () => {
    if (cleanupInProgress.current) {
      return;
    }

    // Set cleanup flag to prevent multiple cleanups
    cleanupInProgress.current = true;

    // Reset dragging state
    isDraggingRef.current = false;
    dispatch({ type: "END_DRAG" });

    // Reset accumulated movement
    accumulatedMovementX.current = 0;
    accumulatedMovementY.current = 0;

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

    // Abort any active event listeners
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Reset cleanup flag
    setTimeout(() => {
      cleanupInProgress.current = false;
    }, 100);
  };

  // Clean up effect
  useEffect(() => {
    return () => {
      // Clean up any active dragging when component unmounts
      cleanup();
    };
  }, []);

  return {
    dragState,
    handleDragStart,
  };
}
