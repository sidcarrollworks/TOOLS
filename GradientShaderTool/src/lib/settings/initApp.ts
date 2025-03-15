import { initializeSettings } from "./index";
import { settingsValuesSignal, updateSettingValue } from "./store";
import type { ShaderApp } from "../ShaderApp";

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

  // Initialize the settings with default values
  initializeSettings();

  // Register the camera settings update function on the window object
  window.__updateCameraSettings = (settings: CameraSettings) => {
    // Prevent recursive updates
    if (isUpdatingCamera) return;

    isUpdatingCamera = true;

    try {
      // Update each setting value in the store
      Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined) {
          updateSettingValue(key, value);
        }
      });
    } finally {
      // Always reset the flag when done - immediately instead of with setTimeout
      isUpdatingCamera = false;
    }
  };

  console.log("Settings system initialized with default values");
}

// Connect the settings to the shader app
export function connectSettingsToShaderApp(app: ShaderApp) {
  console.log("Connecting settings to ShaderApp...");

  // Create a map of settings IDs to app parameter names
  const settingsToAppParamsMap: Record<string, string> = {
    lightX: "lightDirX",
    lightY: "lightDirY",
    lightZ: "lightDirZ",
    lightDiffuse: "diffuseIntensity",
    lightAmbient: "ambientIntensity",
    lightRim: "rimLightIntensity",
    // Add other mappings as needed
  };

  // Get the reverse mapping for app params to settings
  const appParamsToSettingsMap: Record<string, string> = {};
  Object.entries(settingsToAppParamsMap).forEach(([settingsId, appParam]) => {
    appParamsToSettingsMap[appParam] = settingsId;
  });

  // Update the shader app parameters when settings change
  const unsubscribe = settingsValuesSignal.subscribe((values) => {
    console.log("Settings values changed, updating ShaderApp parameters");

    // Special handling for lighting parameters to prevent normalization issues
    const lightingParams = ["lightDirX", "lightDirY", "lightDirZ"];
    const updatingLighting = lightingParams.some(
      (param) =>
        values[appParamsToSettingsMap[param]] !== undefined &&
        values[appParamsToSettingsMap[param]] !== (app.params as any)[param]
    );

    // Update the app parameters with the new values
    Object.entries(values).forEach(([settingsId, value]) => {
      // Get the corresponding app parameter name
      const appParam = settingsToAppParamsMap[settingsId] || settingsId;

      // Skip lighting parameters if we're in the middle of updating them
      // to prevent synchronization issues
      if (lightingParams.includes(appParam) && updatingLighting) {
        // Only update if the value actually changed
        if (value !== (app.params as any)[appParam]) {
          (app.params as any)[appParam] = value;
        }
      }
      // For all other parameters, update normally
      else if (appParam in app.params) {
        (app.params as any)[appParam] = value;
      }
    });
  });

  console.log("Settings connected to ShaderApp");
  // Return a cleanup function
  return unsubscribe;
}

// Initialize the settings values from the shader app
export function initializeSettingsFromShaderApp(app: ShaderApp) {
  console.log("Initializing settings from ShaderApp...");

  // Create a mapping from app parameters to settings IDs
  const appParamsToSettingsMap: Record<string, string> = {
    lightDirX: "lightX",
    lightDirY: "lightY",
    lightDirZ: "lightZ",
    diffuseIntensity: "lightDiffuse",
    ambientIntensity: "lightAmbient",
    rimLightIntensity: "lightRim",
    // Add other mappings as needed
  };

  // Get the current values from the app
  const currentValues: Record<string, any> = {};

  // Copy all parameters from the app to our settings
  Object.entries(app.params).forEach(([key, value]) => {
    // Map app parameter names to settings IDs where applicable
    const settingsId = appParamsToSettingsMap[key] || key;
    // Ensure lighting parameters are captured directly from the app
    // without any normalization effects
    currentValues[settingsId] = value;
  });

  // Update the settings values signal
  settingsValuesSignal.value = {
    ...settingsValuesSignal.value,
    ...currentValues,
  };

  console.log("Settings initialized from ShaderApp");
}
