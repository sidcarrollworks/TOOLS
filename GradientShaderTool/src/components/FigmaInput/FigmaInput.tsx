import type { FunctionComponent, JSX } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import styles from "./FigmaInput.module.css";

interface FigmaInputProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  usePointerLock?: boolean;
}

// Create a single shared overlay element for all instances
let dragOverlay: HTMLDivElement | null = null;
let virtualCursor: HTMLDivElement | null = null;
let activeInstance: symbol | null = null;

// Custom cursor SVG as a data URL
const cursorSvgDataUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='19' height='11' viewBox='0 0 19 11' fill='none'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M0.5 5.15837V5.16267L5.66494 10.3268L5.66581 6.8826H10.2487H13.8497V10.3276L19 5.15923L13.8497 -0.00743954L13.8506 3.45394L10.2487 3.45567H5.66494L5.66581 -0.00830078L0.5 5.15837ZM1.71523 5.16095L4.80455 2.07077L4.80369 4.29883H10.2487H14.7118V2.07249L17.7822 5.16095L14.7127 8.24855L14.7118 6.0222H10.2487L4.80455 6.02134L4.80369 8.24855L1.71523 5.16095Z' fill='white'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7.81818 6.02177H14.7119V8.24898L17.7823 5.16052L14.7119 2.07292V4.31649H7.81818H4.80379V2.0712L1.71533 5.16052L4.80379 8.24898V6.02091L7.81818 6.02177Z' fill='black'/%3E%3C/svg%3E`;

// Create a direct style tag for ensuring consistent cursor
const ensureCursorStyle = () => {
  const styleId = "figma-input-drag-style";
  if (document.getElementById(styleId)) return;

  const styleTag = document.createElement("style");
  styleTag.id = styleId;
  styleTag.textContent = `
    html.figma-input-dragging-active,
    html.figma-input-dragging-active *,
    body.figma-input-dragging-active,
    body.figma-input-dragging-active * {
      cursor: none !important;
      user-select: none !important;
    }
    
    .figma-input-drag-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 9999 !important;
      background-color: transparent !important;
      cursor: none !important;
      user-select: none !important;
      pointer-events: all !important;
      touch-action: none !important;
    }
    
    .figma-input-virtual-cursor {
      position: fixed !important;
      width: 19px !important;
      height: 11px !important;
      pointer-events: none !important;
      z-index: 10000 !important;
      transform: translate(-50%, -50%) !important;
      background-image: url("${cursorSvgDataUrl}");
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
      filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) !important;
    }
    
    /* Add cursor hiding style for entire document during pointer lock */
    html.figma-input-pointer-lock-active,
    html.figma-input-pointer-lock-active * {
      cursor: none !important;
    }
  `;

  document.head.appendChild(styleTag);
};

// Initialize the overlay element
const initDragOverlay = () => {
  if (dragOverlay) return dragOverlay;

  // Ensure the cursor style is added
  ensureCursorStyle();

  dragOverlay = document.createElement("div");
  dragOverlay.className = "figma-input-drag-overlay";

  // Apply all styles directly to the element
  Object.assign(dragOverlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "9999",
    backgroundColor: "transparent",
    cursor: "none",
    userSelect: "none",
    pointerEvents: "all",
    touchAction: "none",
    display: "none",
  });

  document.body.appendChild(dragOverlay);

  // Verify the overlay was added to the DOM
  if (!document.body.contains(dragOverlay)) {
    console.error("Failed to append drag overlay to document body");
    return null;
  }

  return dragOverlay;
};

// Initialize virtual cursor element
const initVirtualCursor = () => {
  // If the cursor already exists, remove it first to avoid duplicates
  if (virtualCursor) {
    try {
      document.body.removeChild(virtualCursor);
    } catch (e) {
      // Ignore if not in DOM
    }
    virtualCursor = null;
  }

  // Create a new cursor element
  virtualCursor = document.createElement("div");
  virtualCursor.className = "figma-input-virtual-cursor";

  // Style the virtual cursor
  Object.assign(virtualCursor.style, {
    position: "fixed",
    width: "19px",
    height: "11px",
    pointerEvents: "none",
    zIndex: "10000",
    transform: "translate(-50%, -50%)",
    backgroundImage: `url("${cursorSvgDataUrl}")`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    filter: "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5))",
    display: "none",
  });

  document.body.appendChild(virtualCursor);
  return virtualCursor;
};

// Position the virtual cursor
const positionVirtualCursor = (x: number, y: number) => {
  // Ensure cursor exists
  const cursor = virtualCursor || initVirtualCursor();
  if (!cursor) {
    console.warn("⚠️ Failed to initialize virtual cursor");
    return;
  }

  // Update position and ensure it's visible
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  cursor.style.display = "block";

  // Log position occasionally to avoid console spam
  if (Math.random() < 0.05) {
    console.log("🖱️ Virtual cursor positioned at:", { x, y });
  }
};

// Hide the virtual cursor
const hideVirtualCursor = () => {
  if (virtualCursor) {
    virtualCursor.style.display = "none";
  }
};

// Check if Pointer Lock API is supported by the browser
const isPointerLockSupported = () => {
  return (
    "pointerLockElement" in document ||
    "mozPointerLockElement" in document ||
    "webkitPointerLockElement" in document
  );
};

// Helper function to get the current pointer lock element with vendor prefixes
const getPointerLockElement = (): Element | null => {
  return (
    document.pointerLockElement ||
    (document as any).mozPointerLockElement ||
    (document as any).webkitPointerLockElement
  );
};

// Helper function to exit pointer lock with vendor prefixes
const exitPointerLock = () => {
  try {
    console.log("🔓 Exiting pointer lock");
    if (document.exitPointerLock) {
      document.exitPointerLock();
    } else if ((document as any).mozExitPointerLock) {
      (document as any).mozExitPointerLock();
    } else if ((document as any).webkitExitPointerLock) {
      (document as any).webkitExitPointerLock();
    }
  } catch (err) {
    console.error("❌ Error exiting pointer lock:", err);
  }
};

// Helper function to request pointer lock with vendor prefixes
const requestPointerLock = (element: Element) => {
  try {
    // Only request if we don't already have a pointer lock
    if (!getPointerLockElement()) {
      console.log("🔒 Requesting pointer lock");
      if (element.requestPointerLock) {
        element.requestPointerLock();
      } else if ((element as any).mozRequestPointerLock) {
        (element as any).mozRequestPointerLock();
      } else if ((element as any).webkitRequestPointerLock) {
        (element as any).webkitRequestPointerLock();
      }
    } else {
      console.log("⚠️ Pointer lock already active, not requesting again");
    }
  } catch (err) {
    console.error("❌ Error requesting pointer lock:", err);
  }
};

// Force cursor to be visible
const forceCursorVisible = () => {
  console.log("👆 Forcing cursor to be visible");
  document.documentElement.classList.remove("figma-input-pointer-lock-active");
  document.documentElement.classList.remove("figma-input-dragging-active");
  document.body.classList.remove("figma-input-dragging-active");

  // Force cursor to be visible with a temporary style
  const styleElement = document.createElement("style");
  styleElement.textContent = "* { cursor: auto !important; }";
  document.head.appendChild(styleElement);

  // Remove the style element after a short delay
  setTimeout(() => {
    if (styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
      console.log("👆 Removed temporary cursor style");
    }
  }, 100);
};

export const FigmaInput: FunctionComponent<FigmaInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  decimals = 1,
  onChange,
  disabled = false,
  className = "",
  usePointerLock = true, // Default to true for the pointer lock functionality
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toFixed(decimals));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startValue, setStartValue] = useState<number>(value);
  const [currentValue, setCurrentValue] = useState<number>(value);
  const [dragDirection, setDragDirection] = useState<"none" | "left" | "right">(
    "none"
  );
  const [virtualCursorPos, setVirtualCursorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragIconRef = useRef<HTMLDivElement>(null);
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

  // Helper to add pointer lock class to document
  const setPointerLockActiveState = (active: boolean) => {
    if (active) {
      document.documentElement.classList.add("figma-input-pointer-lock-active");
    } else {
      document.documentElement.classList.remove(
        "figma-input-pointer-lock-active"
      );
    }
  };

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
    console.log("🧹 Cleaning up pointer lock state");

    // Prevent multiple cleanups
    if (cleanupInProgress.current) {
      console.log("🧹 Cleanup already in progress, skipping");
      return;
    }

    cleanupInProgress.current = true;

    // Cancel any pending animation frames
    if (frameId.current !== null) {
      console.log("🧹 Canceling animation frame:", frameId.current);
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
    if (dragOverlay) {
      dragOverlay.style.display = "none";
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

    console.log("🧹 Cleanup complete");
  };

  // Setup and cleanup on mount/unmount
  useEffect(() => {
    console.log("🏁 Component mounted, initializing");
    initDragOverlay();
    if (usePointerLock) {
      initVirtualCursor();
    }
    ensureCursorStyle();

    return () => {
      console.log("🏁 Component unmounting, cleaning up");
      cleanupPointerLock();
      activeInstance = null;
    };
  }, []);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value.toFixed(decimals));
    setCurrentValue(value);
  }, [value, decimals]);

  // Handle value changes during dragging
  useEffect(() => {
    if (isDragging && currentValue !== value) {
      onChange(currentValue);
    }
  }, [currentValue, isDragging, onChange, value]);

  // Setup pointer lock when dragging starts - SPLIT INTO TWO EFFECTS
  // Effect 1: Handle pointer lock setup and teardown
  useEffect(() => {
    if (!isDragging || !usePointerLock || !pointerLockSupported.current) {
      if (isDragging) {
        console.log("🔄 Dragging started but pointer lock not used:", {
          usePointerLock,
          pointerLockSupported: pointerLockSupported.current,
        });
      }
      return;
    }

    console.log("🔄 Dragging started with pointer lock");

    // Set this instance as the active one
    activeInstance = instanceId;

    // Reset accumulated movement
    accumulatedMovementX.current = 0;

    // Position the virtual cursor at the mouse position initially
    if (virtualCursorPos && virtualCursor) {
      console.log("🖱️ Positioning virtual cursor at:", virtualCursorPos);
      positionVirtualCursor(virtualCursorPos.x, virtualCursorPos.y);
    } else {
      console.warn("⚠️ Cannot position virtual cursor, missing data:", {
        virtualCursor: !!virtualCursor,
        virtualCursorPos,
      });
    }

    // Add a class to show we're dragging
    document.documentElement.classList.add("figma-input-dragging-active");
    document.body.classList.add("figma-input-dragging-active");

    // Show the overlay (needed as the lockable element)
    if (dragOverlay) {
      console.log("🔄 Showing drag overlay");
      dragOverlay.style.display = "block";
    } else {
      console.warn("⚠️ Drag overlay not found");
    }

    // Handle pointer lock changes
    const handlePointerLockChange = () => {
      const lockElement = getPointerLockElement();

      if (lockElement) {
        console.log("🔒 Pointer lock acquired on:", lockElement);
        // Pointer lock acquired
        setPointerLockActiveState(true);
        isPointerLocked.current = true;

        // Only add the event listener once
        if (!mouseEventListenerAdded.current) {
          console.log("🖱️ Adding mouse move event listener");
          document.addEventListener("mousemove", handleLockedMouseMove);
          mouseEventListenerAdded.current = true;
        }
      } else {
        console.log("🔓 Pointer lock released");
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
    const handlePointerLockError = (e: Event) => {
      console.error("❌ Pointer lock error:", e);
      if (mouseEventListenerAdded.current) {
        document.removeEventListener("mousemove", handleLockedMouseMove);
        mouseEventListenerAdded.current = false;
      }
      isPointerLocked.current = false;
    };

    // Handle mouse up to end dragging
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) {
        console.log("👆 Mouse up ignored, not dragging");
        return;
      }

      console.log("👆 Mouse up detected, ending drag");

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
    console.log("🔄 Adding pointer lock event listeners");
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
      console.log("🔄 Removing pointer lock event listeners");
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

  // Effect 2: Handle mouse movement and value calculation
  // This is in a separate effect to avoid re-renders causing pointer lock to be released
  const handleLockedMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    // Get the movement from the pointer lock API
    const movementX = e.movementX || 0;
    const movementY = e.movementY || 0;

    // Log movement data occasionally (not every frame to avoid console spam)
    if (Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
      console.log("🖱️ Mouse movement:", { movementX, movementY });
    }

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
      console.log("🖱️ Initialized virtual cursor position:", initialPos);
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
      console.log("⏳ Not requesting pointer lock:", {
        requestPending: requestPending.current,
        isDragging: isDraggingRef.current,
        isPointerLocked: isPointerLocked.current,
      });
      return;
    }

    console.log("⏳ Preparing to request pointer lock");
    requestPending.current = true;

    // Use requestAnimationFrame for better timing
    frameId.current = requestAnimationFrame(() => {
      console.log("⏳ Animation frame fired, requesting pointer lock");
      if (isDraggingRef.current && dragOverlay && !isPointerLocked.current) {
        try {
          requestPointerLock(dragOverlay);
        } catch (err) {
          console.error("❌ Failed to request pointer lock:", err);
          requestPending.current = false;
        }
      } else {
        console.log("⏳ Conditions changed, not requesting pointer lock:", {
          isDragging: isDraggingRef.current,
          dragOverlay: !!dragOverlay,
          isPointerLocked: isPointerLocked.current,
        });
        requestPending.current = false;
      }
    });
  };

  // Handle input change
  const handleInputChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setInputValue(newValue);
  };

  // Handle input blur - validate and update the value
  const handleInputBlur = () => {
    let newValue = parseFloat(inputValue);

    // Handle invalid input
    if (isNaN(newValue)) {
      newValue = currentValue;
      setInputValue(currentValue.toFixed(decimals));
      return;
    }

    // Clamp the value between min and max
    newValue = Math.max(min, Math.min(max, newValue));

    // Round to the nearest step
    newValue = Math.round((newValue - min) / step) * step + min;

    // Update the input value and call the onChange callback
    setInputValue(newValue.toFixed(decimals));
    setCurrentValue(newValue);
    onChange(newValue);
  };

  // Handle key press - validate and update on Enter
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputBlur();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setInputValue(currentValue.toFixed(decimals));
      inputRef.current?.blur();
    }
  };

  // Handle drag start
  const handleDragStart = (e: MouseEvent) => {
    if (disabled) return;

    console.log("👇 Drag start detected");

    // Cancel any previous animation frame
    if (frameId.current !== null) {
      console.log("🧹 Canceling previous animation frame:", frameId.current);
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

    console.log("👇 Drag started:", {
      clientX: e.clientX,
      startValue: currentValue,
      usePointerLock,
      pointerLockSupported: pointerLockSupported.current,
    });

    // Store the initial cursor position for virtual cursor
    const initialPos = { x: e.clientX, y: e.clientY };
    setVirtualCursorPos(initialPos);

    // Ensure virtual cursor is initialized and visible
    if (usePointerLock && pointerLockSupported.current) {
      // Force cursor initialization
      const cursor = initVirtualCursor();

      // Immediately position and show the cursor
      if (cursor) {
        positionVirtualCursor(initialPos.x, initialPos.y);
        console.log(
          "🖱️ Virtual cursor initialized and positioned at start:",
          initialPos
        );
      }
    }

    // Prevent text selection during drag
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`${styles.figmaInput} ${className} ${
        disabled ? styles.disabled : ""
      }`}
    >
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        <div
          ref={dragIconRef}
          className={`${styles.dragIcon} ${isDragging ? styles.dragging : ""} ${
            styles[`direction-${dragDirection}`]
          }`}
          onMouseDown={handleDragStart}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m9 7-5 5 5 5" />
            <path d="m15 7 5 5-5 5" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyPress}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
