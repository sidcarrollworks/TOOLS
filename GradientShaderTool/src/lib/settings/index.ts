import {
  settingsConfigSignal,
  settingsValuesSignal,
  initializeSettingsValues,
} from "./store";
import { defaultSettings } from "./defaultSettings";

// Initialize the settings system with default settings
export function initializeSettings() {
  // Set the default settings configuration
  settingsConfigSignal.value = defaultSettings;

  // Initialize the settings values from the configuration
  initializeSettingsValues(defaultSettings);
}

// Export everything from the settings module
export * from "./types";
export * from "./store";
export { defaultSettings } from "./defaultSettings";
