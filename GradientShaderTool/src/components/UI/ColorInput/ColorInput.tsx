import { useState, useRef, useEffect } from "preact/hooks";
import { type FunctionComponent } from "preact";
import styles from "./ColorInput.module.css";
import { useDebounce } from "../../../lib/hooks/useDebounce";

/**
 * Props for ColorInput component
 */
export interface ColorInputProps {
  /**
   * Current color value in hex format (e.g., #FF5733)
   */
  value: string;

  /**
   * Callback when color changes
   */
  onChange: (value: string) => void;

  /**
   * Label for the color input
   */
  label?: string;

  /**
   * Whether the input is disabled
   */
  disabled?: boolean;

  /**
   * Debounce delay in ms (0 for no debounce)
   */
  debounce?: number;

  /**
   * Number of recent colors to show
   */
  recentColorsCount?: number;

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
 * Storage key for recent colors
 */
const RECENT_COLORS_KEY = "gradientShaderToolRecentColors";

/**
 * Maximum number of recent colors to store
 */
const MAX_RECENT_COLORS = 10;

/**
 * Regular expression for validating hex color codes
 */
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * ColorInput component with color swatch, hex input, and recent colors
 */
export const ColorInput: FunctionComponent<ColorInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  debounce = 0,
  recentColorsCount = 5,
  className = "",
  id,
  ariaLabel,
}) => {
  // Create a unique ID for this input if not provided
  const inputId =
    id || `color-input-${Math.random().toString(36).substring(2, 9)}`;

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // State
  const [inputValue, setInputValue] = useState(value);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [showRecentColors, setShowRecentColors] = useState(false);

  /**
   * Create a debounced version of the onChange callback
   */
  const debouncedOnChange = useDebounce((newValue: string) => {
    if (HEX_COLOR_REGEX.test(newValue)) {
      onChange(newValue);
      addToRecentColors(newValue);
    }
  }, debounce);

  /**
   * Initialize recent colors from local storage
   */
  useEffect(() => {
    try {
      const storedColors = localStorage.getItem(RECENT_COLORS_KEY);
      if (storedColors) {
        const parsedColors = JSON.parse(storedColors);
        if (Array.isArray(parsedColors)) {
          setRecentColors(parsedColors.slice(0, MAX_RECENT_COLORS));
        }
      }
    } catch (error) {
      console.error("Failed to load recent colors:", error);
    }
  }, []);

  /**
   * Update input value when value prop changes
   */
  useEffect(() => {
    setInputValue(value);
    setIsValid(HEX_COLOR_REGEX.test(value));
  }, [value]);

  /**
   * Add a color to the recent colors list
   */
  const addToRecentColors = (color: string) => {
    if (!HEX_COLOR_REGEX.test(color)) return;

    try {
      // Create a new array with the new color at the beginning
      const newRecentColors = [
        color,
        ...recentColors.filter((c) => c !== color),
      ].slice(0, MAX_RECENT_COLORS);
      setRecentColors(newRecentColors);

      // Save to local storage
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(newRecentColors));
    } catch (error) {
      console.error("Failed to save recent colors:", error);
    }
  };

  /**
   * Handle input change from the text field
   */
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newValue = target.value;

    // Always update the input field
    setInputValue(newValue);

    // Validate the input
    const isValidColor = HEX_COLOR_REGEX.test(newValue);
    setIsValid(isValidColor);

    // Only update the actual color if it's valid
    if (isValidColor) {
      if (debounce > 0) {
        debouncedOnChange(newValue);
      } else {
        onChange(newValue);
        addToRecentColors(newValue);
      }
    }
  };

  /**
   * Handle color change from the color picker
   */
  const handleColorPickerChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newValue = target.value;

    setInputValue(newValue);
    setIsValid(true);

    if (debounce > 0) {
      debouncedOnChange(newValue);
    } else {
      onChange(newValue);
      addToRecentColors(newValue);
    }
  };

  /**
   * Handle click on color swatch
   */
  const handleSwatchClick = () => {
    if (disabled) return;

    // Open the native color picker
    if (colorPickerRef.current) {
      colorPickerRef.current.click();
    }
  };

  /**
   * Handle click on a recent color
   */
  const handleRecentColorClick = (color: string) => {
    if (disabled) return;

    setInputValue(color);
    setIsValid(true);
    onChange(color);
    setShowRecentColors(false);
  };

  /**
   * Toggle recent colors panel
   */
  const toggleRecentColors = () => {
    if (disabled || recentColors.length === 0) return;
    setShowRecentColors(!showRecentColors);
  };

  /**
   * Get CSS class for the component
   */
  const getComponentClass = () => {
    return `${styles.colorInput} ${disabled ? styles.disabled : ""} ${
      !isValid ? styles.invalid : ""
    } ${className}`;
  };

  return (
    <div className={getComponentClass()}>
      {/* Label */}
      {label && (
        <label className={styles.colorInputLabel} htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className={styles.colorInputControls}>
        {/* Color Swatch */}
        <div
          className={styles.colorSwatch}
          style={{ backgroundColor: isValid ? inputValue : "#FF0000" }}
          onClick={handleSwatchClick}
        >
          {!isValid && <span className={styles.swatchError}>!</span>}
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={styles.colorTextInput}
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
          maxLength={7}
          aria-label={ariaLabel || label || "Color hex value"}
        />

        {/* Native Color Picker (hidden) */}
        <input
          ref={colorPickerRef}
          type="color"
          className={styles.colorPickerInput}
          value={isValid ? inputValue : "#FF0000"}
          onChange={handleColorPickerChange}
          disabled={disabled}
        />

        {/* Recent Colors Button */}
        {/* {recentColors.length > 0 && (
          <button
            type="button"
            className={styles.recentColorsButton}
            onClick={toggleRecentColors}
            disabled={disabled}
            aria-label="Show recent colors"
            aria-expanded={showRecentColors}
          >
            <span className={styles.recentColorsIcon}>▼</span>
          </button>
        )} */}
      </div>

      {/* Recent Colors Panel */}
      {showRecentColors && (
        <div className={styles.recentColorsPanel}>
          {recentColors.slice(0, recentColorsCount).map((color) => (
            <button
              key={color}
              type="button"
              className={styles.recentColorItem}
              style={{ backgroundColor: color }}
              onClick={() => handleRecentColorClick(color)}
              aria-label={`Use color ${color}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
