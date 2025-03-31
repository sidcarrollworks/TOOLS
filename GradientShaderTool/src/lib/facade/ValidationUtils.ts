/**
 * ValidationUtils - Utility functions for parameter validation
 */
import type { ValidationResult } from "./types";
import type { ShaderParams } from "../ShaderApp";

/**
 * Default parameter validation ranges
 */
interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
}

/**
 * Validation configuration for parameters
 */
const PARAMETER_VALIDATIONS: Record<string, ParameterValidation> = {
  // Geometry parameters
  planeWidth: { min: 0.1, max: 20 },
  planeHeight: { min: 0.1, max: 20 },
  planeSegments: { min: 1, max: 512 },
  sphereRadius: { min: 0.1, max: 10 },
  sphereWidthSegments: { min: 3, max: 256 },
  sphereHeightSegments: { min: 3, max: 256 },
  cubeSize: { min: 0.1, max: 20 },
  cubeSegments: { min: 1, max: 128 },

  // Rotation parameters
  rotationX: { min: -Math.PI * 2, max: Math.PI * 2 },
  rotationY: { min: -Math.PI * 2, max: Math.PI * 2 },
  rotationZ: { min: -Math.PI * 2, max: Math.PI * 2 },

  // Distortion parameters
  normalNoiseScaleX: { min: 0, max: 20 },
  normalNoiseScaleY: { min: 0, max: 20 },
  normalNoiseSpeed: { min: 0, max: 10 },
  normalNoiseStrength: { min: 0, max: 1 },
  normalNoiseShiftX: { min: -10, max: 10 },
  normalNoiseShiftY: { min: -10, max: 10 },
  normalNoiseShiftSpeed: { min: -5, max: 5 },

  // Color parameters
  colorNoiseScale: { min: 0, max: 20 },
  colorNoiseSpeed: { min: 0, max: 10 },
  gradientShiftX: { min: -10, max: 10 },
  gradientShiftY: { min: -10, max: 10 },
  gradientShiftSpeed: { min: -5, max: 5 },

  // Camera parameters
  cameraDistance: { min: 0.1, max: 20 },
  cameraFov: { min: 10, max: 120 },
  cameraPosX: { min: -20, max: 20 },
  cameraPosY: { min: -20, max: 20 },
  cameraPosZ: { min: -20, max: 20 },
  cameraTargetX: { min: -20, max: 20 },
  cameraTargetY: { min: -20, max: 20 },
  cameraTargetZ: { min: -20, max: 20 },

  // Lighting parameters
  lightDirX: { min: -1, max: 1 },
  lightDirY: { min: -1, max: 1 },
  lightDirZ: { min: -1, max: 1 },
  diffuseIntensity: { min: 0, max: 1 },
  ambientIntensity: { min: 0, max: 1 },
  rimLightIntensity: { min: 0, max: 1 },

  // Effect parameters
  grainIntensity: { min: 0, max: 1 },
  grainScale: { min: 0, max: 10 },
  grainDensity: { min: 0, max: 1 },
  grainSpeed: { min: 0, max: 10 },
};

/**
 * Validate a setting value
 * @param settingId The ID of the setting to validate
 * @param value The value to validate
 * @returns Whether the value is valid
 */
export function validateSetting(settingId: string, value: any): boolean {
  // Get validation rules for this setting
  const validation = PARAMETER_VALIDATIONS[settingId];
  if (!validation) return true; // No validation rules, assume valid

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

/**
 * Validate a parameter with detailed result
 * @param paramName The name of the parameter to validate
 * @param value The value to validate
 * @returns The validation result with details
 */
export function validateParameter<K extends keyof ShaderParams>(
  paramName: K,
  value: any
): ValidationResult {
  // Default to valid
  const result: ValidationResult = { valid: true };

  try {
    // Use the simple validation function
    const valid = validateSetting(paramName as string, value);

    if (!valid) {
      result.valid = false;

      // Get validation to provide more detailed error message
      const validation = PARAMETER_VALIDATIONS[paramName as string];
      if (validation) {
        if (typeof value === "number") {
          if (validation.min !== undefined && value < validation.min) {
            result.message = `Value ${value} is below minimum ${validation.min}`;
          } else if (validation.max !== undefined && value > validation.max) {
            result.message = `Value ${value} is above maximum ${validation.max}`;
          } else {
            result.message = `Invalid numeric value for ${String(paramName)}`;
          }
        } else {
          result.message = `Invalid value type for ${String(paramName)}`;
        }
      } else {
        result.message = `Value is invalid for ${String(paramName)}`;
      }
    }

    return result;
  } catch (error) {
    // Handle errors during validation
    return {
      valid: false,
      message: `Error validating parameter ${String(paramName)}: ${
        (error as Error).message
      }`,
    };
  }
}
