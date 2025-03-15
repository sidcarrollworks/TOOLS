/**
 * Type definitions for the mapping between UI settings and shader parameters
 */

// Define the mapping between UI settings and shader parameters
export interface ParameterMapping {
  settingId: string; // ID in the settings store (e.g., "lightX")
  paramName: string; // Name in ShaderApp params (e.g., "lightDirX")
  transform?: {
    toParam: (value: any) => any; // Transform setting value to parameter value
    fromParam: (value: any) => any; // Transform parameter value to setting value
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    validator?: (value: any) => boolean;
  };
  metadata?: {
    description?: string;
    unit?: string;
  };
}

// Group mappings by panel/category
export interface PanelMappings {
  panelId: string;
  mappings: ParameterMapping[];
}

// Complete mapping configuration
export interface MappingConfig {
  panels: Record<string, PanelMappings>;
}
