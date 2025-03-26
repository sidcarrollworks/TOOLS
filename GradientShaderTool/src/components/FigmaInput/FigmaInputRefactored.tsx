import type { FunctionComponent } from "preact";
import {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "preact/hooks";
import { memo } from "preact/compat";
import styles from "./FigmaInput.module.css";
import { useFigmaDragRefactored } from "./useFigmaDragRefactored";
import { useInputHandler } from "./useInputHandler";
import { ensureCursorStyle } from "./pointerLockUtils";
import { useFigmaInputContext } from "./FigmaInputContext";

export interface FigmaInputProps {
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
  dragIcon?: string | preact.JSX.Element;
}

export const FigmaInputRefactored: FunctionComponent<FigmaInputProps> = memo(
  ({
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
    dragIcon,
  }) => {
    // Use FigmaInput context instead of global variables
    const { isPresetBeingApplied } = useFigmaInputContext();

    console.log(
      "[FigmaInput] Rendering with value:",
      value,
      "min:",
      min,
      "max:",
      max
    );

    // Add an ID for debugging
    const inputId = useRef(
      `figma-input-${Math.random().toString(36).substring(2, 9)}`
    ).current;

    // Initialize refs
    const inputRef = useRef<HTMLInputElement>(null);
    const dragIconRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // State to track if transition should be applied
    const [hasTransition, setHasTransition] = useState(false);
    // State to store the actual width value (separate from the transition state)
    const [progressWidth, setProgressWidth] = useState("0%");
    const [progressTransform, setProgressTransform] = useState("none");

    // Memoize the onChange handler
    const handleValueChange = useCallback(
      (newValue: number) => {
        console.log(
          "[FigmaInput] handleValueChange called with:",
          newValue,
          "current prop value:",
          value
        );
        onChange(newValue);
      },
      [onChange, value]
    );

    // Initialize cursor style
    ensureCursorStyle();

    // Use refactored hooks for drag and input logic
    const { dragState, handleDragStart } = useFigmaDragRefactored({
      value,
      min,
      max,
      step,
      onChange: handleValueChange,
      disabled,
      usePointerLock,
    });

    console.log("[FigmaInput] Current dragState from hook:", dragState);

    const { inputValue, handleInputChange, handleInputBlur, handleKeyPress } =
      useInputHandler({
        value,
        min,
        max,
        step,
        decimals,
        onChange: handleValueChange,
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

      console.log(
        "[FigmaInput] Recalculating progressBarStyles with value:",
        value,
        "width:",
        `${adjustedWidth}%`
      );

      return {
        width: `${adjustedWidth}%`,
        transform: "none",
      };
    }, [value, min, max]);

    // Effect to handle transition when preset is applied
    useEffect(() => {
      console.log(
        "[FigmaInput] Transition effect - isPresetBeingApplied:",
        isPresetBeingApplied,
        "width:",
        progressBarStyles.width
      );

      if (isPresetBeingApplied) {
        // First, apply the transition property
        setHasTransition(true);

        // Use requestAnimationFrame to ensure the transition property is applied
        // before changing the width
        requestAnimationFrame(() => {
          // Then update the width value
          setProgressWidth(progressBarStyles.width);
          setProgressTransform(progressBarStyles.transform);
          console.log(
            "[FigmaInput] RAF - Updated width with transition:",
            progressBarStyles.width
          );
        });

        // Remove transition after parameters have been updated
        const timeoutId = setTimeout(() => {
          setHasTransition(false);
          console.log("[FigmaInput] Timeout - Removing transition");
        }, 500); // Match the transition duration

        return () => clearTimeout(timeoutId);
      } else {
        // For regular updates (not from presets), update width immediately without transition
        setProgressWidth(progressBarStyles.width);
        setProgressTransform(progressBarStyles.transform);
        console.log(
          "[FigmaInput] Updated width without transition:",
          progressBarStyles.width
        );
      }
    }, [
      progressBarStyles.width,
      progressBarStyles.transform,
      isPresetBeingApplied,
    ]);

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
            {dragIcon ? (
              // if dragIcon is a string wrap it in a span
              typeof dragIcon === "string" ? (
                <span>{dragIcon}</span>
              ) : (
                dragIcon
              )
            ) : (
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
            )}
          </div>
          <div
            ref={progressBarRef}
            className={`${styles.progressBar} ${
              isDragging ? styles.dragging : ""
            } ${hasTransition ? styles.withTransition : ""}`}
            style={{
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
  }
);
