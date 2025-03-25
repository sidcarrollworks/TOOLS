/**
 * Type definitions for the ShaderAppFacade layer
 * This defines the interface between UI components and the ShaderApp implementation
 */

import type { ShaderParams } from "../ShaderApp";

// Define the types of events that can be emitted by the facade
export type ShaderAppEventType =
  | "parameter-changed"
  | "geometry-changed"
  | "preset-applied"
  | "render-complete"
  | "animation-started"
  | "animation-stopped"
  | "export-started"
  | "export-complete"
  | "error";

// Define the payload types for each event
export interface ShaderAppEventMap {
  "parameter-changed": {
    paramName: string;
    value: any;
    source?: "user" | "preset" | "initialization";
  };
  "geometry-changed": {
    geometryType: string;
    recreated: boolean;
  };
  "preset-applied": {
    presetName: string;
    affectedParams: string[];
  };
  "render-complete": {
    frameTime: number;
    frameCount: number;
  };
  "animation-started": undefined;
  "animation-stopped": undefined;
  "export-started": {
    type: "image" | "code";
    settings: Record<string, any>;
  };
  "export-complete": {
    type: "image" | "code";
    result: any;
  };
  error: {
    message: string;
    code?: string;
    source?: string;
    recoverable?: boolean;
  };
}

// Callback type for event listeners
export type EventCallback<T = any> = (data: T) => void;

// Interface for the event emitter
export interface IEventEmitter {
  // Subscribe to an event
  on<K extends ShaderAppEventType>(
    event: K,
    callback: EventCallback<ShaderAppEventMap[K]>
  ): void;

  // Unsubscribe from an event
  off<K extends ShaderAppEventType>(
    event: K,
    callback: EventCallback<ShaderAppEventMap[K]>
  ): void;

  // Emit an event
  emit<K extends ShaderAppEventType>(
    event: K,
    data: ShaderAppEventMap[K]
  ): void;
}

// Parameter value validation result
export interface ValidationResult {
  valid: boolean;
  message?: string;
  suggestedValue?: any;
}

// Parameter update options
export interface ParameterUpdateOptions {
  // Whether to skip validation for the parameter update
  skipValidation?: boolean;

  // Whether to defer updating the actual shader until later (for batch updates)
  deferUpdate?: boolean;

  // Source of the parameter update (for event emission)
  source?: "user" | "preset" | "initialization";

  // Whether to recreate geometry after this parameter update
  recreateGeometry?: boolean;

  // Whether to reset the camera after this parameter update
  resetCamera?: boolean;
}

// Batch parameter update options
export interface BatchUpdateOptions extends ParameterUpdateOptions {
  // Parameters to update as a record of parameter names to values
  params: Partial<ShaderParams>;
}

// Preset management interfaces
export interface PresetInfo {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  timestamp?: number;
  isBuiltIn?: boolean;
}

export interface SavePresetOptions {
  name: string;
  description?: string;
  includeCamera?: boolean;
  overwrite?: boolean;
}

// Export options
export interface ExportImageOptions {
  transparent?: boolean;
  highQuality?: boolean;
  width?: number;
  height?: number;
  format?: "png" | "jpg" | "webp";
  fileName?: string;
}

export interface ExportCodeOptions {
  format?: "glsl" | "js" | "ts" | "html";
  includeLib?: boolean;
  minify?: boolean;
  fileName?: string;
}

// Main ShaderAppFacade interface
export interface IShaderAppFacade extends IEventEmitter {
  // === Initialization and Lifecycle ===

  /**
   * Initialize the shader app with the provided container element
   * @param container The DOM element to render the shader in
   * @returns A promise that resolves when initialization is complete
   */
  initialize(container: HTMLElement): Promise<void>;

  /**
   * Dispose of the shader app and clean up resources
   */
  dispose(): void;

  /**
   * Check if the shader app is initialized
   */
  isInitialized(): boolean;

  // === Parameter Management ===

  /**
   * Get the current value of a parameter
   * @param paramName The name of the parameter to get
   * @returns The current value of the parameter
   */
  getParam<K extends keyof ShaderParams>(paramName: K): ShaderParams[K];

  /**
   * Get all current parameter values
   * @returns A copy of all current parameter values
   */
  getAllParams(): ShaderParams;

  /**
   * Update a single parameter
   * @param paramName The name of the parameter to update
   * @param value The new value for the parameter
   * @param options Options for the parameter update
   * @returns Whether the update was successful
   */
  updateParam<K extends keyof ShaderParams>(
    paramName: K,
    value: ShaderParams[K],
    options?: ParameterUpdateOptions
  ): boolean;

  /**
   * Update multiple parameters at once
   * @param updates Record of parameter names to values
   * @param options Options for the batch update
   * @returns Whether the update was successful
   */
  batchUpdateParams(
    updates: Partial<ShaderParams>,
    options?: ParameterUpdateOptions
  ): boolean;

  /**
   * Validate a parameter value without updating it
   * @param paramName The name of the parameter to validate
   * @param value The value to validate
   * @returns The validation result
   */
  validateParam<K extends keyof ShaderParams>(
    paramName: K,
    value: any
  ): ValidationResult;

  // === Preset Management ===

  /**
   * Get a list of available presets
   * @returns Array of preset information
   */
  getAvailablePresets(): PresetInfo[];

  /**
   * Apply a preset by name
   * @param presetName The name of the preset to apply
   * @returns Whether the preset was applied successfully
   */
  applyPreset(presetName: string): boolean;

  /**
   * Save the current parameters as a preset
   * @param options Options for saving the preset
   * @returns Whether the preset was saved successfully
   */
  savePreset(options: SavePresetOptions): boolean;

  /**
   * Delete a preset by name
   * @param presetName The name of the preset to delete
   * @returns Whether the preset was deleted successfully
   */
  deletePreset(presetName: string): boolean;

  // === Geometry Management ===

  /**
   * Recreate the geometry with current parameters
   * @param highQuality Whether to use high quality settings
   */
  recreateGeometry(highQuality?: boolean): void;

  /**
   * Set the geometry type and recreate
   * @param geometryType The type of geometry to create ('plane', 'sphere', 'cube')
   */
  setGeometryType(geometryType: string): void;

  // === Camera Management ===

  /**
   * Set the camera position
   * @param x X position
   * @param y Y position
   * @param z Z position
   */
  setCameraPosition(x: number, y: number, z: number): void;

  /**
   * Set the camera target (look at point)
   * @param x X position
   * @param y Y position
   * @param z Z position
   */
  setCameraTarget(x: number, y: number, z: number): void;

  /**
   * Reset the camera to default position
   */
  resetCamera(): void;

  // === Rendering and Animation ===

  /**
   * Start the animation loop
   */
  startAnimation(): void;

  /**
   * Stop the animation loop
   */
  stopAnimation(): void;

  /**
   * Check if animation is currently running
   */
  isAnimating(): boolean;

  /**
   * Render a single frame
   */
  renderFrame(): void;

  // === Export ===

  /**
   * Export the current state as an image
   * @param options Export options
   * @returns Promise that resolves with the exported image
   */
  exportAsImage(options?: ExportImageOptions): Promise<string>;

  /**
   * Export the current state as code
   * @param options Export options
   * @returns Promise that resolves with the exported code
   */
  exportAsCode(options?: ExportCodeOptions): Promise<string>;
}
