/**
 * Interface for a color stop in a gradient
 * Each stop has a color and a position ranging from 0.0 to 1.0
 */
export interface ColorStop {
  position: number; // Range: 0.0 to 1.0
  color: string; // Hex color string
}

/**
 * Type guard to check if an object is a valid ColorStop
 */
export function isColorStop(obj: any): obj is ColorStop {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.position === "number" &&
    obj.position >= 0 &&
    obj.position <= 1 &&
    typeof obj.color === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(obj.color)
  );
}

/**
 * Sort color stops by position (ascending)
 */
export function sortColorStops(stops: ColorStop[]): ColorStop[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

/**
 * Maximum number of color stops allowed
 */
export const MAX_COLOR_STOPS = 10;
