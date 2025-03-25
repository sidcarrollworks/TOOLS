/**
 * Utility functions for working with settings-to-shader parameter mappings
 */
import type { ShaderParams } from "../../ShaderApp";
import { parameterMappings } from "./config";
import type { ParameterMapping } from "./types";

// Lookup maps for fast access
export const settingToParamMap = new Map<string, string>();
export const paramToSettingMap = new Map<string, string>();

/**
 * Initialize the lookup maps for faster access
 */
export function initMappingLookups(): void {
  // Clear any existing mappings
  settingToParamMap.clear();
  paramToSettingMap.clear();

  // Build lookup maps from the configuration
  Object.values(parameterMappings.panels).forEach((panel) => {
    panel.mappings.forEach((mapping) => {
      settingToParamMap.set(mapping.settingId, mapping.paramName);
      paramToSettingMap.set(mapping.paramName, mapping.settingId);
    });
  });

  console.log(
    `Initialized mapping lookups with ${settingToParamMap.size} entries`
  );
}

/**
 * Get parameter mapping for a setting
 */
export function getParameterMapping(
  settingId: string
): ParameterMapping | null {
  // Search through all panels
  for (const panelId in parameterMappings.panels) {
    const mapping = parameterMappings.panels[panelId].mappings.find(
      (m) => m.settingId === settingId
    );
    if (mapping) return mapping;
  }
  return null;
}

/**
 * Apply settings values to ShaderApp params
 */
export function applySettingsToParams(
  settings: Record<string, any>,
  params: ShaderParams,
  app?: any
): void {
  Object.entries(settings).forEach(([settingId, value]) => {
    const paramName = settingToParamMap.get(settingId);
    if (!paramName) return; // Skip if no mapping exists

    const mapping = getParameterMapping(settingId);

    // Apply transformation if defined
    const paramValue = mapping?.transform?.toParam
      ? mapping.transform.toParam(value)
      : value;

    // Type assertion to safely update the parameter
    (params as any)[paramName] = paramValue;
  });

  // After applying all settings, trigger the shader update if app is provided
  if (app && app.updateParams) {
    app.updateParams(false); // Update without camera reset
  }
}

/**
 * Extract settings values from ShaderApp params
 */
export function extractSettingsFromParams(
  params: ShaderParams
): Record<string, any> {
  const settings: Record<string, any> = {};

  // Loop through all parameter mappings
  Object.entries(params).forEach(([paramName, value]) => {
    const settingId = paramToSettingMap.get(paramName);
    if (!settingId) return; // Skip if no mapping exists

    const mapping = getParameterMapping(settingId);

    // Apply reverse transformation if defined
    settings[settingId] = mapping?.transform?.fromParam
      ? mapping.transform.fromParam(value)
      : value;
  });

  return settings;
}

/**
 * Validate a setting value
 */
export function validateSetting(settingId: string, value: any): boolean {
  const mapping = getParameterMapping(settingId);
  if (!mapping || !mapping.validation) return true;

  const { validation } = mapping;

  // Check numeric ranges
  if (typeof value === "number") {
    if (validation.min !== undefined && value < validation.min) return false;
    if (validation.max !== undefined && value > validation.max) return false;
  }

  // Check string patterns
  if (typeof value === "string" && validation.pattern) {
    if (!validation.pattern.test(value)) return false;
  }

  // Use custom validator if provided
  if (validation.validator) {
    return validation.validator(value);
  }

  return true;
}
