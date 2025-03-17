import { initializeSettings } from "./index";
import {
  settingsValuesSignal,
  updateSettingValue,
  batchUpdateSettings,
} from "./store";
import type { ShaderApp } from "../ShaderApp";
import type { IShaderAppFacade } from "../facade/types";
import {
  initMappingLookups,
  extractSettingsFromParams,
  applySettingsToParams,
} from "./mappings/utils";

// Define the interface for camera settings updates
interface CameraSettings {
  cameraDistance?: number;
  cameraPosX?: number;
  cameraPosY?: number;
  cameraPosZ?: number;
  cameraTargetX?: number;
  cameraTargetY?: number;
  cameraTargetZ?: number;
  cameraFov?: number;
}

// Define a type that can be either ShaderApp or IShaderAppFacade
export type AppOrFacade = ShaderApp | IShaderAppFacade;

// Declare the global function for TypeScript
declare global {
  interface Window {
    __updateCameraSettings?: (settings: CameraSettings) => void;
  }
}

// Initialize the settings system
export function initializeSettingsSystem() {
  console.log("Initializing settings system...");

  // Flag to prevent circular updates
  let isUpdatingCamera = false;

  // Initialize the mapping lookups
  initMappingLookups();

  // Initialize the settings with default values
  initializeSettings();

  // Register the camera settings update function on the window object
  window.__updateCameraSettings = (settings: CameraSettings) => {
    // Prevent recursive updates
    if (isUpdatingCamera) return;

    isUpdatingCamera = true;

    try {
      // Update each setting value in the store using batch update
      batchUpdateSettings(settings);
    } finally {
      // Always reset the flag when done
      isUpdatingCamera = false;
    }
  };

  console.log("Settings system initialized with default values");
}

// Connect settings changes to shader app or facade
export function connectSettingsToShaderApp(appOrFacade: AppOrFacade) {
  console.log("Connecting settings to app...");

  // Initialize the app with current settings
  const settings = settingsValuesSignal.value;
  if (Object.keys(settings).length > 0) {
    // Check if we're dealing with a facade or direct ShaderApp
    if ("updateParam" in appOrFacade) {
      // It's a facade
      const facade = appOrFacade as IShaderAppFacade;

      // Apply each setting to the facade
      Object.entries(settings).forEach(([settingId, value]) => {
        facade.updateParam(settingId as any, value, { skipValidation: true });
      });
    } else {
      // It's a ShaderApp
      const app = appOrFacade as ShaderApp;
      applySettingsToParams(settings, app.params, app);
    }
  }

  console.log("Settings connected to app");
}

// Initialize the settings values from the shader app or facade
export function initializeSettingsFromShaderApp(appOrFacade: AppOrFacade) {
  console.log("Initializing settings from app...");

  // Extract current values from params
  let settings: Record<string, any> = {};

  // Check if we're dealing with a facade or direct ShaderApp
  if ("getAllParams" in appOrFacade) {
    // It's a facade
    const facade = appOrFacade as IShaderAppFacade;
    const params = facade.getAllParams();
    settings = extractSettingsFromParams(params);
  } else {
    // It's a ShaderApp
    const app = appOrFacade as ShaderApp;
    settings = extractSettingsFromParams(app.params);
  }

  // Update the settings values signal with a batch update
  settingsValuesSignal.value = {
    ...settingsValuesSignal.value,
    ...settings,
  };

  console.log("Settings initialized from app");
}
