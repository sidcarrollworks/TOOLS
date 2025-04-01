import type { FunctionComponent } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import styles from "./ColorPickerPopover.module.css";
import { Trash } from "../UI/Icons";

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
  position: { x: number; y: number };
  onDelete: () => void;
}

// --- New Color Conversion Functions (RGB/HSV/Hex) ---

// Convert Hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  // Default to black if invalid hex
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
    return { r: 0, g: 0, b: 0 };
  }

  let cleanHex = hex.slice(1);
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return { r, g, b };
};

// Convert RGB to Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (val: number) => {
    const hex = Math.round(val * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Convert RGB to HSV
const rgbToHsv = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = max === 0 ? 0 : delta / max;
  let v = max;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      // max === b
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, v };
};

// Convert HSV to RGB
const hsvToRgb = (
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } => {
  h = h % 360;
  if (h < 0) h += 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));

  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return { r, g, b };
};

// --- End New Color Conversion Functions ---

// Convert hex to HSL - KEEPING OLD ONES FOR REFERENCE OR POTENTIAL FALLBACK (but commented out)
/*
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  // ... existing HSL code ...
};

const hslToHex = (h: number, s: number, l: number): string => {
  // ... existing HSL code ...
};
*/

export const ColorPickerPopover: FunctionComponent<ColorPickerPopoverProps> = ({
  color,
  onChange,
  position,
  onDelete,
}) => {
  // Convert initial hex color to RGB then HSV
  const initialRgb = hexToRgb(color);
  const initialHsv = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);

  // State - using HSV model
  const [hue, setHue] = useState(initialHsv.h);
  const [saturation, setSaturation] = useState(initialHsv.s);
  const [value, setValue] = useState(initialHsv.v); // Changed from lightness
  const [hexValue, setHexValue] = useState(color);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const popoverRef = useRef<HTMLDivElement>(null);
  const saturationFieldRef = useRef<HTMLDivElement>(null);
  const saturationHandleRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const hueHandleRef = useRef<HTMLDivElement>(null);

  // Track if the change is from the parent
  const isExternalUpdate = useRef(false);

  // Mount/unmount logging - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[ColorPickerPopover] Mounted");
      return () => console.log("[ColorPickerPopover] Unmounting");
    }
  }, []);

  // Update HSV when color prop changes (Hex -> RGB -> HSV)
  useEffect(() => {
    if (color !== hexValue) {
      isExternalUpdate.current = true;
      const newRgb = hexToRgb(color);
      const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
      setHue(newHsv.h);
      setSaturation(newHsv.s);
      setValue(newHsv.v); // Update value state
      setHexValue(color);
    }
  }, [color]);

  // Update color on HSV changes (HSV -> RGB -> Hex)
  useEffect(() => {
    const newRgb = hsvToRgb(hue, saturation, value);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);

    // Log the values for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[ColorPickerPopover] HSV Update: H=${hue.toFixed(
          1
        )}, S=${saturation.toFixed(3)}, V=${value.toFixed(3)} => Hex=${newHex}`
      );
    }

    if (newHex !== hexValue) {
      setHexValue(newHex);

      // Only call onChange if this wasn't triggered by an external update
      if (!isExternalUpdate.current) {
        onChange(newHex);
      } else {
        isExternalUpdate.current = false;
      }
    }
  }, [hue, saturation, value]); // Depend on value state

  // Update HSV when hex input changes (Hex -> RGB -> HSV)
  const updateFromHexInput = (newHexValue: string) => {
    if (/^#([A-Fa-f0-9]{6})$/.test(newHexValue) && newHexValue !== hexValue) {
      const newRgb = hexToRgb(newHexValue);
      const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
      setHue(newHsv.h);
      setSaturation(newHsv.s);
      setValue(newHsv.v); // Update value state
    }
  };

  // Handle saturation/value field click and drag
  const handleSaturationFieldInteraction = (e: MouseEvent) => {
    if (!saturationFieldRef.current) return;

    const rect = saturationFieldRef.current.getBoundingClientRect();

    // Calculate saturation (X) and value (Y) based on click position
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(
      0,
      Math.min(1, 1 - (e.clientY - rect.top) / rect.height)
    ); // Y maps to value (inverted)

    setSaturation(s);
    setValue(v); // Update value state
  };

  // Handle hue slider click and drag
  const handleHueSliderInteraction = (e: MouseEvent) => {
    if (!hueSliderRef.current) return;

    const rect = hueSliderRef.current.getBoundingClientRect();
    const newHue = Math.max(
      0,
      Math.min(360, (360 * (e.clientX - rect.left)) / rect.width)
    );

    setHue(newHue);
  };

  // Handle mouse down on saturation field
  const handleSaturationMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Set both state and ref for tracking drag state
    setIsDragging(true);

    handleSaturationFieldInteraction(e);

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleSaturationFieldInteraction(e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Clean up event listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Set a small delay before clearing the dragging state to ensure
      // any click events are processed while still in dragging state
      setTimeout(() => {
        setIsDragging(false);
      }, 50); // Small delay to ensure click events are properly handled
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle mouse down on hue slider (similar pattern)
  const handleHueMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Set both state and ref for tracking drag state
    setIsDragging(true);

    handleHueSliderInteraction(e);

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleHueSliderInteraction(e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Clean up event listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Set a small delay before clearing the dragging state to ensure
      // any click events are processed while still in dragging state
      setTimeout(() => {
        setIsDragging(false);
      }, 50); // Small delay to ensure click events are properly handled
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle hex input change
  const handleHexChange = (e: Event) => {
    e.stopPropagation(); // Prevent click from bubbling to document
    const target = e.target as HTMLInputElement;
    let value = target.value;

    // Add # if missing
    if (value && !value.startsWith("#")) {
      value = "#" + value;
    }

    setHexValue(value);
    updateFromHexInput(value);
  };

  // Handle hex input blur - validate and format
  const handleHexBlur = (e: Event) => {
    e.stopPropagation(); // Prevent click from bubbling to document
    if (!/^#([A-Fa-f0-9]{6})$/.test(hexValue)) {
      const currentRgb = hsvToRgb(hue, saturation, value);
      setHexValue(rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b));
    }
  };

  // Calculate saturation handle position
  const saturationHandleStyle = {
    left: `${saturation * 100}%`,
    top: `${(1 - value) * 100}%`, // Use value for vertical position
  };

  // Calculate hue handle position
  const hueHandleStyle = {
    left: `${(hue / 360) * 100}%`,
  };

  return (
    <div
      className={styles.popover}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
      }}
      ref={popoverRef}
      data-popover-root="color-picker"
      data-is-dragging={isDragging ? "true" : "false"}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Saturation/Value Field */}
      <div
        className={styles.saturationField}
        ref={saturationFieldRef}
        onMouseDown={handleSaturationMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: `hsl(${hue}, 100%, 50%)`, // Base hue color
        }}
      >
        <div
          className={styles.saturationHandle}
          ref={saturationHandleRef}
          style={saturationHandleStyle}
        >
          <div
            className={styles.handleInner}
            style={{ backgroundColor: hexValue }}
          />
        </div>
      </div>

      {/* Hue Slider */}
      <div className={styles.controlsRow} onClick={(e) => e.stopPropagation()}>
        <div
          className={styles.hueSlider}
          ref={hueSliderRef}
          onMouseDown={handleHueMouseDown}
        >
          <div
            className={styles.hueHandle}
            ref={hueHandleRef}
            style={hueHandleStyle}
          />
        </div>
        <div className={styles.hueValue}>{Math.round(hue)}°</div>
      </div>

      {/* Hex Input */}
      <div className={styles.controlsRow} onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          className={styles.hexInput}
          value={hexValue}
          onInput={handleHexChange}
          onBlur={handleHexBlur}
          maxLength={7}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className={styles.deleteButton}
          onClick={onDelete}
          title="Delete color stop"
        >
          <Trash size={14} />
        </button>
      </div>
    </div>
  );
};
