import { signal, computed } from "@preact/signals";
import type { SettingsConfig } from "./types";

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
  settingsValuesSignal.value = {
    ...settingsValuesSignal.value,
    [id]: value,
  };
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
}
