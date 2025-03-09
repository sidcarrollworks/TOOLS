import { useState, useEffect } from "preact/hooks";
import type { JSX } from "preact";

export interface UseInputHandlerOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  onChange: (value: number) => void;
}

export function useInputHandler({
  value,
  min,
  max,
  step,
  decimals = 1,
  onChange,
}: UseInputHandlerOptions) {
  const [inputValue, setInputValue] = useState<string>(value.toFixed(decimals));
  const [currentValue, setCurrentValue] = useState<number>(value);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value.toFixed(decimals));
    setCurrentValue(value);
  }, [value, decimals]);

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
    } else if (e.key === "Escape") {
      setInputValue(currentValue.toFixed(decimals));
    }
  };

  return {
    inputValue,
    currentValue,
    handleInputChange,
    handleInputBlur,
    handleKeyPress,
  };
} 