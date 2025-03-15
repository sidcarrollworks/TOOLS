import { initializeSettings } from "./index";
import {
  settingsValuesSignal,
  updateSettingValue,
  batchUpdateSettings,
} from "./store";
import type { ShaderApp } from "../ShaderApp";
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

// Connect settings changes to shader app updates
export function connectSettingsToShaderApp(app: ShaderApp) {
  console.log("Connecting settings to ShaderApp...");

  // Initialize the app with current settings
  const settings = settingsValuesSignal.value;
  if (Object.keys(settings).length > 0) {
    applySettingsToParams(settings, app.params, app);
  }

  console.log("Settings connected to ShaderApp");
}

// Initialize the settings values from the shader app
export function initializeSettingsFromShaderApp(app: ShaderApp) {
  console.log("Initializing settings from ShaderApp...");

  // Extract current values from ShaderApp params
  const settings = extractSettingsFromParams(app.params);

  // Update the settings values signal with a batch update
  settingsValuesSignal.value = {
    ...settingsValuesSignal.value,
    ...settings,
  };

  console.log("Settings initialized from ShaderApp");
}
