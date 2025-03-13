import type { FunctionComponent } from "preact";
import { useRef, useMemo, useEffect, useState } from "preact/hooks";
import styles from "./FigmaInput.module.css";
import { useFigmaDrag } from "./useFigmaDrag";
import { useInputHandler } from "./useInputHandler";
import { ensureCursorStyle } from "./pointerLockUtils";

// Global state to track when a preset is being applied
let isPresetBeingApplied = false;

// Function to set the preset application state
export const setPresetApplying = (applying: boolean) => {
  isPresetBeingApplied = applying;
};

interface FigmaInputProps {
  label?: string | preact.JSX.Element;
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
  usePointerLock = true,
}) => {
  // Add an ID for debugging
  const inputId = useRef(
    `figma-input-${Math.random().toString(36).substring(2, 9)}`
  ).current;

  console.log(`[${inputId}] Rendering FigmaInput with label:`, label);
  console.log(
    `[${inputId}] Label is JSX:`,
    typeof label !== "string" && label !== undefined
  );

  // Initialize refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIconRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // State to track if transition should be applied
  const [hasTransition, setHasTransition] = useState(false);
  // State to store the actual width value (separate from the transition state)
  const [progressWidth, setProgressWidth] = useState("0%");
  const [progressTransform, setProgressTransform] = useState("none");

  // Initialize cursor style
  ensureCursorStyle();

  // Use hooks for drag and input logic
  const { dragState, handleDragStart } = useFigmaDrag({
    value,
    min,
    max,
    step,
    onChange,
    disabled,
    usePointerLock,
  });

  const { inputValue, handleInputChange, handleInputBlur, handleKeyPress } =
    useInputHandler({
      value,
      min,
      max,
      step,
      decimals,
      onChange,
    });

  const { isDragging, dragDirection } = dragState;

  // Calculate progress bar styles based on value, min, and max
  const progressBarStyles = useMemo(() => {
    // Normalize the value to a percentage
    const range = max - min;
    const normalizedValue = Math.max(0, Math.min(1, (value - min) / range));

    // For all ranges, simply use the normalized value
    // Adjust the width to account for the drag icon (24px) and padding
    const adjustedWidth = normalizedValue * 100;

    return {
      width: `${adjustedWidth}%`,
      transform: "none",
    };
  }, [value, min, max]);

  // Effect to handle transition when preset is applied
  useEffect(() => {
    if (isPresetBeingApplied) {
      // First, apply the transition property
      setHasTransition(true);

      // Use requestAnimationFrame to ensure the transition property is applied
      // before changing the width
      requestAnimationFrame(() => {
        // Then update the width value
        setProgressWidth(progressBarStyles.width);
        setProgressTransform(progressBarStyles.transform);
      });

      // Remove transition after parameters have been updated
      const timeoutId = setTimeout(() => {
        setHasTransition(false);
      }, 500); // Match the transition duration

      return () => clearTimeout(timeoutId);
    } else {
      // For regular updates (not from presets), update width immediately without transition
      setProgressWidth(progressBarStyles.width);
      setProgressTransform(progressBarStyles.transform);
    }
  }, [progressBarStyles.width, progressBarStyles.transform]);

  return (
    <div
      className={`${styles.figmaInput} ${className} ${
        disabled ? styles.disabled : ""
      }`}
    >
      {label && (
        <label className={styles.label} data-figma-input-id={inputId}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <div
          ref={dragIconRef}
          className={`${styles.dragIcon}`}
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
        <div
          ref={progressBarRef}
          className={`${styles.progressBar} ${
            isDragging ? styles.dragging : ""
          }`}
          style={{
            transition: hasTransition
              ? "width 0.2s ease, transform 0.2s ease"
              : "none",
            width: progressWidth,
            transform: progressTransform,
          }}
        />
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
