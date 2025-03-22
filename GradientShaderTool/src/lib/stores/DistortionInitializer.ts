/**
 * DistortionInitializer for managing distortion parameters
 */
import { Signal } from "@preact/signals";
import { InitializerBase, type ParameterDefinition } from "./InitializerBase";
import { getHistoryStore } from "./HistoryStore";

/**
 * Distortion parameter types
 */
export interface DistortionParameters {
  // Normal noise parameters
  normalNoiseScaleX: number;
  normalNoiseScaleY: number;
  normalNoiseStrength: number;
  normalNoiseSpeed: number;

  // Shift parameters
  normalNoiseShiftX: number;
  normalNoiseShiftY: number;
  normalNoiseShiftSpeed: number;
}

/**
 * Default distortion parameters
 */
const DEFAULT_DISTORTION_PARAMETERS: DistortionParameters = {
  normalNoiseScaleX: 3.0,
  normalNoiseScaleY: 3.0,
  normalNoiseStrength: 0.5,
  normalNoiseSpeed: 0.2,
  normalNoiseShiftX: 0,
  normalNoiseShiftY: 0,
  normalNoiseShiftSpeed: 0.2,
};

/**
 * Distortion parameter definitions
 */
const PARAMETER_DEFINITIONS: Record<
  keyof DistortionParameters,
  ParameterDefinition<number>
> = {
  normalNoiseScaleX: {
    defaultValue: DEFAULT_DISTORTION_PARAMETERS.normalNoiseScaleX,
    facadeParam: "normalNoiseScaleX",
  },
  normalNoiseScaleY: {
    defaultValue: DEFAULT_DISTORTION_PARAMETERS.normalNoiseScaleY,
    facadeParam: "normalNoiseScaleY",
  },
  normalNoiseStrength: {
    defaultValue: DEFAULT_DISTORTION_PARAMETERS.normalNoiseStrength,
    facadeParam: "normalNoiseStrength",
  },
  normalNoiseSpeed: {
    defaultValue: DEFAULT_DISTORTION_PARAMETERS.normalNoiseSpeed,
    facadeParam: "normalNoiseSpeed",
  },
  normalNoiseShiftX: {
    defaultValue: DEFAULT_DISTORTION_PARAMETERS.normalNoiseShiftX,
    facadeParam: "normalNoiseShiftX",
  },
  normalNoiseShiftY: {
    defaultValue: DEFAULT_DISTORTION_PARAMETERS.normalNoiseShiftY,
    facadeParam: "normalNoiseShiftY",
  },
  normalNoiseShiftSpeed: {
    defaultValue: DEFAULT_DISTORTION_PARAMETERS.normalNoiseShiftSpeed,
    facadeParam: "normalNoiseShiftSpeed",
  },
};

/**
 * DistortionInitializer class for managing distortion parameters
 */
export class DistortionInitializer extends InitializerBase<DistortionParameters> {
  constructor() {
    super(PARAMETER_DEFINITIONS, {
      debug: false,
      autoSync: true,
      updateFacade: true,
    });
  }

  /**
   * Update normal noise scale X
   */
  updateNormalNoiseScaleX(value: number): void {
    this.updateParameter("normalNoiseScaleX", value);
  }

  /**
   * Update normal noise scale Y
   */
  updateNormalNoiseScaleY(value: number): void {
    this.updateParameter("normalNoiseScaleY", value);
  }

  /**
   * Update normal noise strength
   */
  updateNormalNoiseStrength(value: number): void {
    this.updateParameter("normalNoiseStrength", value);
  }

  /**
   * Update normal noise speed
   */
  updateNormalNoiseSpeed(value: number): void {
    this.updateParameter("normalNoiseSpeed", value);
  }

  /**
   * Update noise shift X
   */
  updateNoiseShiftX(value: number): void {
    this.updateParameter("normalNoiseShiftX", value);
  }

  /**
   * Update noise shift Y
   */
  updateNoiseShiftY(value: number): void {
    this.updateParameter("normalNoiseShiftY", value);
  }

  /**
   * Update noise shift speed
   */
  updateNoiseShiftSpeed(value: number): void {
    this.updateParameter("normalNoiseShiftSpeed", value);
  }

  /**
   * Update shift direction and speed together
   */
  updateShiftDirection(x: number, y: number, speed?: number): void {
    this.updateParameters({
      normalNoiseShiftX: x,
      normalNoiseShiftY: y,
      ...(speed !== undefined && { normalNoiseShiftSpeed: speed }),
    });
  }

  /**
   * Reset to default values
   */
  reset(): void {
    // Get current parameter values for history
    const currentValues: Partial<DistortionParameters> = {};
    for (const key of Object.keys(DEFAULT_DISTORTION_PARAMETERS) as Array<
      keyof DistortionParameters
    >) {
      currentValues[key] = this.getSignal(key).value;
    }

    // Save for history
    const historyStore = getHistoryStore();
    historyStore.recordAction(
      "Reset distortion parameters",
      currentValues,
      DEFAULT_DISTORTION_PARAMETERS,
      "distortion-reset"
    );

    // Reset all parameters
    super.reset();
  }

  /**
   * Get a parameter signal with explicit return type
   */
  getParameterSignal<K extends keyof DistortionParameters>(
    key: K
  ): Signal<DistortionParameters[K]> {
    return this.getWritableSignal(key);
  }

  /**
   * Sync a specific parameter from the facade
   */
  syncParameterFromFacade(paramName: keyof DistortionParameters): boolean {
    console.log(
      `DistortionInitializer: Syncing parameter ${paramName} from facade`
    );

    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn(
        `DistortionInitializer: Cannot sync parameter ${paramName}, facade not available`
      );
      return false;
    }

    try {
      this.isSyncing = true;

      // Get parameter definition
      const paramDef = this.parameterDefs[paramName];
      if (!paramDef) {
        console.warn(
          `DistortionInitializer: Parameter ${paramName} not defined`
        );
        return false;
      }

      // Get the facade parameter name
      const facadeParam = paramDef.facadeParam || paramName;

      // Get value from facade
      let value = facade.getParam(facadeParam as any);

      // Apply transformation if needed
      if (paramDef.fromFacade) {
        value = paramDef.fromFacade(value);
      }

      // Update signal if it exists
      const signal = this.parameterSignals.get(paramName as string);
      if (signal) {
        signal.value = value;
        console.log(
          `DistortionInitializer: Updated signal for ${paramName} to ${value}`
        );
        return true;
      }

      console.warn(`DistortionInitializer: No signal found for ${paramName}`);
      return false;
    } catch (error) {
      console.error(
        `DistortionInitializer: Error syncing parameter ${paramName}:`,
        error
      );
      return false;
    } finally {
      this.isSyncing = false;
    }
  }
}

// Singleton instance
let distortionInitializer: DistortionInitializer | null = null;

/**
 * Get the distortion initializer instance
 */
export function getDistortionInitializer(): DistortionInitializer {
  if (!distortionInitializer) {
    distortionInitializer = new DistortionInitializer();
  }
  return distortionInitializer;
}

/**
 * Helper function to get a specific distortion parameter signal
 */
export function getDistortionParameter<K extends keyof DistortionParameters>(
  paramName: K
): Signal<DistortionParameters[K]> {
  return getDistortionInitializer().getParameterSignal(paramName);
}
