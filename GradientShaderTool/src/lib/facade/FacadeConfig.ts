/**
 * Configuration system for the ShaderAppFacade
 * Defines default settings and provides a way to customize the behavior of the facade
 */

/**
 * Configuration options for the ShaderAppFacade
 */
export interface FacadeConfig {
  // Debounce configuration for different parameter types
  debounce: {
    // Default debounce time (ms)
    default: number;

    // Specific debounce times for different parameter categories
    color: number;
    geometry: number;
    distortion: number;
    camera: number;
    lighting: number;
    animation: number;
  };

  // Performance configuration
  performance: {
    // Use reduced quality for frequent updates
    useReducedQualityForFrequentUpdates: boolean;

    // Frequency threshold for reduced quality (updates per second)
    reducedQualityFrequencyThreshold: number;

    // Time to wait after frequent updates before restoring high quality (ms)
    restoreHighQualityDelay: number;

    // Enable stats monitoring (fps, memory, etc.)
    enableStats: boolean;
  };

  // Export configuration
  export: {
    // Default image export settings
    defaultImageExport: {
      transparent: boolean;
      highQuality: boolean;
      width: number;
      height: number;
      format: "png" | "jpg" | "webp";
    };

    // Default code export settings
    defaultCodeExport: {
      format: "glsl" | "js" | "ts";
      includeLib: boolean;
      minify: boolean;
    };
  };

  // Event configuration
  events: {
    // Throttle events to prevent excessive updates (ms)
    throttleEvents: boolean;

    // Throttle time for events (ms)
    throttleTime: number;

    // Log events to console (for debugging)
    logEvents: boolean;
  };

  // Debug configuration
  debug: {
    // Enable debug mode
    enabled: boolean;

    // Log parameter updates
    logParameterUpdates: boolean;

    // Log render times
    logRenderTimes: boolean;

    // Track update frequencies
    trackUpdateFrequencies: boolean;
  };
}

/**
 * Default configuration for the ShaderAppFacade
 */
export const DEFAULT_FACADE_CONFIG: FacadeConfig = {
  debounce: {
    default: 50,
    color: 100,
    geometry: 250,
    distortion: 100,
    camera: 50,
    lighting: 100,
    animation: 50,
  },
  performance: {
    useReducedQualityForFrequentUpdates: true,
    reducedQualityFrequencyThreshold: 10,
    restoreHighQualityDelay: 500,
    enableStats: false,
  },
  export: {
    defaultImageExport: {
      transparent: false,
      highQuality: true,
      width: 1920,
      height: 1080,
      format: "png",
    },
    defaultCodeExport: {
      format: "glsl",
      includeLib: true,
      minify: false,
    },
  },
  events: {
    throttleEvents: true,
    throttleTime: 16, // ~60fps
    logEvents: false,
  },
  debug: {
    enabled: false,
    logParameterUpdates: false,
    logRenderTimes: false,
    trackUpdateFrequencies: false,
  },
};

/**
 * Create a merged configuration with custom options
 * @param customConfig Custom configuration to merge with defaults
 * @returns The merged configuration
 */
export function createConfig(
  customConfig?: Partial<FacadeConfig>
): FacadeConfig {
  // If no custom config, return the default
  if (!customConfig) {
    return { ...DEFAULT_FACADE_CONFIG };
  }

  // Create a deep copy of the default config to avoid modifying it
  const result = JSON.parse(
    JSON.stringify(DEFAULT_FACADE_CONFIG)
  ) as FacadeConfig;

  // Merge the custom config with the default
  // This is a simple deep merge for the known structure
  if (customConfig.debounce) {
    Object.assign(result.debounce, customConfig.debounce);
  }

  if (customConfig.performance) {
    Object.assign(result.performance, customConfig.performance);
  }

  if (customConfig.export) {
    if (customConfig.export.defaultImageExport) {
      Object.assign(
        result.export.defaultImageExport,
        customConfig.export.defaultImageExport
      );
    }
    if (customConfig.export.defaultCodeExport) {
      Object.assign(
        result.export.defaultCodeExport,
        customConfig.export.defaultCodeExport
      );
    }
  }

  if (customConfig.events) {
    Object.assign(result.events, customConfig.events);
  }

  if (customConfig.debug) {
    Object.assign(result.debug, customConfig.debug);
  }

  return result;
}
