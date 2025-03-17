/**
 * ShaderAppFacade implementation
 * Provides a clean interface between UI components and the ShaderApp core
 */

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
} from "./types";
import { EventEmitter } from "./EventEmitter";
import type { FacadeConfig } from "./FacadeConfig";
import { createConfig } from "./FacadeConfig";
import type { ShaderApp, ShaderParams } from "../ShaderApp";
import { validateSetting } from "../settings/mappings/utils";

/**
 * Implementation of the ShaderAppFacade interface
 * Acts as an adapter between UI components and the ShaderApp
 */
export class ShaderAppFacade extends EventEmitter implements IShaderAppFacade {
  /**
   * The ShaderApp instance being wrapped
   * @private
   */
  private app: ShaderApp | null = null;

  /**
   * Whether the app has been initialized
   * @private
   */
  private initialized = false;

  /**
   * The configuration for the facade
   * @private
   */
  private config: FacadeConfig;

  /**
   * The HTML container element for the shader app
   * @private
   */
  private container: HTMLElement | null = null;

  /**
   * Animation frame ID for the update loop
   * @private
   */
  private animationFrameId: number | null = null;

  /**
   * Performance tracking for update frequency
   * @private
   */
  private updateTimestamps: number[] = [];

  /**
   * Debounce timeouts for parameter updates
   * @private
   */
  private debounceTimeouts: Record<string, number> = {};

  /**
   * Constructor for the ShaderAppFacade
   * @param app The ShaderApp instance to wrap (optional, can be set later)
   * @param config Custom configuration for the facade
   */
  constructor(app?: ShaderApp, config?: Partial<FacadeConfig>) {
    super();
    this.app = app || null;
    this.config = createConfig(config);

    // If app is provided, check if it's already initialized
    if (app && app.scene) {
      this.initialized = true;
    }
  }

  /**
   * Initialize the shader app with the provided container element
   * @param container The DOM element to render the shader in
   * @returns A promise that resolves when initialization is complete
   */
  public async initialize(container: HTMLElement): Promise<void> {
    // Store the container element
    this.container = container;

    // Ensure we have an app instance
    if (!this.app) {
      // Dynamic import to avoid circular dependencies
      const { ShaderApp } = await import("../ShaderApp");
      this.app = new ShaderApp();
    }

    try {
      // Initialize the app
      const success = await this.app.init(container);

      if (!success) {
        throw new Error("Failed to initialize ShaderApp");
      }

      this.initialized = true;

      // Start performance monitoring if enabled
      if (this.config.performance.enableStats && this.app.stats) {
        container.appendChild(this.app.stats.dom);
        this.app.stats.dom.style.display = "block"; // Make sure it's visible if enabled
      } else if (this.app.stats) {
        // Make sure stats are hidden by default if not enabled
        this.app.stats.dom.style.display = "none";
      }

      // We don't start the animation loop here anymore since ShaderApp does it
      // Just set the animationFrameId to a dummy value to indicate we're ready to animate
      if (!this.app.params.pauseAnimation) {
        this.animationFrameId = 1;
      }

      // Log debug information if enabled
      if (this.config.debug.enabled) {
        console.log("ShaderAppFacade initialized successfully");
      }
    } catch (error) {
      // Emit error event
      this.emit("error", {
        message: "Failed to initialize ShaderApp",
        source: "initialization",
        recoverable: false,
      });

      // Re-throw the error for the caller to handle
      throw error;
    }
  }

  /**
   * Dispose of the shader app and clean up resources
   */
  public dispose(): void {
    // Clear any debounce timeouts
    Object.values(this.debounceTimeouts).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    this.debounceTimeouts = {};

    // Reset our tracking flag for animation
    this.animationFrameId = null;

    // Dispose of the app - this will handle canceling any animation frame
    if (this.app) {
      this.app.dispose();
      this.app = null;
    }

    // Reset initialized state
    this.initialized = false;

    // Remove all event listeners
    this.clearListeners();

    // Clear performance tracking
    this.updateTimestamps = [];

    // Log debug information if enabled
    if (this.config.debug.enabled) {
      console.log("ShaderAppFacade disposed successfully");
    }
  }

  /**
   * Check if the shader app is initialized
   * @returns Whether the app is initialized
   */
  public isInitialized(): boolean {
    return this.initialized && !!this.app;
  }

  // === Parameter Management ===

  /**
   * Get the current value of a parameter
   * @param paramName The name of the parameter to get
   * @returns The current value of the parameter
   */
  public getParam<K extends keyof ShaderParams>(paramName: K): ShaderParams[K] {
    this.ensureInitialized();

    // TypeScript knows this is safe because of ensureInitialized
    return this.app!.params[paramName];
  }

  /**
   * Get all current parameter values
   * @returns A copy of all current parameter values
   */
  public getAllParams(): ShaderParams {
    this.ensureInitialized();

    // Create a deep copy to prevent direct modification
    return JSON.parse(JSON.stringify(this.app!.params));
  }

  /**
   * Update a single parameter
   * @param paramName The name of the parameter to update
   * @param value The new value for the parameter
   * @param options Options for the parameter update
   * @returns Whether the update was successful
   */
  public updateParam<K extends keyof ShaderParams>(
    paramName: K,
    value: ShaderParams[K],
    options: ParameterUpdateOptions = {}
  ): boolean {
    this.ensureInitialized();

    // Log parameter update if debug is enabled
    if (this.config.debug.logParameterUpdates) {
      console.log(`Parameter update: ${String(paramName)} =`, value);
    }

    // Track update frequency for performance optimization
    if (this.config.debug.trackUpdateFrequencies) {
      this.trackUpdateFrequency();
    }

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

    try {
      // Store the old value for comparison
      const oldValue = this.app!.params[paramName];

      // Update the parameter in the app
      (this.app!.params as any)[paramName] = value;

      // Determine if we should update the shader
      const shouldUpdate = !options.deferUpdate;

      // Update shader parameters if needed
      if (shouldUpdate) {
        // Determine whether to recreate geometry
        const recreateGeometry =
          options.recreateGeometry ||
          this.shouldRecreateGeometryForParam(paramName);

        // Determine whether to reset camera
        const resetCamera = options.resetCamera || false;

        // Update the shader with the new parameters
        this.app!.updateParams(resetCamera);

        // Recreate geometry if needed
        if (recreateGeometry) {
          this.recreateGeometry();
        }
      }

      // Only emit event if the value actually changed
      if (oldValue !== value) {
        // Emit parameter changed event
        this.emit("parameter-changed", {
          paramName: paramName as string,
          value,
          source: options.source || "user",
        });
      }

      return true;
    } catch (error) {
      // Handle errors during parameter update
      this.emit("error", {
        message: `Error updating parameter ${String(paramName)}: ${
          (error as Error).message
        }`,
        code: "UPDATE_ERROR",
        source: "parameter-update",
        recoverable: true,
      });
      console.error(`Error updating parameter ${String(paramName)}:`, error);
      return false;
    }
  }

  /**
   * Update multiple parameters at once
   * @param updates Record of parameter names to values
   * @param options Options for the batch update
   * @returns Whether the update was successful
   */
  public batchUpdateParams(
    updates: Partial<ShaderParams>,
    options: ParameterUpdateOptions = {}
  ): boolean {
    this.ensureInitialized();

    // Validate all values unless validation is skipped
    if (!options.skipValidation) {
      const invalidParams: string[] = [];

      // Check each parameter
      for (const [paramName, value] of Object.entries(updates)) {
        const validation = this.validateParam(
          paramName as keyof ShaderParams,
          value
        );
        if (!validation.valid) {
          invalidParams.push(paramName);
        }
      }

      // If any parameters are invalid, return false
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

    try {
      let shouldRecreateGeometry = options.recreateGeometry || false;

      // Update all parameters
      for (const [paramName, value] of Object.entries(updates)) {
        // Check if any parameter requires geometry recreation
        if (
          this.shouldRecreateGeometryForParam(paramName as keyof ShaderParams)
        ) {
          shouldRecreateGeometry = true;
        }

        // Update the parameter in the app
        (this.app!.params as any)[paramName] = value;

        // Emit parameter changed event for each parameter
        this.emit("parameter-changed", {
          paramName,
          value,
          source: options.source || "user",
        });
      }

      // Determine if we should update the shader
      const shouldUpdate = !options.deferUpdate;

      // Update shader parameters if needed
      if (shouldUpdate) {
        // Determine whether to reset camera
        const resetCamera = options.resetCamera || false;

        // Update the shader with the new parameters
        this.app!.updateParams(resetCamera);

        // Recreate geometry if needed
        if (shouldRecreateGeometry) {
          this.recreateGeometry();
        }
      }

      return true;
    } catch (error) {
      // Handle errors during batch update
      this.emit("error", {
        message: `Error during batch parameter update: ${
          (error as Error).message
        }`,
        code: "BATCH_UPDATE_ERROR",
        source: "batch-update",
        recoverable: true,
      });
      console.error("Error during batch parameter update:", error);
      return false;
    }
  }

  /**
   * Validate a parameter value without updating it
   * @param paramName The name of the parameter to validate
   * @param value The value to validate
   * @returns The validation result
   */
  public validateParam<K extends keyof ShaderParams>(
    paramName: K,
    value: any
  ): ValidationResult {
    // This doesn't require initialization since it doesn't access ShaderApp

    // Default to valid
    const result: ValidationResult = { valid: true };

    try {
      // Use setting validation from the mapping system
      const valid = validateSetting(paramName as string, value);

      if (!valid) {
        result.valid = false;
        result.message = `Value out of range or incorrect type for ${String(
          paramName
        )}`;
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

  // === Preset Management ===

  /**
   * Get a list of available presets
   * @returns Array of preset information
   */
  public getAvailablePresets(): PresetInfo[] {
    this.ensureInitialized();

    // Get built-in presets from the app
    const builtInPresets: PresetInfo[] = Object.keys(this.app!.presets).map(
      (name) => ({
        name,
        isBuiltIn: true,
      })
    );

    // TODO: Add user-saved presets when implemented

    return builtInPresets;
  }

  /**
   * Apply a preset by name
   * @param presetName The name of the preset to apply
   * @returns Whether the preset was applied successfully
   */
  public applyPreset(presetName: string): boolean {
    this.ensureInitialized();

    // Get the preset function
    const presetFn = this.app!.presets[presetName];

    if (!presetFn) {
      this.emit("error", {
        message: `Preset not found: ${presetName}`,
        code: "PRESET_NOT_FOUND",
        source: "preset-apply",
        recoverable: true,
      });
      return false;
    }

    try {
      // Save initial params for comparison
      const initialParams = JSON.stringify(this.app!.params);

      // Apply the preset
      presetFn();

      // Get final params for comparison
      const finalParams = JSON.stringify(this.app!.params);

      // Compute affected parameters
      let affectedParams: string[] = [];
      if (initialParams !== finalParams) {
        // Detailed comparison would be better, but this is a simple approach
        affectedParams = Object.keys(this.app!.params);
      }

      // Emit preset applied event
      this.emit("preset-applied", {
        presetName,
        affectedParams,
      });

      return true;
    } catch (error) {
      // Handle errors during preset application
      this.emit("error", {
        message: `Error applying preset ${presetName}: ${
          (error as Error).message
        }`,
        code: "PRESET_APPLY_ERROR",
        source: "preset-apply",
        recoverable: true,
      });
      console.error(`Error applying preset ${presetName}:`, error);
      return false;
    }
  }

  /**
   * Save the current parameters as a preset
   * @param options Options for saving the preset
   * @returns Whether the preset was saved successfully
   */
  public savePreset(options: SavePresetOptions): boolean {
    this.ensureInitialized();

    // TODO: Implement user-saved presets
    // This will require storage mechanism (localStorage, IndexedDB, etc.)

    console.warn("savePreset not fully implemented yet");
    return false;
  }

  /**
   * Delete a preset by name
   * @param presetName The name of the preset to delete
   * @returns Whether the preset was deleted successfully
   */
  public deletePreset(presetName: string): boolean {
    this.ensureInitialized();

    // Check if it's a built-in preset
    if (this.app!.presets[presetName]) {
      // Cannot delete built-in presets
      this.emit("error", {
        message: `Cannot delete built-in preset: ${presetName}`,
        code: "CANNOT_DELETE_BUILTIN",
        source: "preset-delete",
        recoverable: true,
      });
      return false;
    }

    // TODO: Implement deletion of user-saved presets

    console.warn("deletePreset not fully implemented yet");
    return false;
  }

  // === Geometry Management ===

  /**
   * Recreate the geometry with current parameters
   * @param highQuality Whether to use high quality settings
   */
  public recreateGeometry(highQuality = false): void {
    this.ensureInitialized();

    try {
      // Get the current geometry type
      const geometryType = this.app!.params.geometryType;

      // Recreate the geometry
      if (highQuality) {
        this.app!.recreateGeometryHighQuality();
      } else {
        this.app!.recreateGeometry();
      }

      // Emit geometry changed event
      this.emit("geometry-changed", {
        geometryType,
        recreated: true,
      });
    } catch (error) {
      // Handle errors during geometry recreation
      this.emit("error", {
        message: `Error recreating geometry: ${(error as Error).message}`,
        code: "GEOMETRY_RECREATE_ERROR",
        source: "geometry-management",
        recoverable: true,
      });
      console.error("Error recreating geometry:", error);
    }
  }

  /**
   * Set the geometry type and recreate
   * @param geometryType The type of geometry to create ('plane', 'sphere', 'cube')
   */
  public setGeometryType(geometryType: string): void {
    // Update the geometry type parameter
    this.updateParam("geometryType", geometryType, { recreateGeometry: true });
  }

  // === Camera Management ===

  /**
   * Set the camera position
   * @param x X position
   * @param y Y position
   * @param z Z position
   */
  public setCameraPosition(x: number, y: number, z: number): void {
    this.ensureInitialized();

    try {
      // Update the camera position parameters
      this.batchUpdateParams(
        {
          cameraPosX: x,
          cameraPosY: y,
          cameraPosZ: z,
        },
        { deferUpdate: true }
      );

      // Update the camera directly for immediate effect
      if (this.app!.camera) {
        this.app!.camera.position.set(x, y, z);
      }

      // Update controls if they exist
      if (this.app!.controls) {
        this.app!.controls.update();
      }
    } catch (error) {
      // Handle errors during camera position update
      this.emit("error", {
        message: `Error setting camera position: ${(error as Error).message}`,
        code: "CAMERA_POSITION_ERROR",
        source: "camera-management",
        recoverable: true,
      });
      console.error("Error setting camera position:", error);
    }
  }

  /**
   * Set the camera target (look at point)
   * @param x X position
   * @param y Y position
   * @param z Z position
   */
  public setCameraTarget(x: number, y: number, z: number): void {
    this.ensureInitialized();

    try {
      // Update the camera target parameters
      this.batchUpdateParams(
        {
          cameraTargetX: x,
          cameraTargetY: y,
          cameraTargetZ: z,
        },
        { deferUpdate: true }
      );

      // Update the controls target directly for immediate effect
      if (this.app!.controls) {
        this.app!.controls.target.set(x, y, z);
        this.app!.controls.update();
      }
    } catch (error) {
      // Handle errors during camera target update
      this.emit("error", {
        message: `Error setting camera target: ${(error as Error).message}`,
        code: "CAMERA_TARGET_ERROR",
        source: "camera-management",
        recoverable: true,
      });
      console.error("Error setting camera target:", error);
    }
  }

  /**
   * Reset the camera to default position
   */
  public resetCamera(): void {
    this.ensureInitialized();

    try {
      // Use the app's update params with camera reset flag
      this.app!.updateParams(true);
    } catch (error) {
      // Handle errors during camera reset
      this.emit("error", {
        message: `Error resetting camera: ${(error as Error).message}`,
        code: "CAMERA_RESET_ERROR",
        source: "camera-management",
        recoverable: true,
      });
      console.error("Error resetting camera:", error);
    }
  }

  // === Rendering and Animation ===

  /**
   * Start the animation loop
   */
  public startAnimation(): void {
    this.ensureInitialized();

    // If already animating, do nothing
    if (this.isAnimating()) {
      return;
    }

    // Update the animation parameter
    this.updateParam("pauseAnimation", false, { deferUpdate: true });

    // Let ShaderApp handle its own animation loop
    // We don't need to set up a separate animation loop here
    // since ShaderApp.animate() already calls requestAnimationFrame
    this.animationFrameId = 1; // Set a dummy value to indicate animation is running

    // Call animate once to start the ShaderApp animation loop
    this.app!.animate();

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

    // Update the animation parameter to pause
    this.updateParam("pauseAnimation", true, { deferUpdate: true });

    // Reset our tracking flag
    this.animationFrameId = null;

    // Emit animation stopped event
    this.emit("animation-stopped", undefined);
  }

  /**
   * Check if animation is currently running
   */
  public isAnimating(): boolean {
    return this.animationFrameId !== null;
  }

  /**
   * Render a single frame
   */
  public renderFrame(): void {
    this.ensureInitialized();

    try {
      // Call the app's animate method once
      this.app!.animate();

      // Emit render complete event
      const frameTime = performance.now(); // Simple proxy for frame time
      const frameCount = 0; // No frame counter implementation yet

      this.emit("render-complete", { frameTime, frameCount });
    } catch (error) {
      // Handle errors during rendering
      this.emit("error", {
        message: `Error rendering frame: ${(error as Error).message}`,
        code: "RENDER_ERROR",
        source: "rendering",
        recoverable: true,
      });
      console.error("Error rendering frame:", error);
    }
  }

  // === Export ===

  /**
   * Export the current state as an image
   * @param options Export options
   * @returns Promise that resolves with the exported image URL
   */
  public async exportAsImage(
    options: ExportImageOptions = {}
  ): Promise<string> {
    this.ensureInitialized();

    // Merge options with defaults
    const mergedOptions = {
      ...this.config.export.defaultImageExport,
      ...options,
    };

    try {
      // Emit export started event
      this.emit("export-started", {
        type: "image",
        settings: mergedOptions,
      });

      // Set export parameters
      this.app!.params.exportTransparentBg = mergedOptions.transparent;
      this.app!.params.exportHighQuality = mergedOptions.highQuality;

      // Pause animation if it's running
      const wasAnimating = this.isAnimating();
      if (wasAnimating) {
        this.stopAnimation();
      }

      // Render a high-quality frame
      if (mergedOptions.highQuality) {
        this.app!.recreateGeometryHighQuality();
      }
      this.renderFrame();

      // Save the image
      this.app!.saveAsImage();

      // Since the actual saveAsImage doesn't return the URL, we'll simulate the behavior
      // In a real implementation, the exportManager should be modified to return the URL
      const mockImageUrl = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`;

      // Restore animation if it was running
      if (wasAnimating) {
        this.startAnimation();
      }

      // Recreate with normal quality if needed
      if (mergedOptions.highQuality) {
        this.app!.recreateGeometry();
      }

      // Emit export complete event
      this.emit("export-complete", {
        type: "image",
        result: mockImageUrl,
      });

      return mockImageUrl;
    } catch (error) {
      // Handle errors during export
      this.emit("error", {
        message: `Error exporting image: ${(error as Error).message}`,
        code: "IMAGE_EXPORT_ERROR",
        source: "export",
        recoverable: true,
      });
      console.error("Error exporting image:", error);
      throw error;
    }
  }

  /**
   * Export the current state as code
   * @param options Export options
   * @returns Promise that resolves with the exported code
   */
  public async exportAsCode(options: ExportCodeOptions = {}): Promise<string> {
    this.ensureInitialized();

    // Merge options with defaults
    const mergedOptions = {
      ...this.config.export.defaultCodeExport,
      ...options,
    };

    try {
      // Emit export started event
      this.emit("export-started", {
        type: "code",
        settings: mergedOptions,
      });

      // Export the code
      this.app!.exportCode();

      // Since the actual exportCode doesn't return the code, we'll simulate the behavior
      // In a real implementation, the exportManager should be modified to return the code
      const mockCode = `// Generated GLSL code\nvoid main() {\n  // TODO: Implement actual code export\n}`;

      // Emit export complete event
      this.emit("export-complete", {
        type: "code",
        result: mockCode,
      });

      return mockCode;
    } catch (error) {
      // Handle errors during export
      this.emit("error", {
        message: `Error exporting code: ${(error as Error).message}`,
        code: "CODE_EXPORT_ERROR",
        source: "export",
        recoverable: true,
      });
      console.error("Error exporting code:", error);
      throw error;
    }
  }

  // === Private Helper Methods ===

  /**
   * Ensure the app is initialized before trying to use it
   * @private
   * @throws Error if the app is not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error("ShaderApp is not initialized. Call initialize() first.");
    }
  }

  /**
   * Check if a parameter requires recreating geometry when changed
   * @private
   * @param paramName The name of the parameter to check
   * @returns Whether the parameter requires recreating geometry
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
      "cubeWidthSegments",
      "cubeHeightSegments",
      "cubeDepthSegments",
    ];

    return geometryParams.includes(paramName as string);
  }

  /**
   * Track update frequency for performance optimization
   * @private
   */
  private trackUpdateFrequency(): void {
    const now = performance.now();

    // Add current timestamp
    this.updateTimestamps.push(now);

    // Remove timestamps older than 1 second
    this.updateTimestamps = this.updateTimestamps.filter(
      (timestamp) => now - timestamp < 1000
    );

    // Check if we're getting too many updates
    const updateFrequency = this.updateTimestamps.length;

    if (
      this.config.performance.useReducedQualityForFrequentUpdates &&
      updateFrequency > this.config.performance.reducedQualityFrequencyThreshold
    ) {
      // TODO: Implement reduced quality mode for frequent updates
    }
  }
}
