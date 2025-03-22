/**
 * LightingInitializer for managing lighting parameters
 */
import { Signal } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import { InitializerBase, type ParameterDefinition } from "./InitializerBase";
import { getHistoryStore } from "./HistoryStore";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";

/**
 * Lighting parameter types
 */
export interface LightingParameters {
  // Light direction parameters
  lightDirX: number;
  lightDirY: number;
  lightDirZ: number;

  // Light intensity parameters
  diffuseIntensity: number;
  ambientIntensity: number;
  rimLightIntensity: number;
}

/**
 * Default lighting parameters
 */
export const DEFAULT_LIGHTING_PARAMETERS: LightingParameters = {
  // Default direction
  lightDirX: 0.5,
  lightDirY: 0.5,
  lightDirZ: 0.5,

  // Default intensities
  diffuseIntensity: 0.8,
  ambientIntensity: 0.2,
  rimLightIntensity: 0.5,
};

/**
 * Lighting parameter definitions
 */
const PARAMETER_DEFINITIONS: Record<
  keyof LightingParameters,
  ParameterDefinition<number>
> = {
  lightDirX: {
    defaultValue: DEFAULT_LIGHTING_PARAMETERS.lightDirX,
    facadeParam: "lightDirX",
  },
  lightDirY: {
    defaultValue: DEFAULT_LIGHTING_PARAMETERS.lightDirY,
    facadeParam: "lightDirY",
  },
  lightDirZ: {
    defaultValue: DEFAULT_LIGHTING_PARAMETERS.lightDirZ,
    facadeParam: "lightDirZ",
  },
  diffuseIntensity: {
    defaultValue: DEFAULT_LIGHTING_PARAMETERS.diffuseIntensity,
    facadeParam: "diffuseIntensity",
  },
  ambientIntensity: {
    defaultValue: DEFAULT_LIGHTING_PARAMETERS.ambientIntensity,
    facadeParam: "ambientIntensity",
  },
  rimLightIntensity: {
    defaultValue: DEFAULT_LIGHTING_PARAMETERS.rimLightIntensity,
    facadeParam: "rimLightIntensity",
  },
};

/**
 * LightingInitializer class for managing lighting parameters
 */
export class LightingInitializer extends InitializerBase<LightingParameters> {
  // Cache signals for direct access
  public readonly lightDirX: Signal<number>;
  public readonly lightDirY: Signal<number>;
  public readonly lightDirZ: Signal<number>;

  public readonly diffuseIntensity: Signal<number>;
  public readonly ambientIntensity: Signal<number>;
  public readonly rimLightIntensity: Signal<number>;

  // Singleton instance
  private static _instance: LightingInitializer | null = null;

  /**
   * Get the singleton instance
   */
  public static getInstance(): LightingInitializer {
    if (!LightingInitializer._instance) {
      LightingInitializer._instance = new LightingInitializer();
    }
    return LightingInitializer._instance;
  }

  constructor() {
    super(PARAMETER_DEFINITIONS, {
      debug: false,
      autoSync: false,
      updateFacade: true,
    });

    console.log("LightingInitializer: Constructor called");

    // Initialize signals
    this.lightDirX = this.getWritableSignal("lightDirX");
    this.lightDirY = this.getWritableSignal("lightDirY");
    this.lightDirZ = this.getWritableSignal("lightDirZ");

    this.diffuseIntensity = this.getWritableSignal("diffuseIntensity");
    this.ambientIntensity = this.getWritableSignal("ambientIntensity");
    this.rimLightIntensity = this.getWritableSignal("rimLightIntensity");

    console.log(
      "LightingInitializer: Signals initialized with initial values:",
      {
        lightDirX: this.lightDirX.value,
        lightDirY: this.lightDirY.value,
        lightDirZ: this.lightDirZ.value,
        diffuseIntensity: this.diffuseIntensity.value,
        ambientIntensity: this.ambientIntensity.value,
        rimLightIntensity: this.rimLightIntensity.value,
      }
    );

    // Now that signals are initialized, we can sync with facade
    try {
      this.syncWithFacade();
    } catch (error) {
      console.warn("LightingInitializer: Error during initial sync:", error);
    }

    console.log("LightingInitializer: Constructor completed");
  }

  /**
   * Override syncWithFacade to ensure proper synchronization
   */
  syncWithFacade(): void {
    console.log("LightingInitializer: Starting syncWithFacade");

    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn("LightingInitializer: No facade available for sync");
      return;
    }

    // Log facade values before sync
    const beforeValues = {
      lightDirX: facade.getParam("lightDirX"),
      lightDirY: facade.getParam("lightDirY"),
      lightDirZ: facade.getParam("lightDirZ"),
      diffuseIntensity: facade.getParam("diffuseIntensity"),
      ambientIntensity: facade.getParam("ambientIntensity"),
      rimLightIntensity: facade.getParam("rimLightIntensity"),
    };
    console.log(
      "LightingInitializer: Facade values before sync:",
      beforeValues
    );

    // Call the base implementation
    super.syncWithFacade();

    // Safe check signals are initialized before accessing values
    if (
      this.lightDirX &&
      this.lightDirY &&
      this.lightDirZ &&
      this.diffuseIntensity &&
      this.ambientIntensity &&
      this.rimLightIntensity
    ) {
      // Get current signal values after sync
      const afterValues = {
        lightDirX: this.lightDirX.value,
        lightDirY: this.lightDirY.value,
        lightDirZ: this.lightDirZ.value,
        diffuseIntensity: this.diffuseIntensity.value,
        ambientIntensity: this.ambientIntensity.value,
        rimLightIntensity: this.rimLightIntensity.value,
      };
      console.log(
        "LightingInitializer: Signal values after sync:",
        afterValues
      );
    } else {
      console.warn(
        "LightingInitializer: Some signals not initialized during sync"
      );
    }

    console.log("LightingInitializer: syncWithFacade completed");
  }

  /**
   * Update the direction
   */
  public updateDirection(x: number, y: number, z: number): boolean {
    return this.updateParameters({
      lightDirX: x,
      lightDirY: y,
      lightDirZ: z,
    });
  }

  /**
   * Update direction by single axis
   */
  public updateDirectionAxis(axis: "x" | "y" | "z", value: number): boolean {
    const paramMap = {
      x: "lightDirX",
      y: "lightDirY",
      z: "lightDirZ",
    };

    return this.updateParameter(
      paramMap[axis] as keyof LightingParameters,
      value
    );
  }

  /**
   * Update intensities
   */
  public updateIntensities(
    diffuse: number,
    ambient: number,
    rimLight: number
  ): boolean {
    return this.updateParameters({
      diffuseIntensity: diffuse,
      ambientIntensity: ambient,
      rimLightIntensity: rimLight,
    });
  }

  /**
   * Update a single intensity value
   */
  public updateIntensity(
    type: "diffuse" | "ambient" | "rimLight",
    value: number
  ): boolean {
    const paramMap = {
      diffuse: "diffuseIntensity",
      ambient: "ambientIntensity",
      rimLight: "rimLightIntensity",
    };

    return this.updateParameter(
      paramMap[type] as keyof LightingParameters,
      value
    );
  }

  /**
   * Override reset to ensure we properly record history and return a boolean
   */
  public override reset(): boolean {
    // Record history
    if (getHistoryStore) {
      const historyStore = getHistoryStore();
      historyStore.recordAction(
        "Reset lighting",
        {
          lightDirX: this.lightDirX.value,
          lightDirY: this.lightDirY.value,
          lightDirZ: this.lightDirZ.value,
          diffuseIntensity: this.diffuseIntensity.value,
          ambientIntensity: this.ambientIntensity.value,
          rimLightIntensity: this.rimLightIntensity.value,
        },
        DEFAULT_LIGHTING_PARAMETERS,
        "lighting-reset"
      );
    }

    try {
      // Call the parent reset method for actual reset logic
      super.reset();

      // Show toast
      getUIStore().showToast("Lighting reset to default", "info");

      return true;
    } catch (error) {
      console.error("Error resetting lighting parameters:", error);
      return false;
    }
  }

  /**
   * Get the facade instance
   */
  protected getFacade() {
    return facadeSignal.value;
  }
}

/**
 * Get the lighting initializer singleton
 */
export function getLightingInitializer(): LightingInitializer {
  return LightingInitializer.getInstance();
}

/**
 * Get a signal for a specific lighting parameter
 */
export function getLightingParameter(
  paramId: keyof LightingParameters
): ReadonlySignal<number> {
  const initializer = getLightingInitializer();
  return initializer.getSignal(paramId);
}

/**
 * Initialize lighting parameters
 */
export function initializeLightingParameters(): boolean {
  const initializer = getLightingInitializer();
  initializer.syncWithFacade();
  console.log("Lighting parameters initialized");
  return true;
}
