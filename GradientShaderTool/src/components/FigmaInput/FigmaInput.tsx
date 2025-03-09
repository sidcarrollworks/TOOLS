import type { FunctionComponent } from "preact";
import { useRef, useMemo } from "preact/hooks";
import styles from "./FigmaInput.module.css";
import { useFigmaDrag } from "./useFigmaDrag";
import { useInputHandler } from "./useInputHandler";
import { ensureCursorStyle } from "./pointerLockUtils";

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
  // Initialize refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIconRef = useRef<HTMLDivElement>(null);

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

    // Determine if the range includes negative values
    const hasNegativeRange = min < 0 && max > 0;

    if (hasNegativeRange) {
      // For ranges like -1 to 1, calculate from the middle
      const zeroPoint = Math.abs(min) / range;

      if (value < 0) {
        // For negative values, start from the zero point and go left
        const width = Math.abs(value / min) * zeroPoint * 100;
        return {
          width: `${width}%`,
          transform: `translateX(${(zeroPoint - width / 100) * 100}%)`,
        };
      } else {
        // For positive values, start from the zero point and go right
        const width = (value / max) * (1 - zeroPoint) * 100;
        return {
          width: `${width}%`,
          transform: `translateX(${zeroPoint * 100}%)`,
        };
      }
    } else {
      // For ranges like 0 to 1, simply use the normalized value
      return {
        width: `${normalizedValue * 100}%`,
        transform: "none",
      };
    }
  }, [value, min, max]);

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
          className={`${styles.dragIcon} ${isDragging ? styles.dragging : ""}`}
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
          className={styles.progressBar}
          style={{
            width: progressBarStyles.width,
            transform: progressBarStyles.transform,
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
