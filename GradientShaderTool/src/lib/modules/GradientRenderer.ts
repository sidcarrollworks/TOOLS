import type { ColorStop } from "../types/ColorStop";
import { GradientMode } from "../types/ColorStop";

/**
 * Generates a CSS gradient style string based on color stops and gradient mode
 */
export function getCSSGradientStyle(
  stops: ColorStop[],
  mode: GradientMode
): string {
  // Sort stops by position for consistency
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  switch (mode) {
    case GradientMode.Linear:
      // Standard linear gradient
      return `linear-gradient(to right, ${sortedStops
        .map((stop) => `${stop.color} ${stop.position * 100}%`)
        .join(", ")})`;

    case GradientMode.Step:
      // Create step gradient by duplicating positions
      return generateStepGradientCSS(sortedStops);

    case GradientMode.SmoothStep:
      // Approximate smooth step with extra intermediate stops
      return generateSmoothStepGradientCSS(sortedStops);

    case GradientMode.BSpline:
    default:
      // For B-spline in CSS mode, default to linear as fallback
      // (Canvas will be used for actual B-spline rendering)
      return `linear-gradient(to right, ${sortedStops
        .map((stop) => `${stop.color} ${stop.position * 100}%`)
        .join(", ")})`;
  }
}

/**
 * Generates a stepped CSS gradient by duplicating color stop positions
 */
function generateStepGradientCSS(stops: ColorStop[]): string {
  if (stops.length < 2) {
    return `linear-gradient(to right, ${stops[0]?.color || "#ffffff"})`;
  }

  // Create pairs of stops with the same color but different positions
  const stepStops: string[] = [];

  for (let i = 0; i < stops.length; i++) {
    const currentStop = stops[i];
    const nextStop = stops[i + 1];

    // Add the current color at its position
    stepStops.push(`${currentStop.color} ${currentStop.position * 100}%`);

    // If there's a next stop, add current color again right before the next position
    if (nextStop) {
      // Small offset to ensure browser rendering shows a clear step
      const nextPosition = nextStop.position;
      const epsilon = 0.0001; // Small value to ensure step is visible
      stepStops.push(`${currentStop.color} ${nextPosition * 100 - epsilon}%`);
    }
  }

  return `linear-gradient(to right, ${stepStops.join(", ")})`;
}

/**
 * Approximates a smooth step gradient by adding intermediate stops
 */
function generateSmoothStepGradientCSS(stops: ColorStop[]): string {
  if (stops.length < 2) {
    return `linear-gradient(to right, ${stops[0]?.color || "#ffffff"})`;
  }

  // Standard CSS gradient - browsers already apply some easing
  // This is a simplification - for better results we'd use canvas
  return `linear-gradient(to right, ${stops
    .map((stop) => `${stop.color} ${stop.position * 100}%`)
    .join(", ")})`;
}

/**
 * Renders a gradient to a canvas element using the specified mode
 * Returns true if the rendering was successful
 */
export function renderGradientToCanvas(
  canvas: HTMLCanvasElement,
  stops: ColorStop[],
  mode: GradientMode
): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  if (sortedStops.length < 2) {
    // Single color or no stops
    if (sortedStops.length === 1) {
      ctx.fillStyle = sortedStops[0].color;
      ctx.fillRect(0, 0, width, height);
    }
    return true;
  }

  switch (mode) {
    case GradientMode.BSpline:
      renderBSplineGradient(ctx, sortedStops, width, height);
      break;

    case GradientMode.SmoothStep:
      renderSmoothStepGradient(ctx, sortedStops, width, height);
      break;

    case GradientMode.Step:
      renderStepGradient(ctx, sortedStops, width, height);
      break;

    case GradientMode.Linear:
    default:
      // For Linear mode, we can use the browser's native gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      sortedStops.forEach((stop) => {
        gradient.addColorStop(stop.position, stop.color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
  }

  return true;
}

/**
 * Renders a B-spline gradient to the canvas context
 */
function renderBSplineGradient(
  ctx: CanvasRenderingContext2D,
  stops: ColorStop[],
  width: number,
  height: number
): void {
  // Clear the canvas first to ensure no artifacts remain
  ctx.clearRect(0, 0, width, height);

  // Helper function to convert hex to rgb
  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return [r, g, b];
  };

  // Helper to calculate B-spline weight
  const bSplineWeight = (t: number): [number, number, number, number] => {
    // Uniform cubic B-spline basis
    const t2 = t * t;
    const t3 = t2 * t;

    const w0 = (1.0 / 6.0) * (-t3 + 3.0 * t2 - 3.0 * t + 1.0);
    const w1 = (1.0 / 6.0) * (3.0 * t3 - 6.0 * t2 + 4.0);
    const w2 = (1.0 / 6.0) * (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0);
    const w3 = (1.0 / 6.0) * t3;

    return [w0, w1, w2, w3];
  };

  // For each x-coordinate, create a gradient column
  for (let x = 0; x < width; x++) {
    const position = x / (width - 1); // Normalize to 0-1

    // Handle areas outside the defined stops
    if (position < stops[0].position) {
      ctx.fillStyle = stops[0].color;
      ctx.fillRect(x, 0, 1, height);
      continue;
    }
    if (position > stops[stops.length - 1].position) {
      ctx.fillStyle = stops[stops.length - 1].color;
      ctx.fillRect(x, 0, 1, height);
      continue;
    }

    // Find the segment this position belongs to
    let segmentStart = 0;
    while (
      segmentStart < stops.length - 1 &&
      stops[segmentStart + 1].position < position
    ) {
      segmentStart++;
    }

    // Get control points for B-spline
    const controlPoints = [
      segmentStart > 0 ? stops[segmentStart - 1] : stops[0],
      stops[segmentStart],
      segmentStart < stops.length - 1
        ? stops[segmentStart + 1]
        : stops[segmentStart],
      segmentStart < stops.length - 2
        ? stops[segmentStart + 2]
        : segmentStart < stops.length - 1
        ? stops[segmentStart + 1]
        : stops[segmentStart],
    ];

    // Convert to RGB
    const rgbPoints = controlPoints.map((stop) => hexToRgb(stop.color));

    // Calculate local t within segment
    let localT = 0;
    if (segmentStart < stops.length - 1) {
      const startPos = stops[segmentStart].position;
      const endPos = stops[segmentStart + 1].position;
      localT =
        endPos > startPos ? (position - startPos) / (endPos - startPos) : 0;
    }

    // Clamp localT to [0, 1] to prevent extrapolation
    localT = Math.max(0, Math.min(1, localT));

    // Calculate weights
    const weights = bSplineWeight(localT);

    // Calculate blended color with weights
    let r = 0,
      g = 0,
      b = 0;
    for (let i = 0; i < 4; i++) {
      r += rgbPoints[i][0] * weights[i];
      g += rgbPoints[i][1] * weights[i];
      b += rgbPoints[i][2] * weights[i];
    }

    // Set the color for this column for the full height
    ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    ctx.fillRect(x, 0, 1, height);
  }
}

/**
 * Renders a step gradient to the canvas context
 */
function renderStepGradient(
  ctx: CanvasRenderingContext2D,
  stops: ColorStop[],
  width: number,
  height: number
): void {
  // For each pixel in the gradient
  for (let i = 0; i < stops.length - 1; i++) {
    const currentStop = stops[i];
    const nextStop = stops[i + 1];

    const startX = Math.floor(currentStop.position * width);
    const endX = Math.floor(nextStop.position * width);

    // Fill rectangle with current color
    ctx.fillStyle = currentStop.color;
    ctx.fillRect(startX, 0, endX - startX, height);
  }

  // Fill the final segment
  const lastStop = stops[stops.length - 1];
  ctx.fillStyle = lastStop.color;
  ctx.fillRect(Math.floor(lastStop.position * width), 0, width, height);
}

/**
 * Renders a smooth step gradient to the canvas context
 */
function renderSmoothStepGradient(
  ctx: CanvasRenderingContext2D,
  stops: ColorStop[],
  width: number,
  height: number
): void {
  // Clear the canvas first
  ctx.clearRect(0, 0, width, height);

  // Helper function to convert hex to rgb
  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return [r, g, b];
  };

  // Smooth step function: 3t² - 2t³
  const smoothstep = (t: number): number => {
    return t * t * (3 - 2 * t);
  };

  // For each x-coordinate, create a gradient column
  for (let x = 0; x < width; x++) {
    const position = x / (width - 1);

    // Handle areas outside the defined stops
    if (position < stops[0].position) {
      const rgb = hexToRgb(stops[0].color);
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      ctx.fillRect(x, 0, 1, height);
      continue;
    }
    if (position > stops[stops.length - 1].position) {
      const rgb = hexToRgb(stops[stops.length - 1].color);
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      ctx.fillRect(x, 0, 1, height);
      continue;
    }

    // Find the segment this position belongs to
    let segmentIndex = 0;
    while (
      segmentIndex < stops.length - 1 &&
      stops[segmentIndex + 1].position <= position
    ) {
      segmentIndex++;
    }

    // Handle edge cases
    if (segmentIndex >= stops.length - 1) {
      const rgb = hexToRgb(stops[stops.length - 1].color);
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      ctx.fillRect(x, 0, 1, height);
      continue;
    }

    // Get the two colors to interpolate between
    const color1 = hexToRgb(stops[segmentIndex].color);
    const color2 = hexToRgb(stops[segmentIndex + 1].color);

    // Calculate local t within segment
    const startPos = stops[segmentIndex].position;
    const endPos = stops[segmentIndex + 1].position;
    const localT =
      endPos > startPos ? (position - startPos) / (endPos - startPos) : 0;

    // Clamp localT and apply smoothstep function
    const t = smoothstep(Math.max(0, Math.min(1, localT)));

    // Linear interpolation with smoothstep easing
    const r = Math.round(color1[0] * (1 - t) + color2[0] * t);
    const g = Math.round(color1[1] * (1 - t) + color2[1] * t);
    const b = Math.round(color1[2] * (1 - t) + color2[2] * t);

    // Draw a full-height column with this color
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, 0, 1, height);
  }
}
