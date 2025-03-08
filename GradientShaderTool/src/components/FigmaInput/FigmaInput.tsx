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
}

// Create a single shared overlay element for all instances
let dragOverlay: HTMLDivElement | null = null;
let activeInstance: symbol | null = null;

// Force the cursor to be a resize cursor
const forceCursorStyle = (enable: boolean) => {
  if (enable) {
    // Apply to html and body for maximum coverage
    document.documentElement.style.setProperty(
      "cursor",
      "ew-resize",
      "important"
    );
    document.body.style.setProperty("cursor", "ew-resize", "important");
  } else {
    document.documentElement.style.removeProperty("cursor");
    document.body.style.removeProperty("cursor");
  }
};

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
      cursor: ew-resize !important;
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
      cursor: ew-resize !important;
      user-select: none !important;
      pointer-events: all !important;
      touch-action: none !important;
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
    cursor: "ew-resize",
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
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toFixed(decimals));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startValue, setStartValue] = useState<number>(value);
  const [dragDirection, setDragDirection] = useState<"none" | "left" | "right">(
    "none"
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIconRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(Symbol("FigmaInput")).current;

  // Initialize overlay on first render
  useEffect(() => {
    const overlay = initDragOverlay();
    ensureCursorStyle();

    // Cleanup on component unmount
    return () => {
      // If this instance is the active one, reset dragging state
      if (activeInstance === instanceId && overlay) {
        overlay.style.display = "none";
        document.documentElement.classList.remove(
          "figma-input-dragging-active"
        );
        document.body.classList.remove("figma-input-dragging-active");
        forceCursorStyle(false);
        activeInstance = null;
      }
    };
  }, [instanceId]);

  // Update the input value when the prop value changes
  useEffect(() => {
    setInputValue(value.toFixed(decimals));
  }, [value, decimals]);

  // Clean up event listeners when component unmounts or when dragging stops
  useEffect(() => {
    if (!isDragging) return;

    // Set this instance as the active one
    activeInstance = instanceId;

    const handleDragMove = (e: MouseEvent) => {
      // Calculate the drag distance and convert to value change
      const deltaX = e.clientX - startX;

      // Update drag direction for visual feedback
      if (deltaX > 0) {
        setDragDirection("right");
      } else if (deltaX < 0) {
        setDragDirection("left");
      }

      // Calculate sensitivity based on the range and step
      const range = max - min;
      const baseMultiplier = Math.max(0.001, step / range);

      // Adjust sensitivity based on step size and if shift key is pressed
      const sensitivity = e.shiftKey ? baseMultiplier * 0.1 : baseMultiplier;

      // Calculate value change with improved sensitivity
      const valueChange = deltaX * range * sensitivity;

      // Calculate the new value
      let newValue = startValue + valueChange;

      // Clamp the value between min and max
      newValue = Math.max(min, Math.min(max, newValue));

      // Round to the nearest step
      newValue = Math.round(newValue / step) * step;

      // Update the value
      onChange(newValue);

      // Prevent default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();

      // Force cursor style on every move
      forceCursorStyle(true);
    };

    const handleDragEnd = (e: MouseEvent) => {
      // End dragging state
      setIsDragging(false);
      setDragDirection("none");

      // Reset active instance
      activeInstance = null;

      // Hide the overlay and remove the class
      if (dragOverlay) {
        dragOverlay.style.display = "none";
      }
      document.documentElement.classList.remove("figma-input-dragging-active");
      document.body.classList.remove("figma-input-dragging-active");
      forceCursorStyle(false);

      // Prevent default behavior
      e.preventDefault();
      e.stopPropagation();
    };

    // Show the overlay
    if (dragOverlay) {
      // Force cursor style again just to be sure
      dragOverlay.style.cursor = "ew-resize";
      dragOverlay.style.display = "block";
    }

    // Add a class to the html and body as a fallback
    document.documentElement.classList.add("figma-input-dragging-active");
    document.body.classList.add("figma-input-dragging-active");
    forceCursorStyle(true);

    // Use capture phase to intercept events before they reach other elements
    document.addEventListener("mousemove", handleDragMove, { capture: true });
    document.addEventListener("mouseup", handleDragEnd, { capture: true });

    // Clean up function to remove event listeners
    return () => {
      document.removeEventListener("mousemove", handleDragMove, {
        capture: true,
      });
      document.removeEventListener("mouseup", handleDragEnd, { capture: true });

      // Only hide the overlay if this instance is still the active one
      if (activeInstance === instanceId) {
        if (dragOverlay) {
          dragOverlay.style.display = "none";
        }
        document.documentElement.classList.remove(
          "figma-input-dragging-active"
        );
        document.body.classList.remove("figma-input-dragging-active");
        forceCursorStyle(false);
        activeInstance = null;
      }
    };
  }, [isDragging, startX, startValue, min, max, step, onChange, instanceId]);

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
      newValue = value;
      setInputValue(value.toFixed(decimals));
      return;
    }

    // Clamp the value between min and max
    newValue = Math.max(min, Math.min(max, newValue));

    // Round to the nearest step
    newValue = Math.round(newValue / step) * step;

    // Update the input value and call the onChange callback
    setInputValue(newValue.toFixed(decimals));
    onChange(newValue);
  };

  // Handle key press - validate and update on Enter
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputBlur();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setInputValue(value.toFixed(decimals));
      inputRef.current?.blur();
    }
  };

  // Handle drag start
  const handleDragStart = (e: MouseEvent) => {
    if (disabled) return;

    setIsDragging(true);
    setStartX(e.clientX);
    setStartValue(value);

    // Add the dragging class to the body immediately
    document.documentElement.classList.add("figma-input-dragging-active");
    document.body.classList.add("figma-input-dragging-active");
    forceCursorStyle(true);

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
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 2L6 5L9 2M3 10L6 7L9 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
