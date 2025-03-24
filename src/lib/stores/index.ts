import { facadeSignal } from "../../app";
import { StoreRegistry } from "./types";
import { getUIStore } from "./UIStore";
import { getGeometryStore } from "./GeometryStore";
import { getParameterStore } from "./ParameterStore";
import { getPresetStore } from "./PresetStore";
import { getHistoryStore } from "./HistoryStore";
import { getExportStore } from "./ExportStore";
import { getCameraStore } from "./CameraStore";
import { getLightingStore } from "./LightingStore";
import { getColorStore } from "./ColorStore";
import { getGeometryInitializer } from "./GeometryInitializer";
import { getLightingInitializer } from "./LightingInitializer";
import { getDistortionInitializer } from "./DistortionInitializer";

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
  lighting: ReturnType<typeof getLightingStore>;
  color: ReturnType<typeof getColorStore>;
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
  const lightingStore = getLightingStore();
  const colorStore = getColorStore();

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

    // Handle lighting parameter changes
    if (
      [
        "lightDirX",
        "lightDirY",
        "lightDirZ",
        "diffuseIntensity",
        "ambientIntensity",
        "rimLightIntensity",
      ].includes(paramName)
    ) {
      // Use the lighting initializer to sync with facade
      const lightingInitializer = getLightingInitializer();
      lightingInitializer.syncWithFacade();

      // Sync the lighting store with the initializer
      const lightingStore = getLightingStore();
      lightingStore.syncWithFacade();
    }

    // Handle distortion parameter changes
    if (
      [
        "normalNoiseScaleX",
        "normalNoiseScaleY",
        "normalNoiseStrength",
        "normalNoiseShiftX",
        "normalNoiseShiftY",
        "normalNoiseShiftSpeed",
      ].includes(paramName)
    ) {
      // Use the distortion initializer to sync with facade
      const distortionInitializer = getDistortionInitializer();
      distortionInitializer.syncWithFacade();
    }
  });

  facade.on("geometry-changed", (data) => {
    if (!data || !data.geometryType) return;

    const { geometryType } = data;
    console.log(`Geometry changed event received with type: ${geometryType}`);

    // Use the geometry initializer to update the geometry type
    const geometryInitializer = getGeometryInitializer();
    geometryInitializer.updateGeometryType(geometryType);
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

    // Sync camera store
    const cameraStore = getCameraStore();
    if (cameraStore) {
      // Get camera values from facade
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

    // Sync lighting store
    const lightingStore = getLightingStore();
    if (lightingStore) {
      console.log(
        "Stores: Getting lighting parameters from facade after preset applied"
      );

      // Log lighting values from facade before sync
      const lightingValues = {
        lightDirX: facade.getParam("lightDirX"),
        lightDirY: facade.getParam("lightDirY"),
        lightDirZ: facade.getParam("lightDirZ"),
        diffuseIntensity: facade.getParam("diffuseIntensity"),
        ambientIntensity: facade.getParam("ambientIntensity"),
        rimLightIntensity: facade.getParam("rimLightIntensity"),
      };
      console.log("Stores: Lighting values from facade:", lightingValues);

      // Use the lighting initializer to sync with facade
      console.log("Stores: Syncing LightingInitializer with facade");
      const lightingInitializer = getLightingInitializer();
      lightingInitializer.syncWithFacade();

      // Sync the store with the initializer
      console.log("Stores: Syncing LightingStore with initializer");
      lightingStore.syncWithFacade();

      console.log("Stores: Lighting sync completed after preset applied");
    }

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
  getLightingStore,
  getColorStore,
};
