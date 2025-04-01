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

    // Special handling for colorStops - we need to check if they exist in facade params
    try {
      // Get colorStops from the facade
      const facadeParams = facade.getAllParams();
      if (facadeParams.colorStops && facadeParams.colorStops.length > 0) {
        // Facade has colorStops parameter, use it directly
        this.updateParameter("colorStops", facadeParams.colorStops);
        return true;
      } else {
        // No colorStops found in facade, use defaults
        console.warn("No colorStops found in facade params, using defaults");
        this.updateParameter("colorStops", DEFAULT_COLOR_PARAMETERS.colorStops);
      }
    } catch (error) {
      console.error("Error syncing colorStops from facade:", error);
    }

    return true;
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
