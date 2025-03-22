import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import { getHistoryStore } from "./HistoryStore";
import { SignalStoreBase } from "./SignalStoreBase";
import {
  getLightingInitializer,
  DEFAULT_LIGHTING_PARAMETERS,
} from "./LightingInitializer";

/**
 * Lighting state interface
 */
export interface LightingState {
  /**
   * Light direction vector
   */
  direction: {
    x: number;
    y: number;
    z: number;
  };

  /**
   * Lighting intensities
   */
  intensities: {
    diffuse: number;
    ambient: number;
    rimLight: number;
  };

  /**
   * Flag indicating if values are being updated from the UI
   */
  updatingFromUI: boolean;

  /**
   * Is update in progress
   */
  isUpdating: boolean;

  /**
   * Error message if any
   */
  errorMessage: string | null;
}

/**
 * Store for managing lighting state
 */
export class LightingStore extends SignalStoreBase<LightingState> {
  /**
   * Create a new lighting store
   */
  constructor() {
    // Get the lighting initializer
    const initializer = getLightingInitializer();

    super(
      {
        direction: {
          x: initializer.lightDirX.value,
          y: initializer.lightDirY.value,
          z: initializer.lightDirZ.value,
        },
        intensities: {
          diffuse: initializer.diffuseIntensity.value,
          ambient: initializer.ambientIntensity.value,
          rimLight: initializer.rimLightIntensity.value,
        },
        updatingFromUI: false,
        isUpdating: false,
        errorMessage: null,
      },
      {
        name: "LightingStore",
        debug: false,
        autoSyncWithFacade: false,
      }
    );

    // Set up subscriptions to initializer signals
    this.setupSubscriptions();
  }

  /**
   * Set up subscriptions to initializer signals
   */
  private setupSubscriptions(): void {
    console.log(
      "LightingStore: Setting up subscriptions to initializer signals"
    );
    const initializer = getLightingInitializer();

    // Subscribe to direction changes
    initializer.lightDirX.subscribe((value) => {
      console.log(`LightingStore: lightDirX signal changed to ${value}`);
      this.updateDirectionComponent("x", value);
    });

    initializer.lightDirY.subscribe((value) => {
      console.log(`LightingStore: lightDirY signal changed to ${value}`);
      this.updateDirectionComponent("y", value);
    });

    initializer.lightDirZ.subscribe((value) => {
      console.log(`LightingStore: lightDirZ signal changed to ${value}`);
      this.updateDirectionComponent("z", value);
    });

    // Subscribe to intensity changes
    initializer.diffuseIntensity.subscribe((value) => {
      console.log(`LightingStore: diffuseIntensity signal changed to ${value}`);
      this.updateIntensityComponent("diffuse", value);
    });

    initializer.ambientIntensity.subscribe((value) => {
      console.log(`LightingStore: ambientIntensity signal changed to ${value}`);
      this.updateIntensityComponent("ambient", value);
    });

    initializer.rimLightIntensity.subscribe((value) => {
      console.log(
        `LightingStore: rimLightIntensity signal changed to ${value}`
      );
      this.updateIntensityComponent("rimLight", value);
    });

    console.log("LightingStore: Subscriptions setup completed");
  }

  /**
   * Update a component of the direction vector
   */
  private updateDirectionComponent(
    component: "x" | "y" | "z",
    value: number
  ): void {
    if (this.get("isUpdating")) return;

    this.setState({
      direction: {
        ...this.get("direction"),
        [component]: value,
      },
    });
  }

  /**
   * Update a component of the intensities object
   */
  private updateIntensityComponent(
    component: "diffuse" | "ambient" | "rimLight",
    value: number
  ): void {
    if (this.get("isUpdating")) return;

    this.setState({
      intensities: {
        ...this.get("intensities"),
        [component]: value,
      },
    });
  }

  /**
   * Get the facade instance
   */
  protected getFacade() {
    return facadeSignal.value;
  }

  /**
   * Set light direction
   */
  public setDirection(
    x: number,
    y: number,
    z: number,
    recordHistory: boolean = true
  ): boolean {
    const initializer = getLightingInitializer();

    // Set updating flags
    this.set("isUpdating", true);
    this.set("updatingFromUI", true);

    try {
      // Get current direction for history
      const prevDirection = { ...this.get("direction") };

      // Update local state
      this.set("direction", { x, y, z });

      // Update initializer (which updates the facade)
      const result = initializer.updateDirection(x, y, z);

      // Record in history if needed
      if (recordHistory && getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          "Changed light direction",
          { lightDirection: prevDirection },
          { lightDirection: { x, y, z } },
          "lighting-change"
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to update light direction:", error);
      this.set("errorMessage", "Failed to update light direction");
      getUIStore().showToast("Failed to update light direction", "error");
      return false;
    } finally {
      // Clear updating flags
      this.set("isUpdating", false);
      this.set("updatingFromUI", false);
    }
  }

  /**
   * Set light direction by single axis
   */
  public setDirectionAxis(axis: "x" | "y" | "z", value: number): boolean {
    const direction = { ...this.get("direction") };
    direction[axis] = value;
    return this.setDirection(direction.x, direction.y, direction.z);
  }

  /**
   * Set all intensity values
   */
  public setIntensities(
    diffuse: number,
    ambient: number,
    rimLight: number,
    recordHistory: boolean = true
  ): boolean {
    const initializer = getLightingInitializer();

    // Set updating flags
    this.set("isUpdating", true);
    this.set("updatingFromUI", true);

    try {
      // Get current intensities for history
      const prevIntensities = { ...this.get("intensities") };

      // Update local state
      this.set("intensities", { diffuse, ambient, rimLight });

      // Update initializer (which updates the facade)
      const result = initializer.updateIntensities(diffuse, ambient, rimLight);

      // Record in history if needed
      if (recordHistory && getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          "Changed light intensities",
          { lightIntensities: prevIntensities },
          { lightIntensities: { diffuse, ambient, rimLight } },
          "lighting-change"
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to update light intensities:", error);
      this.set("errorMessage", "Failed to update light intensities");
      getUIStore().showToast("Failed to update light intensities", "error");
      return false;
    } finally {
      // Clear updating flags
      this.set("isUpdating", false);
      this.set("updatingFromUI", false);
    }
  }

  /**
   * Set a single intensity value
   */
  public setIntensity(
    type: "diffuse" | "ambient" | "rimLight",
    value: number
  ): boolean {
    const intensities = { ...this.get("intensities") };
    intensities[type] = value;
    return this.setIntensities(
      intensities.diffuse,
      intensities.ambient,
      intensities.rimLight
    );
  }

  /**
   * Reset lighting to default values
   */
  public reset(): boolean {
    const initializer = getLightingInitializer();
    return initializer.reset();
  }

  /**
   * Sync store with facade
   */
  public syncWithFacade(): void {
    console.log("LightingStore: Starting syncWithFacade");
    const initializer = getLightingInitializer();
    console.log("LightingStore: Calling initializer.syncWithFacade()");
    initializer.syncWithFacade();

    // Update our state from initializer
    console.log("LightingStore: Updating state from initializer", {
      lightDirX: initializer.lightDirX.value,
      lightDirY: initializer.lightDirY.value,
      lightDirZ: initializer.lightDirZ.value,
      diffuseIntensity: initializer.diffuseIntensity.value,
      ambientIntensity: initializer.ambientIntensity.value,
      rimLightIntensity: initializer.rimLightIntensity.value,
    });

    this.setState({
      direction: {
        x: initializer.lightDirX.value,
        y: initializer.lightDirY.value,
        z: initializer.lightDirZ.value,
      },
      intensities: {
        diffuse: initializer.diffuseIntensity.value,
        ambient: initializer.ambientIntensity.value,
        rimLight: initializer.rimLightIntensity.value,
      },
    });
    console.log("LightingStore: syncWithFacade completed");
  }
}

// Singleton instance
let lightingStore: LightingStore | null = null;

/**
 * Get the lighting store instance
 */
export function getLightingStore(): LightingStore {
  if (!lightingStore) {
    lightingStore = new LightingStore();
  }
  return lightingStore;
}
