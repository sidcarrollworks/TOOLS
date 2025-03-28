import { Signal } from "@preact/signals-core";
import { InitializerBase } from "./InitializerBase";
import { facadeSignal } from "../../app";

/**
 * Interface for color and gradient parameters
 */
export interface ColorParameters {
  // Gradient parameters
  gradientMode: number;
  gradientShiftX: number;
  gradientShiftY: number;
  gradientShiftSpeed: number;

  // Color parameters
  color1: string;
  color2: string;
  color3: string;
  color4: string;

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

  // Color defaults
  color1: "#ff0000",
  color2: "#00ff00",
  color3: "#0000ff",
  color4: "#ffff00",

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
  color1: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.color1,
    facadeParam: "color1",
  },
  color2: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.color2,
    facadeParam: "color2",
  },
  color3: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.color3,
    facadeParam: "color3",
  },
  color4: {
    defaultValue: DEFAULT_COLOR_PARAMETERS.color4,
    facadeParam: "color4",
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
    facadeParam: "exportTransparentBg",
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

    // Get current values from facade before sync
    const beforeValues = {
      color1: facade.getParam("color1"),
      color2: facade.getParam("color2"),
      color3: facade.getParam("color3"),
      color4: facade.getParam("color4"),
      gradientMode: facade.getParam("gradientMode"),
      gradientShiftX: facade.getParam("gradientShiftX"),
      gradientShiftY: facade.getParam("gradientShiftY"),
      gradientShiftSpeed: facade.getParam("gradientShiftSpeed"),
      colorNoiseScale: facade.getParam("colorNoiseScale"),
      colorNoiseSpeed: facade.getParam("colorNoiseSpeed"),
      backgroundColor: facade.getParam("backgroundColor"),
      transparentBackground: facade.getParam("exportTransparentBg"),
    };

    // Call the base implementation
    super.syncWithFacade();

    // Verify sync was successful and force update any mismatched values
    Object.entries(beforeValues).forEach(([key, facadeValue]) => {
      // Skip transparentBackground which is handled separately
      if (key === "transparentBackground") return;

      // Get the parameter key (removing "facade" if it exists)
      const paramKey = key as keyof ColorParameters;

      // Check if we have a signal for this parameter
      if (this.parameterSignals.has(paramKey)) {
        const signal = this.getWritableSignal(paramKey);
        const currentValue = signal.value;

        // Check if the values don't match (allowing for minor float differences)
        const isNumber = typeof facadeValue === "number";
        const valuesDiffer = isNumber
          ? Math.abs(((currentValue as number) - facadeValue) as number) >
            0.0001
          : currentValue !== facadeValue;

        if (valuesDiffer) {
          // Mismatch detected, forcing update

          // Force update the signal
          this.isSyncing = true;
          try {
            signal.value = facadeValue as any;
          } finally {
            this.isSyncing = false;
          }
        }
      }
    });

    // Force update of the export store transparent setting
    if (this.getSignal("transparentBackground")) {
      const transparentValue = facade.getParam("exportTransparentBg");

      // Update our signal
      this.getWritableSignal("transparentBackground").value = transparentValue;
    }

    return true;
  }

  /**
   * Update a single color parameter
   */
  updateParameter<K extends keyof ColorParameters>(
    key: K,
    value: ColorParameters[K]
  ): boolean {
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

    // Always update the facade parameter directly for immediate visual feedback
    // This is critical to ensure the export works correctly
    const facade = facadeSignal.value;
    if (facade) {
      try {
        facade.updateParam("exportTransparentBg", value);
      } catch (error) {
        console.error(
          "Error updating facade exportTransparentBg parameter:",
          error
        );
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
