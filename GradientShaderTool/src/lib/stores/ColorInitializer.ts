import { Signal } from "@preact/signals-core";
import { InitializerBase } from "./InitializerBase";
import { facadeSignal } from "../../app";
import { sortColorStops, MAX_COLOR_STOPS } from "../types/ColorStop";
import type { ColorStop } from "../types/ColorStop";

/**
 * Interface for color and gradient parameters
 */
export interface ColorParameters {
  // Gradient parameters
  gradientMode: number;
  gradientShiftX: number;
  gradientShiftY: number;
  gradientShiftSpeed: number;

  // Color stops array (replaces individual color1-4)
  colorStops: ColorStop[];

  // Color noise parameters
  colorNoiseScale: number;
  colorNoiseSpeed: number;

  // Background parameters
  backgroundColor: string;
  transparentBackground: boolean;
}

/**
 * Default values for color parameters
 */
export const DEFAULT_COLOR_PARAMETERS: ColorParameters = {
  // Gradient defaults
  gradientMode: 0, // B-Spline, Linear, Step, Smooth Step
  gradientShiftX: 0,
  gradientShiftY: 0,
  gradientShiftSpeed: 0,

  // Default color stops (replacing individual colors)
  colorStops: [
    { position: 0.0, color: "#ff0000" },
    { position: 0.33, color: "#00ff00" },
    { position: 0.66, color: "#0000ff" },
    { position: 1.0, color: "#ffff00" },
  ],

  // Color noise defaults
  colorNoiseScale: 1.0,
  colorNoiseSpeed: 0.1,

  // Background defaults
  backgroundColor: "#000000",
  transparentBackground: false,
};

/**
 * Parameter definitions for color initializer
 */
export const PARAMETER_DEFINITIONS = {
  gradientMode: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.gradientMode,
    facadeParam: "gradientMode",
  },
  gradientShiftX: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.gradientShiftX,
    facadeParam: "gradientShiftX",
  },
  gradientShiftY: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.gradientShiftY,
    facadeParam: "gradientShiftY",
  },
  gradientShiftSpeed: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.gradientShiftSpeed,
    facadeParam: "gradientShiftSpeed",
  },
  colorStops: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.colorStops,
    // No direct facade parameter for this, we'll handle it specially
  },
  colorNoiseScale: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.colorNoiseScale,
    facadeParam: "colorNoiseScale",
  },
  colorNoiseSpeed: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.colorNoiseSpeed,
    facadeParam: "colorNoiseSpeed",
  },
  backgroundColor: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.backgroundColor,
    facadeParam: "backgroundColor",
  },
  transparentBackground: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.transparentBackground,
  },
};

/**
 * Class for initializing and managing color parameters
 */
export class ColorInitializer extends InitializerBase<ColorParameters> {
  constructor() {
    super(PARAMETER_DEFINITIONS, {
      debug: true,
      autoSync: true,
      updateFacade: true,
      registerEventListeners: true,
    });

    // Add compatibility for old color parameters
    this.handleLegacyColors();
  }

  /**
   * Handle legacy color parameters for backward compatibility
   */
  private handleLegacyColors(): void {
    const facade = facadeSignal.value;
    if (!facade) return;

    try {
      // Create colorStops from individual colors in facade
      const c1 =
        facade.getParam("color1") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[0].color;
      const c2 =
        facade.getParam("color2") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[1].color;
      const c3 =
        facade.getParam("color3") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[2].color;
      const c4 =
        facade.getParam("color4") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[3].color;

      const colorStops: ColorStop[] = [
        { position: 0.0, color: c1 },
        { position: 0.33, color: c2 },
        { position: 0.66, color: c3 },
        { position: 1.0, color: c4 },
      ];

      // Update the colorStops signal
      this.updateParameter("colorStops", colorStops);
    } catch (error) {
      console.error("Error creating colorStops from legacy colors:", error);
    }
  }

  /**
   * Override syncWithFacade to ensure proper synchronization
   */
  syncWithFacade(): boolean {
    const facade = facadeSignal.value;

    if (!facade) {
      // No facade available for sync
      return false;
    }

    // Call the base implementation for regular parameters
    super.syncWithFacade();

    // Special handling for colorStops - we need to create them from individual colors
    try {
      // Get current colorStops
      const currentColorStops = this.getSignal("colorStops").value;

      // If we have at least 4 color stops already defined, we don't need to sync from facade's individual colors
      if (currentColorStops.length >= 4) {
        // Just update individual colors in facade for backward compatibility
        this.syncColorsToFacade();
        return true;
      }

      // Create colorStops from individual colors in facade
      const c1 =
        facade.getParam("color1") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[0].color;
      const c2 =
        facade.getParam("color2") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[1].color;
      const c3 =
        facade.getParam("color3") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[2].color;
      const c4 =
        facade.getParam("color4") ||
        DEFAULT_COLOR_PARAMETERS.colorStops[3].color;

      const colorStops: ColorStop[] = [
        { position: 0.0, color: c1 },
        { position: 0.33, color: c2 },
        { position: 0.66, color: c3 },
        { position: 1.0, color: c4 },
      ];

      // Update the colorStops signal
      this.updateParameter("colorStops", colorStops);
    } catch (error) {
      console.error("Error syncing colorStops from facade:", error);
    }

    return true;
  }

  /**
   * Sync individual color parameters to facade for backward compatibility
   */
  private syncColorsToFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) return;

    try {
      const colorStops = this.getSignal("colorStops").value;

      // Sort stops by position to ensure we get the right colors
      const sortedStops = sortColorStops(colorStops);

      // Find the closest stops to the legacy positions
      const getClosestStop = (position: number) => {
        return sortedStops.reduce((prev, curr) =>
          Math.abs(curr.position - position) <
          Math.abs(prev.position - position)
            ? curr
            : prev
        );
      };

      // Use the closest stops for the legacy positions, or first/last for extremes
      const color1 = sortedStops[0].color;
      const color2 = getClosestStop(0.33).color;
      const color3 = getClosestStop(0.66).color;
      const color4 = sortedStops[sortedStops.length - 1].color;

      // Set parameters directly on facade
      facade.updateParam("color1", color1);
      facade.updateParam("color2", color2);
      facade.updateParam("color3", color3);
      facade.updateParam("color4", color4);
    } catch (error) {
      console.error("Error syncing colors to facade:", error);
    }
  }

  /**
   * Add a new color stop
   * @param color - Color hex string
   * @param position - Position (0-1)
   * @returns true if successful
   */
  addColorStop(color: string, position: number): boolean {
    // Get current color stops
    const currentStops = this.getSignal("colorStops").value;

    // Check if we've reached the maximum
    if (currentStops.length >= MAX_COLOR_STOPS) {
      console.warn(`Maximum of ${MAX_COLOR_STOPS} color stops reached`);
      return false;
    }

    // Clamp position to valid range
    const clampedPosition = Math.max(0, Math.min(1, position));

    // Add new stop
    const newStops = [...currentStops, { position: clampedPosition, color }];

    // Sort stops by position
    const sortedStops = sortColorStops(newStops);

    // Update parameter
    return this.updateParameter("colorStops", sortedStops);
  }

  /**
   * Remove a color stop
   * @param index - Index of stop to remove
   * @returns true if successful
   */
  removeColorStop(index: number): boolean {
    // Get current color stops
    const currentStops = this.getSignal("colorStops").value;

    // Ensure we maintain at least one color stop
    if (currentStops.length <= 1) {
      console.warn("Cannot remove the last color stop");
      return false;
    }

    // Remove stop at index
    const newStops = currentStops.filter((_, i) => i !== index);

    // Update parameter
    return this.updateParameter("colorStops", newStops);
  }

  /**
   * Update a color stop's position
   * @param index - Index of stop to update
   * @param position - New position
   * @returns true if successful
   */
  updateColorStopPosition(index: number, position: number): boolean {
    // Get current color stops
    const currentStops = this.getSignal("colorStops").value;

    // Check if index is valid
    if (index < 0 || index >= currentStops.length) {
      console.warn(`Invalid color stop index: ${index}`);
      return false;
    }

    // Clamp position to valid range
    const clampedPosition = Math.max(0, Math.min(1, position));

    // Create new array with updated position
    const newStops = currentStops.map((stop, i) =>
      i === index ? { ...stop, position: clampedPosition } : stop
    );

    // Sort stops by position
    const sortedStops = sortColorStops(newStops);

    // Update parameter
    return this.updateParameter("colorStops", sortedStops);
  }

  /**
   * Update a color stop's color
   * @param index - Index of stop to update
   * @param color - New color
   * @returns true if successful
   */
  updateColorStopColor(index: number, color: string): boolean {
    // Get current color stops
    const currentStops = this.getSignal("colorStops").value;

    // Check if index is valid
    if (index < 0 || index >= currentStops.length) {
      console.warn(`Invalid color stop index: ${index}`);
      return false;
    }

    // Create new array with updated color
    const newStops = currentStops.map((stop, i) =>
      i === index ? { ...stop, color } : stop
    );

    // Update parameter
    return this.updateParameter("colorStops", newStops);
  }

  /**
   * Update a color parameter
   */
  updateParameter<K extends keyof ColorParameters>(
    key: K,
    value: ColorParameters[K]
  ): boolean {
    // Special handling for colorStops
    if (key === "colorStops") {
      const result = super.updateParameter(key, value);

      // Update facade with individual colors for backward compatibility
      if (result) {
        this.syncColorsToFacade();
      }

      return result;
    }

    // Default handling for other parameters
    return super.updateParameter(key, value);
  }

  /**
   * Update transparent background setting
   */
  updateTransparentBackground(
    value: boolean,
    source: "color" | "export" = "color"
  ): boolean {
    // Update the parameter through the base method
    const result = this.updateParameter("transparentBackground", value);

    // Always update the scene for immediate visual feedback using the event system
    const facade = facadeSignal.value;
    if (facade) {
      try {
        // Use the parameter-changed event to trigger the SceneManager update
        facade.emit("parameter-changed", {
          paramName: "transparencyUpdate",
          value,
          source: "user",
        });
      } catch (error) {
        console.error("Error updating transparency setting:", error);
      }
    }

    // Only sync with Export components if this update didn't come from there
    if (source !== "export") {
      try {
        // Import the ExportInitializer dynamically to avoid circular dependencies
        import("./ExportInitializer")
          .then(({ getExportInitializer }) => {
            const exportInitializer = getExportInitializer();
            // Call with source=color to prevent loops
            exportInitializer.updateParameter("transparent", value);
          })
          .catch((err) => {
            console.error(
              "Error updating ExportInitializer transparent parameter:",
              err
            );
          });
      } catch (error) {
        console.error("Error syncing with export components:", error);
      }
    }

    return result;
  }

  /**
   * Reset all color parameters to their default values
   */
  reset(): boolean {
    return super.reset();
  }

  /**
   * Get a parameter signal with explicit return type
   */
  getParameterSignal<K extends keyof ColorParameters>(
    key: K
  ): Signal<ColorParameters[K]> {
    return this.getWritableSignal(key);
  }
}

// Create a singleton instance
let colorInitializerInstance: ColorInitializer | null = null;

/**
 * Get the color initializer instance
 */
export function getColorInitializer(): ColorInitializer {
  if (!colorInitializerInstance) {
    colorInitializerInstance = new ColorInitializer();
  }
  return colorInitializerInstance;
}

/**
 * Helper function to get a specific color parameter signal
 */
export function getColorParameter<K extends keyof ColorParameters>(
  paramName: K
): Signal<ColorParameters[K]> {
  return getColorInitializer().getParameterSignal(paramName);
}
