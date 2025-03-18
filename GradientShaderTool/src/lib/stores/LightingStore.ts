import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import { getHistoryStore } from "./HistoryStore";

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
export class LightingStore extends StoreBase<LightingState> {
  /**
   * Create a new lighting store
   */
  constructor() {
    super(
      {
        direction: { x: 0.5, y: 0.5, z: 0.5 },
        intensities: { diffuse: 0.8, ambient: 0.2, rimLight: 0.5 },
        updatingFromUI: false,
        isUpdating: false,
        errorMessage: null,
      },
      { name: "LightingStore", debug: false }
    );

    // Initialize from facade when available
    this.initFromFacade();
  }

  /**
   * Initialize lighting state from facade
   */
  private initFromFacade(): void {
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) return;

    try {
      // Get lighting values from facade
      const lightDirX = facade.getParam("lightDirX");
      const lightDirY = facade.getParam("lightDirY");
      const lightDirZ = facade.getParam("lightDirZ");
      const diffuseIntensity = facade.getParam("diffuseIntensity");
      const ambientIntensity = facade.getParam("ambientIntensity");
      const rimLightIntensity = facade.getParam("rimLightIntensity");

      // Update store with current values
      this.setState({
        direction: {
          x: lightDirX !== undefined ? lightDirX : 0.5,
          y: lightDirY !== undefined ? lightDirY : 0.5,
          z: lightDirZ !== undefined ? lightDirZ : 0.5,
        },
        intensities: {
          diffuse: diffuseIntensity !== undefined ? diffuseIntensity : 0.8,
          ambient: ambientIntensity !== undefined ? ambientIntensity : 0.2,
          rimLight: rimLightIntensity !== undefined ? rimLightIntensity : 0.5,
        },
      });
    } catch (error) {
      console.error("Error initializing lighting state:", error);
      this.set("errorMessage", "Failed to initialize lighting settings");
    }
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
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) {
      this.set("errorMessage", "Cannot update lighting: Application not ready");
      getUIStore().showToast(
        "Cannot update lighting: Application not ready",
        "error"
      );
      return false;
    }

    // Set updating flags
    this.set("isUpdating", true);
    this.set("updatingFromUI", true);

    try {
      // Get current direction for history
      const prevDirection = { ...this.get("direction") };

      // Update local state
      this.set("direction", { x, y, z });

      // Update individual parameters
      facade.updateParam("lightDirX", x);
      facade.updateParam("lightDirY", y);
      facade.updateParam("lightDirZ", z);

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

      return true;
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
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) {
      this.set("errorMessage", "Cannot update lighting: Application not ready");
      getUIStore().showToast(
        "Cannot update lighting: Application not ready",
        "error"
      );
      return false;
    }

    // Set updating flags
    this.set("isUpdating", true);
    this.set("updatingFromUI", true);

    try {
      // Get current intensities for history
      const prevIntensities = { ...this.get("intensities") };

      // Update local state
      this.set("intensities", { diffuse, ambient, rimLight });

      // Update individual parameters
      facade.updateParam("diffuseIntensity", diffuse);
      facade.updateParam("ambientIntensity", ambient);
      facade.updateParam("rimLightIntensity", rimLight);

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

      return true;
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
    const defaultDirection = { x: 0.5, y: 0.5, z: 0.5 };
    const defaultIntensities = { diffuse: 0.8, ambient: 0.2, rimLight: 0.5 };

    try {
      // Set direction and intensities
      const dirResult = this.setDirection(
        defaultDirection.x,
        defaultDirection.y,
        defaultDirection.z,
        false
      );

      const intResult = this.setIntensities(
        defaultIntensities.diffuse,
        defaultIntensities.ambient,
        defaultIntensities.rimLight,
        false
      );

      // Record combined history entry
      if (getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          "Reset lighting",
          {
            lightDirection: this.get("direction"),
            lightIntensities: this.get("intensities"),
          },
          {
            lightDirection: defaultDirection,
            lightIntensities: defaultIntensities,
          },
          "lighting-reset"
        );
      }

      getUIStore().showToast("Lighting reset to default", "info");
      return dirResult && intResult;
    } catch (error) {
      console.error("Failed to reset lighting:", error);
      this.set("errorMessage", "Failed to reset lighting");
      getUIStore().showToast("Failed to reset lighting", "error");
      return false;
    }
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
