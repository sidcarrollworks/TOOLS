import { useState, useEffect, useRef } from "preact/hooks";
import { type FunctionComponent } from "preact";
import "./StandardSlider.css";
import { useDebounce } from "../../../lib/hooks/useDebounce";

/**
 * Props for StandardSlider component
 */
export interface StandardSliderProps {
  /**
   * Current value of the slider
   */
  value: number;

  /**
   * Callback when value changes
   */
  onChange: (value: number) => void;

  /**
   * Minimum value
   */
  min?: number;

  /**
   * Maximum value
   */
  max?: number;

  /**
   * Step size
   */
  step?: number;

  /**
   * Number of decimal places to display
   */
  decimals?: number;

  /**
   * Label for the slider
   */
  label?: string;

  /**
   * Debounce delay in ms (0 for no debounce)
   */
  debounce?: number;

  /**
   * Whether to fire onChange continuously during drag
   */
  continuous?: boolean;

  /**
   * Size variant
   */
  size?: "small" | "medium" | "large";

  /**
   * Whether the slider is disabled
   */
  disabled?: boolean;

  /**
   * Format function for the displayed value
   */
  formatValue?: (value: number) => string;

  /**
   * Additional CSS class
   */
  className?: string;

  /**
   * ID for the input element
   */
  id?: string;

  /**
   * ARIA label
   */
  ariaLabel?: string;
}

/**
 * StandardSlider component
 *
 * A consistent slider component with support for debouncing and continuous/discrete updates
 */
export const StandardSlider: FunctionComponent<StandardSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  decimals = 1,
  label,
  debounce = 0,
  continuous = true,
  size = "medium",
  disabled = false,
  formatValue,
  className = "",
  id,
  ariaLabel,
}) => {
  // Generate an ID if not provided
  const inputId = useRef<string>(
    id || `slider-${Math.random().toString(36).substring(2, 9)}`
  ).current;

  // Track internal value state for dragging
  const [internalValue, setInternalValue] = useState<number>(value);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Create debounced version of onChange if needed
  const debouncedOnChange = useDebounce(onChange, debounce);

  // Calculate percentage for the fill bar
  const fillPercentage = ((internalValue - min) / (max - min)) * 100;

  // Format the displayed value
  const formattedValue = formatValue
    ? formatValue(internalValue)
    : internalValue.toFixed(
        // Show decimals only when needed
        Number.isInteger(internalValue) ? 0 : decimals
      );

  // Handle slider changes
  const handleChange = (e: Event) => {
    if (disabled) return;

    const target = e.target as HTMLInputElement;
    const newValue = parseFloat(target.value);

    setInternalValue(newValue);

    if (continuous) {
      debouncedOnChange(newValue);
    }
  };

  // Handle the end of dragging
  const handleDragEnd = () => {
    if (disabled) return;

    setIsDragging(false);

    // If not continuous, only update on drag end
    if (!continuous) {
      debouncedOnChange(internalValue);
    }
  };

  // Update internal value when prop changes (unless dragging)
  useEffect(() => {
    if (!isDragging) {
      setInternalValue(value);
    }
  }, [value, isDragging]);

  return (
    <div
      className={`standard-slider ${size} ${
        disabled ? "disabled" : ""
      } ${className}`}
    >
      {label && <label htmlFor={inputId}>{label}</label>}

      <div className="slider-row">
        <div className="slider-container">
          <input
            id={inputId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={internalValue}
            disabled={disabled}
            aria-label={ariaLabel || label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={internalValue}
            onChange={handleChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={handleDragEnd}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={handleDragEnd}
            onBlur={handleDragEnd}
          />

          <div
            className="slider-fill"
            style={{ width: `${fillPercentage}%` }}
          />
        </div>

        <div className="slider-value">{formattedValue}</div>
      </div>
    </div>
  );
};
