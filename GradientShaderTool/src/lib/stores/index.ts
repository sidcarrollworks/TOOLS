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
import { getLightingStore } from "./LightingStore";
import { getDistortionStore } from "./DistortionStore";
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
  lighting: ReturnType<typeof getLightingStore>;
  distortion: ReturnType<typeof getDistortionStore>;
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
  const distortionStore = getDistortionStore();

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
      const lightingStore = getLightingStore();

      // Get current values from facade
      const lightDirX = facade.getParam("lightDirX");
      const lightDirY = facade.getParam("lightDirY");
      const lightDirZ = facade.getParam("lightDirZ");
      const diffuseIntensity = facade.getParam("diffuseIntensity");
      const ambientIntensity = facade.getParam("ambientIntensity");
      const rimLightIntensity = facade.getParam("rimLightIntensity");

      // Update lighting store state
      lightingStore.setState({
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
      const distortionStore = getDistortionStore();

      // Get current values from facade (using 'as any' to bypass type checking)
      const normalNoiseScaleX = facade.getParam("normalNoiseScaleX" as any);
      const normalNoiseScaleY = facade.getParam("normalNoiseScaleY" as any);
      const normalNoiseStrength = facade.getParam("normalNoiseStrength" as any);
      const normalNoiseShiftX = facade.getParam("normalNoiseShiftX" as any);
      const normalNoiseShiftY = facade.getParam("normalNoiseShiftY" as any);
      const normalNoiseShiftSpeed = facade.getParam(
        "normalNoiseShiftSpeed" as any
      );

      // Update store without triggering facade updates to avoid infinite loops
      distortionStore.syncWithFacade();
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

    // Sync all stores with the facade after preset is applied
    const parameterStore = getParameterStore();
    parameterStore.syncWithFacade();

    // Sync distortion store
    const distortionStore = getDistortionStore();
    distortionStore.syncWithFacade();

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
      // Get lighting values from facade
      const lightDirX = facade.getParam("lightDirX");
      const lightDirY = facade.getParam("lightDirY");
      const lightDirZ = facade.getParam("lightDirZ");
      const diffuseIntensity = facade.getParam("diffuseIntensity");
      const ambientIntensity = facade.getParam("ambientIntensity");
      const rimLightIntensity = facade.getParam("rimLightIntensity");

      // Update lighting store with facade values
      lightingStore.setState({
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

  // Clean up distortion store resources
  const distortionStore = getDistortionStore();
  if (distortionStore) {
    distortionStore.dispose();
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
  getDistortionStore,
};
