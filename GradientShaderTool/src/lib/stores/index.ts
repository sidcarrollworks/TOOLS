/**
 * Store management for the application
 */

import { getUIStore } from "./UIStore";
import { getGeometryStore } from "./GeometryStore";
import { getParameterStore } from "./ParameterStore";
import { getPresetStore } from "./PresetStore";
import { getHistoryStore } from "./HistoryStore";
import { getExportStore } from "./ExportStore";
import { getCameraStore } from "./CameraStore";
import { facadeSignal } from "../../app";

// Store registry for debugging and management
const storeRegistry: Record<string, any> = {};

/**
 * Store registry interface
 */
export interface StoreRegistry {
  ui: ReturnType<typeof getUIStore>;
  geometry: ReturnType<typeof getGeometryStore>;
  parameter: ReturnType<typeof getParameterStore>;
  preset: ReturnType<typeof getPresetStore>;
  history: ReturnType<typeof getHistoryStore>;
  export: ReturnType<typeof getExportStore>;
  camera: ReturnType<typeof getCameraStore>;
  [key: string]: any;
}

/**
 * Initialize all stores
 */
export function initializeStores(): void {
  const uiStore = getUIStore();
  const parameterStore = getParameterStore();
  const geometryStore = getGeometryStore();
  const presetStore = getPresetStore();
  const historyStore = getHistoryStore();
  const exportStore = getExportStore();
  const cameraStore = getCameraStore();

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

    // Handle camera parameter changes
    if (paramName.startsWith("camera")) {
      const cameraStore = getCameraStore();

      // Update camera store from facade if these are camera position related parameters
      if (
        [
          "cameraPosX",
          "cameraPosY",
          "cameraPosZ",
          "cameraTargetX",
          "cameraTargetY",
          "cameraTargetZ",
        ].includes(paramName)
      ) {
        // Get current values from facade
        const cameraPosX = facade.getParam("cameraPosX");
        const cameraPosY = facade.getParam("cameraPosY");
        const cameraPosZ = facade.getParam("cameraPosZ");
        const cameraTargetX = facade.getParam("cameraTargetX");
        const cameraTargetY = facade.getParam("cameraTargetY");
        const cameraTargetZ = facade.getParam("cameraTargetZ");

        // Update camera store
        cameraStore.updateFromFacade(
          cameraPosX,
          cameraPosY,
          cameraPosZ,
          cameraTargetX,
          cameraTargetY,
          cameraTargetZ
        );
      }
    }
  });

  facade.on("geometry-changed", (data) => {
    const { geometryType } = data;
    const geometryStore = getGeometryStore();

    // Update geometry store with the new type
    geometryStore.setGeometryType(geometryType);
  });

  facade.on("preset-applied", (data) => {
    const { presetName } = data;

    // Handle preset applied
    const parameterStore = getParameterStore();
    parameterStore.syncWithFacade();

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
  // Clean up camera store resources
  const cameraStore = getCameraStore();
  if (cameraStore) {
    cameraStore.dispose();
  }

  // Clean up other store resources if needed
}

// Export all store getters
export {
  getUIStore,
  getGeometryStore,
  getParameterStore,
  getPresetStore,
  getHistoryStore,
  getExportStore,
  getCameraStore,
};
