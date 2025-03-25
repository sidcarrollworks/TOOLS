/**
 * Mock implementation of ShaderAppFacade for testing
 * Simulates the behavior of the real facade without requiring WebGL or actual ShaderApp
 */

import { EventEmitter } from "../EventEmitter";
import type {
  IShaderAppFacade,
  ParameterUpdateOptions,
  ValidationResult,
  PresetInfo,
  SavePresetOptions,
  ExportImageOptions,
  ExportCodeOptions,
  ShaderAppEventType,
  ShaderAppEventMap,
} from "../types";
import type { ShaderParams } from "../../ShaderApp";

/**
 * Default mock parameters to initialize the mock facade with
 */
export const DEFAULT_MOCK_PARAMS: Partial<ShaderParams> = {
  // Geometry parameters
  geometryType: "plane",
  planeWidth: 10,
  planeHeight: 10,
  planeSegments: 32,
  sphereRadius: 5,
  sphereWidthSegments: 32,
  sphereHeightSegments: 32,
  cubeSize: 5,
  cubeSegments: 1,

  // Color parameters
  gradientMode: 0,
  color1: "#ff0000",
  color2: "#00ff00",
  color3: "#0000ff",
  color4: "#ffff00",
  colorNoiseScale: 0.1,
  colorNoiseSpeed: 0.5,
  backgroundColor: "#000000",
  exportTransparentBg: false,

  // Camera parameters
  cameraDistance: 15,
  cameraFov: 45,
  cameraPosX: 0,
  cameraPosY: 0,
  cameraPosZ: 15,
  cameraTargetX: 0,
  cameraTargetY: 0,
  cameraTargetZ: 0,

  // Animation parameters
  pauseAnimation: false,
};

/**
 * Mock preset data
 */
export const MOCK_PRESETS: Record<string, () => void> = {
  Default: () => {},
  "Ocean Waves": () => {},
  "Lava Flow": () => {},
  "Abstract Art": () => {},
};

/**
 * Mock implementation of ShaderAppFacade for testing
 * Stores parameter values and emits events, but doesn't perform actual rendering
 */
export class MockShaderAppFacade
  extends EventEmitter
  implements IShaderAppFacade
{
  /**
   * Whether the mock facade is initialized
   */
  private initialized = false;

  /**
   * Container element reference
   */
  private container: HTMLElement | null = null;

  /**
   * Current parameter values
   */
  private params: Partial<ShaderParams>;

  /**
   * Animation frame ID
   */
  private animationFrameId: number | null = null;

  /**
   * Frame counter for mock rendering
   */
  private frameCount = 0;

  /**
   * Mock validation rules for parameters
   */
  private validationRules: Record<string, (value: any) => ValidationResult> =
    {};

  /**
   * Constructor for MockShaderAppFacade
   * @param params Initial parameter values (optional)
   */
  constructor(params?: Partial<ShaderParams>) {
    super();
    // Initialize with default mock params and any provided params
    this.params = { ...DEFAULT_MOCK_PARAMS, ...params };

    // Initialize validation rules
    this.setupValidationRules();
  }

  /**
   * Initialize the mock facade
   * @param container The DOM element to render in (not actually used for rendering)
   */
  public async initialize(container: HTMLElement): Promise<void> {
    // Store the container
    this.container = container;

    // Simulate initialization delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mark as initialized
    this.initialized = true;

    return Promise.resolve();
  }

  /**
   * Dispose of the mock facade
   */
  public dispose(): void {
    // Stop animation if running
    this.stopAnimation();

    // Clear container
    this.container = null;

    // Mark as not initialized
    this.initialized = false;

    // Clear event listeners
    this.clearListeners();
  }

  /**
   * Check if the mock facade is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get a parameter value
   * @param paramName The parameter name
   */
  public getParam<K extends keyof ShaderParams>(paramName: K): ShaderParams[K] {
    this.ensureInitialized();

    return this.params[paramName] as ShaderParams[K];
  }

  /**
   * Get all parameter values
   */
  public getAllParams(): ShaderParams {
    this.ensureInitialized();

    return this.params as ShaderParams;
  }

  /**
   * Update a parameter value
   * @param paramName The parameter name
   * @param value The new value
   * @param options Update options
   */
  public updateParam<K extends keyof ShaderParams>(
    paramName: K,
    value: ShaderParams[K],
    options: ParameterUpdateOptions = {}
  ): boolean {
    this.ensureInitialized();

    // Validate the value unless validation is skipped
    if (!options.skipValidation) {
      const validation = this.validateParam(paramName, value);
      if (!validation.valid) {
        this.emit("error", {
          message: `Invalid value for parameter ${String(paramName)}: ${
            validation.message
          }`,
          code: "INVALID_PARAMETER",
          source: "parameter-update",
          recoverable: true,
        });
        return false;
      }
    }

    // Store the old value
    const oldValue = this.params[paramName];

    // Update the parameter
    this.params[paramName] = value as any;

    // Emit the parameter changed event if value actually changed
    if (oldValue !== value) {
      this.emit("parameter-changed", {
        paramName: paramName as string,
        value,
        source: options.source || "user",
      });
    }

    // Handle geometry recreation if needed
    if (
      options.recreateGeometry ||
      this.shouldRecreateGeometryForParam(paramName)
    ) {
      this.recreateGeometry();
    }

    return true;
  }

  /**
   * Update multiple parameters at once
   * @param updates Parameter updates
   * @param options Update options
   */
  public batchUpdateParams(
    updates: Partial<ShaderParams>,
    options: ParameterUpdateOptions = {}
  ): boolean {
    this.ensureInitialized();

    // Validate all values unless validation is skipped
    if (!options.skipValidation) {
      const invalidParams: string[] = [];

      for (const [paramName, value] of Object.entries(updates)) {
        const validation = this.validateParam(
          paramName as keyof ShaderParams,
          value
        );
        if (!validation.valid) {
          invalidParams.push(paramName);
        }
      }

      if (invalidParams.length > 0) {
        this.emit("error", {
          message: `Invalid values for parameters: ${invalidParams.join(", ")}`,
          code: "INVALID_PARAMETERS",
          source: "batch-update",
          recoverable: true,
        });
        return false;
      }
    }

    // Keep track if any parameter requires geometry recreation
    let shouldRecreateGeometry = options.recreateGeometry || false;

    // Update all parameters
    for (const [paramName, value] of Object.entries(updates)) {
      // Check if this parameter requires geometry recreation
      if (
        this.shouldRecreateGeometryForParam(paramName as keyof ShaderParams)
      ) {
        shouldRecreateGeometry = true;
      }

      // Store the old value
      const oldValue = this.params[paramName as keyof ShaderParams];

      // Update the parameter
      this.params[paramName as keyof ShaderParams] = value as any;

      // Emit event if value changed
      if (oldValue !== value) {
        this.emit("parameter-changed", {
          paramName,
          value,
          source: options.source || "user",
        });
      }
    }

    // Recreate geometry if needed
    if (shouldRecreateGeometry) {
      this.recreateGeometry();
    }

    return true;
  }

  /**
   * Validate a parameter value
   * @param paramName The parameter name
   * @param value The value to validate
   */
  public validateParam<K extends keyof ShaderParams>(
    paramName: K,
    value: any
  ): ValidationResult {
    // Get the validation rule for this parameter
    const rule = this.validationRules[paramName as string];

    // If there's no rule, consider it valid
    if (!rule) {
      return { valid: true };
    }

    // Apply the validation rule
    return rule(value);
  }

  /**
   * Get available presets
   */
  public getAvailablePresets(): PresetInfo[] {
    this.ensureInitialized();

    return Object.keys(MOCK_PRESETS).map((name) => ({
      name,
      isBuiltIn: true,
    }));
  }

  /**
   * Apply a preset
   * @param presetName The preset name
   */
  public applyPreset(presetName: string): boolean {
    this.ensureInitialized();

    // Check if the preset exists
    if (!MOCK_PRESETS[presetName]) {
      this.emit("error", {
        message: `Preset not found: ${presetName}`,
        code: "PRESET_NOT_FOUND",
        source: "preset-apply",
        recoverable: true,
      });
      return false;
    }

    // Apply the preset (in a real implementation, this would update parameters)
    MOCK_PRESETS[presetName]();

    // For mock purposes, we'll update all parameters to simulate a preset
    // In a real implementation, the preset would update specific parameters
    this.emit("preset-applied", {
      presetName,
      affectedParams: Object.keys(this.params),
    });

    return true;
  }

  /**
   * Save current parameters as a preset
   * @param options Preset save options
   */
  public savePreset(options: SavePresetOptions): boolean {
    this.ensureInitialized();

    // For mock purposes, we'll just return true
    return true;
  }

  /**
   * Delete a preset
   * @param presetName The preset name
   */
  public deletePreset(presetName: string): boolean {
    this.ensureInitialized();

    // Check if it's a built-in preset
    if (Object.keys(MOCK_PRESETS).includes(presetName)) {
      this.emit("error", {
        message: `Cannot delete built-in preset: ${presetName}`,
        code: "CANNOT_DELETE_BUILTIN",
        source: "preset-delete",
        recoverable: true,
      });
      return false;
    }

    // For mock purposes, we'll just return true
    return true;
  }

  /**
   * Recreate the geometry
   * @param highQuality Whether to use high quality
   */
  public recreateGeometry(highQuality = false): void {
    this.ensureInitialized();

    // Emit geometry changed event
    this.emit("geometry-changed", {
      geometryType: this.params.geometryType as string,
      recreated: true,
    });
  }

  /**
   * Set the geometry type
   * @param geometryType The type of geometry
   */
  public setGeometryType(geometryType: string): void {
    this.updateParam("geometryType", geometryType, { recreateGeometry: true });
  }

  /**
   * Set the camera position
   * @param x X position
   * @param y Y position
   * @param z Z position
   */
  public setCameraPosition(x: number, y: number, z: number): void {
    this.ensureInitialized();

    // Update camera position parameters
    this.batchUpdateParams({
      cameraPosX: x,
      cameraPosY: y,
      cameraPosZ: z,
    });
  }

  /**
   * Set the camera target
   * @param x X position
   * @param y Y position
   * @param z Z position
   */
  public setCameraTarget(x: number, y: number, z: number): void {
    this.ensureInitialized();

    // Update camera target parameters
    this.batchUpdateParams({
      cameraTargetX: x,
      cameraTargetY: y,
      cameraTargetZ: z,
    });
  }

  /**
   * Reset the camera
   */
  public resetCamera(): void {
    this.ensureInitialized();

    // Reset camera to default values
    this.batchUpdateParams({
      cameraPosX: DEFAULT_MOCK_PARAMS.cameraPosX,
      cameraPosY: DEFAULT_MOCK_PARAMS.cameraPosY,
      cameraPosZ: DEFAULT_MOCK_PARAMS.cameraPosZ,
      cameraTargetX: DEFAULT_MOCK_PARAMS.cameraTargetX,
      cameraTargetY: DEFAULT_MOCK_PARAMS.cameraTargetY,
      cameraTargetZ: DEFAULT_MOCK_PARAMS.cameraTargetZ,
    });
  }

  /**
   * Start the animation loop
   */
  public startAnimation(): void {
    this.ensureInitialized();

    // If already animating, do nothing
    if (this.isAnimating()) {
      return;
    }

    // Update animation parameter
    this.updateParam("pauseAnimation", false);

    // Start the animation loop
    const animate = () => {
      // Only continue if still animating
      if (!this.isAnimating()) {
        return;
      }

      this.animationFrameId = requestAnimationFrame(animate);

      // Increment frame counter
      this.frameCount++;

      // Emit render complete event
      this.emit("render-complete", {
        frameTime: performance.now(),
        frameCount: this.frameCount,
      });
    };

    // Start the loop
    this.animationFrameId = requestAnimationFrame(animate);

    // Emit animation started event
    this.emit("animation-started", undefined);
  }

  /**
   * Stop the animation loop
   */
  public stopAnimation(): void {
    // If not animating, do nothing
    if (!this.isAnimating()) {
      return;
    }

    // Update animation parameter
    this.updateParam("pauseAnimation", true);

    // Stop the animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Emit animation stopped event
    this.emit("animation-stopped", undefined);
  }

  /**
   * Check if animation is running
   */
  public isAnimating(): boolean {
    return this.animationFrameId !== null;
  }

  /**
   * Render a single frame
   */
  public renderFrame(): void {
    this.ensureInitialized();

    // Increment frame counter
    this.frameCount++;

    // Emit render complete event
    this.emit("render-complete", {
      frameTime: performance.now(),
      frameCount: this.frameCount,
    });
  }

  /**
   * Export as image
   * @param options Export options
   */
  public async exportAsImage(
    options: ExportImageOptions = {}
  ): Promise<string> {
    this.ensureInitialized();

    // Emit export started event
    this.emit("export-started", {
      type: "image",
      settings: options,
    });

    // Simple delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock image data URL
    const mockImageUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    // Emit export complete event
    this.emit("export-complete", {
      type: "image",
      result: mockImageUrl,
    });

    return mockImageUrl;
  }

  /**
   * Export as code
   * @param options Export options
   */
  public async exportAsCode(options: ExportCodeOptions = {}): Promise<string> {
    this.ensureInitialized();

    // Emit export started event
    this.emit("export-started", {
      type: "code",
      settings: options,
    });

    // Simple delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock code
    const mockCode = `// Generated GLSL code
void main() {
  // Mock implementation for testing
}`;

    // Emit export complete event
    this.emit("export-complete", {
      type: "code",
      result: mockCode,
    });

    return mockCode;
  }

  // === Private Helper Methods ===

  /**
   * Ensure the mock facade is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error(
        "MockShaderAppFacade is not initialized. Call initialize() first."
      );
    }
  }

  /**
   * Check if a parameter requires recreating geometry
   * @private
   * @param paramName The parameter name
   */
  private shouldRecreateGeometryForParam(
    paramName: keyof ShaderParams
  ): boolean {
    // List of parameters that require geometry recreation
    const geometryParams = [
      "geometryType",
      "planeWidth",
      "planeHeight",
      "planeSegments",
      "sphereRadius",
      "sphereWidthSegments",
      "sphereHeightSegments",
      "cubeSize",
      "cubeSegments",
    ];

    return geometryParams.includes(paramName as string);
  }

  /**
   * Set up validation rules for parameters
   * @private
   */
  private setupValidationRules(): void {
    // Define validation rules for parameters
    this.validationRules = {
      // Geometry validation
      planeWidth: (value) => this.validateNumberRange(value, 0.1, 100),
      planeHeight: (value) => this.validateNumberRange(value, 0.1, 100),
      planeSegments: (value) => this.validateNumberRange(value, 1, 256),
      sphereRadius: (value) => this.validateNumberRange(value, 0.1, 100),
      sphereWidthSegments: (value) => this.validateNumberRange(value, 4, 256),
      sphereHeightSegments: (value) => this.validateNumberRange(value, 4, 256),
      cubeSize: (value) => this.validateNumberRange(value, 0.1, 100),
      cubeSegments: (value) => this.validateNumberRange(value, 1, 64),

      // Color validation
      color1: (value) => this.validateColor(value),
      color2: (value) => this.validateColor(value),
      color3: (value) => this.validateColor(value),
      color4: (value) => this.validateColor(value),
      backgroundColor: (value) => this.validateColor(value),

      // Numeric validation
      cameraPosX: (value) => this.validateNumberRange(value, -1000, 1000),
      cameraPosY: (value) => this.validateNumberRange(value, -1000, 1000),
      cameraPosZ: (value) => this.validateNumberRange(value, -1000, 1000),
      cameraTargetX: (value) => this.validateNumberRange(value, -1000, 1000),
      cameraTargetY: (value) => this.validateNumberRange(value, -1000, 1000),
      cameraTargetZ: (value) => this.validateNumberRange(value, -1000, 1000),
      cameraFov: (value) => this.validateNumberRange(value, 1, 179),
    };
  }

  /**
   * Validate a number is within a range
   * @private
   * @param value The value to validate
   * @param min Minimum allowed value
   * @param max Maximum allowed value
   */
  private validateNumberRange(
    value: any,
    min: number,
    max: number
  ): ValidationResult {
    // Check if it's a number
    if (typeof value !== "number" || isNaN(value)) {
      return {
        valid: false,
        message: "Value must be a number",
      };
    }

    // Check range
    if (value < min || value > max) {
      return {
        valid: false,
        message: `Value must be between ${min} and ${max}`,
        suggestedValue: Math.max(min, Math.min(max, value)),
      };
    }

    return { valid: true };
  }

  /**
   * Validate a color string
   * @private
   * @param value The value to validate
   */
  private validateColor(value: any): ValidationResult {
    // Check if it's a string
    if (typeof value !== "string") {
      return {
        valid: false,
        message: "Color must be a string",
      };
    }

    // Regular expression for valid hex colors
    const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;

    if (!hexColorRegex.test(value)) {
      return {
        valid: false,
        message: "Color must be a valid hex color (e.g., #FF0000)",
        suggestedValue: "#000000",
      };
    }

    return { valid: true };
  }
}
