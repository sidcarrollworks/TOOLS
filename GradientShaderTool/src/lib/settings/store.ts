import { signal, computed } from "@preact/signals";
import type { SettingsConfig } from "./types";
import { facadeSignal } from "../../app";
import { applySettingsToParams, validateSetting } from "./mappings/utils";

// Create a signal for the settings configuration
export const settingsConfigSignal = signal<SettingsConfig>({ panels: {} });

// Create a signal for the current settings values
// This will be a map of setting IDs to their current values
export const settingsValuesSignal = signal<Record<string, any>>({});

// Helper function to initialize settings values from config
export function initializeSettingsValues(config: SettingsConfig) {
  const initialValues: Record<string, any> = {};

  // Loop through all panels and their settings to get default values
  Object.values(config.panels).forEach((panel) => {
    panel.groups.forEach((group) => {
      group.settings.forEach((setting) => {
        if ("defaultValue" in setting) {
          initialValues[setting.id] = setting.defaultValue;
        }
      });
    });
  });

  // Update the settings values signal
  settingsValuesSignal.value = initialValues;
}

// Helper function to update a single setting value
export function updateSettingValue(id: string, value: any) {
  // Add debugging for flow direction values
  if (id.includes("NoiseShift") || id.includes("gradientShift")) {
    console.log(`DEBUG updateSettingValue (${id}):`, value);
    console.log(
      `DEBUG Old value in store (${id}):`,
      settingsValuesSignal.value[id]
    );
  }

  // Validate the value
  if (!validateSetting(id, value)) {
    console.warn(`Invalid value for setting ${id}:`, value);
    return false;
  }

  // Update the settings values signal with a fresh object to ensure reactivity
  const newValues = {
    ...settingsValuesSignal.value,
    [id]: value,
  };
  settingsValuesSignal.value = newValues;

  if (id.includes("NoiseShift") || id.includes("gradientShift")) {
    console.log(
      `DEBUG New value in store (${id}):`,
      settingsValuesSignal.value[id]
    );
  }

  // Get the facade instance
  const facade = facadeSignal.value;
  if (facade && facade.isInitialized()) {
    // Update the parameter using the facade
    facade.updateParam(id as any, value, { skipValidation: true });

    // Debug the actual shader param values
    if (id.includes("NoiseShift") || id.includes("gradientShift")) {
      console.log(
        `DEBUG Shader param after update (${id}):`,
        facade.getParam(id as any)
      );
    }
  }

  return true;
}

// Helper function to batch update multiple settings at once
export function batchUpdateSettings(updates: Record<string, any>) {
  // Validate all values before applying any
  const allValid = Object.entries(updates).every(([id, value]) =>
    validateSetting(id, value)
  );

  if (!allValid) {
    console.warn("Batch update failed validation", updates);
    return false;
  }

  // Update the settings values signal (batch update)
  settingsValuesSignal.value = {
    ...settingsValuesSignal.value,
    ...updates,
  };

  // Get the facade instance
  const facade = facadeSignal.value;
  if (facade && facade.isInitialized()) {
    // Apply all updates to shader params through the facade
    Object.entries(updates).forEach(([id, value]) => {
      facade.updateParam(id as any, value, { skipValidation: true });
    });
  }

  return true;
}

// Helper function to get a setting value
export function getSettingValue(id: string) {
  return settingsValuesSignal.value[id];
}

// Helper function to get all settings for a specific panel
export function getPanelSettings(panelId: string) {
  return computed(() => {
    const config = settingsConfigSignal.value;
    return config.panels[panelId] || null;
  });
}

// Helper function to reset settings to their default values
export function resetSettings() {
  initializeSettingsValues(settingsConfigSignal.value);
}

// Helper function to load settings from a preset
export function loadPreset(presetValues: Record<string, any>) {
  settingsValuesSignal.value = {
    ...settingsValuesSignal.value,
    ...presetValues,
  };

  // Get the facade instance
  const facade = facadeSignal.value;
  if (facade && facade.isInitialized()) {
    // Apply all updates to shader params through the facade
    Object.entries(presetValues).forEach(([id, value]) => {
      facade.updateParam(id as any, value, { skipValidation: true });
    });
  }
}
