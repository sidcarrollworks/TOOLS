/**
 * Store management for the application
 */

import { getUIStore } from "./UIStore";
import { getParameterStore } from "./ParameterStore";
import { getPresetStore } from "./PresetStore";
import { getHistoryStore } from "./HistoryStore";
import { getGeometryInitializer } from "./GeometryInitializer";
import { getLightingInitializer } from "./LightingInitializer";
import { getExportInitializer } from "./ExportInitializer";
import { getDistortionInitializer } from "./DistortionInitializer";
import { getCameraInitializer } from "./CameraInitializer";
import { getColorInitializer } from "./ColorInitializer";
import { facadeSignal } from "../../app";

// Store registry for debugging and management
const storeRegistry: Record<string, any> = {};

/**
 * Store registry interface
 */
export interface StoreRegistry {
  ui: ReturnType<typeof getUIStore>;
  parameter: ReturnType<typeof getParameterStore>;
  preset: ReturnType<typeof getPresetStore>;
  history: ReturnType<typeof getHistoryStore>;
  [key: string]: any;
}

/**
 * Initialize all stores
 */
export function initializeStores(): void {
  const uiStore = getUIStore();
  const parameterStore = getParameterStore();
  const presetStore = getPresetStore();
  const historyStore = getHistoryStore();

  console.info("All stores initialized");
}

/**
 * Initialize stores with the facade
 */
export function initializeStoresWithFacade(): void {
  const facade = facadeSignal.value;
  if (!facade) {
    console.error("Cannot initialize stores with facade: Facade not available");
    return;
  }

  // Subscribe to events
  facade.on("parameter-changed", (data) => {
    const { paramName, value } = data;
    const parameterStore = getParameterStore();

    // Update parameter store
    parameterStore.syncWithFacade();

    // Mark presets as modified
    const presetStore = getPresetStore();
    presetStore.markAsModified();

    // Handle color parameter changes
    if (
      [
        "color1",
        "color2",
        "color3",
        "color4",
        "gradientMode",
        "gradientShiftX",
        "gradientShiftY",
        "gradientShiftSpeed",
        "backgroundColor",
        "colorNoiseScale",
        "colorNoiseSpeed",
      ].includes(paramName)
    ) {
      // Use the color initializer to sync with facade
      const colorInitializer = getColorInitializer();
      console.log(
        `Stores: Syncing color parameter ${paramName} with initializer`
      );
      colorInitializer.syncParameterFromFacade(paramName as any);
    }
  });

  facade.on("preset-applied", (data) => {
    const { presetName } = data;
    console.log(`Stores: Preset applied event received: ${presetName}`);

    // Sync all stores with the facade after preset is applied
    const parameterStore = getParameterStore();
    parameterStore.syncWithFacade();

    // Sync geometry initializer
    const geometryInitializer = getGeometryInitializer();
    geometryInitializer.syncWithFacade();

    // Sync distortion initializer
    const distortionInitializer = getDistortionInitializer();
    distortionInitializer.syncWithFacade();

    // Sync lighting initializer
    const lightingInitializer = getLightingInitializer();
    lightingInitializer.syncWithFacade();

    // Sync color initializer
    const colorInitializer = getColorInitializer();
    colorInitializer.syncWithFacade();

    // Display toast
    const uiStore = getUIStore();
    uiStore.showToast(`Applied preset: ${presetName}`, "success");
  });

  console.info("Stores initialized with facade");
}

/**
 * Get store registry
 */
export function getStoreRegistry(): StoreRegistry {
  return storeRegistry as StoreRegistry;
}

/**
 * Clean up all stores
 */
export function disposeStores(): void {
  // Clean up other store resources if needed
}

// Export all store getters
export {
  getUIStore,
  getParameterStore,
  getPresetStore,
  getHistoryStore,
  // Initializer exports
  getGeometryInitializer,
  getLightingInitializer,
  getExportInitializer,
  getDistortionInitializer,
  getCameraInitializer,
  getColorInitializer,
};
