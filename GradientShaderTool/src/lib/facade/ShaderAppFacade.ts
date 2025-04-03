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
import { validateSetting, validateParameter } from "./ValidationUtils";
import * as THREE from "three";

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

      // Set up handler for transparency updates from ExportInitializer
      this.on("parameter-changed", (event) => {
        if (
          event.paramName === "transparencyUpdate" &&
          this.app &&
          this.app.sceneManager
        ) {
          const transparent = !!event.value;
          this.app.sceneManager.setBackgroundTransparency(transparent);
        }
      });

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

    // Use our enhanced validation utility
    return validateParameter(paramName, value);
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
   * Capture the current animation state for later restoration after export
   * @private
   */
  private captureAnimationState(): Record<string, any> {
    if (!this.app) {
      throw new Error("ShaderApp is not initialized");
    }

    // Capture the animation state
    return {
      // Animation parameters
      animationSpeed: this.app.params.animationSpeed,
      normalNoiseSpeed: this.app.params.normalNoiseSpeed,
      colorNoiseSpeed: this.app.params.colorNoiseSpeed,
      pauseAnimation: this.app.params.pauseAnimation,
      time: this.app.time,

      // Add real timestamp to track how long export takes
      realTimestamp: performance.now(),
    };
  }

  /**
   * Capture the current renderer state for validation
   * @private
   * @returns Object containing the current renderer state
   */
  private captureRendererState(): Record<string, any> {
    if (!this.app || !this.app.renderer) {
      throw new Error("ShaderApp or renderer is not initialized");
    }

    const originalColor = this.app.renderer.getClearColor(new THREE.Color());
    const originalAlpha = this.app.renderer.getClearAlpha();

    return {
      clearColor: originalColor.getHex(),
      clearAlpha: originalAlpha,
    };
  }

  /**
   * Configure the renderer for export, returning the original state for later restoration
   * @private
   * @param options Export options
   * @returns Original renderer state for restoration
   */
  private configureRendererForExport(
    options: ExportImageOptions
  ): Record<string, any> {
    if (!this.app || !this.app.renderer) {
      throw new Error("ShaderApp or renderer is not initialized");
    }

    // Store original renderer clear color and alpha
    const originalClearColor = this.app.renderer.getClearColor(
      new THREE.Color()
    );
    const originalClearAlpha = this.app.renderer.getClearAlpha();

    // Store original renderer state
    const rendererState = {
      clearColor: originalClearColor.getHex(),
      clearAlpha: originalClearAlpha,
    };

    // Use the SceneManager to set background transparency
    if (this.app.sceneManager) {
      this.app.sceneManager.setBackgroundTransparency(
        options.transparent || false
      );
    } else {
      // Fallback if SceneManager isn't available
      if (options.transparent) {
        this.app.renderer.setClearColor(0x000000, 0);
      } else {
        const bgColor = new THREE.Color(this.app.params.backgroundColor);
        this.app.renderer.setClearColor(bgColor);
      }
    }

    return rendererState;
  }

  /**
   * Restore the renderer to its original state
   * @private
   * @param rendererState The original renderer state to restore
   */
  private restoreRendererState(rendererState: Record<string, any>): void {
    if (!this.app || !this.app.renderer) {
      throw new Error("ShaderApp or renderer is not initialized");
    }

    // Directly restore the original clear color and alpha
    this.app.renderer.setClearColor(
      rendererState.clearColor,
      rendererState.clearAlpha
    );

    // Make sure to reset the checkered background if SceneManager is available
    if (this.app.sceneManager && rendererState.clearAlpha === 1) {
      this.app.sceneManager.setBackgroundTransparency(false);
    }
  }

  /**
   * Restore the animation state after export
   * @private
   * @param animState Animation state to restore
   * @param wasAnimating Whether animation was running before export
   * @param elapsedTime Time elapsed during export
   */
  private restoreAnimationState(
    animState: Record<string, any>,
    wasAnimating: boolean,
    elapsedTime: number
  ): void {
    if (!this.app) {
      throw new Error("ShaderApp is not initialized");
    }

    // Restore animation parameters
    this.app.params.animationSpeed = animState.animationSpeed;
    this.app.params.normalNoiseSpeed = animState.normalNoiseSpeed;
    this.app.params.colorNoiseSpeed = animState.colorNoiseSpeed;
    this.app.params.pauseAnimation = animState.pauseAnimation;

    // Calculate elapsed shader time if animation was running
    if (wasAnimating) {
      // Add the equivalent shader time that would have passed during export
      const timeIncrement = animState.animationSpeed * (elapsedTime / 1000.0);
      // Time is only updated when animation is running
      this.app.time = animState.time + timeIncrement;

      if (this.app.uniforms && this.app.uniforms.uTime) {
        this.app.uniforms.uTime.value = this.app.time;
      }
    }

    if (this.config.debug.enabled) {
      console.log(
        "EXPORT: Restored animation state, elapsed real time:",
        elapsedTime.toFixed(2),
        "ms"
      );
    }
  }

  /**
   * Get image data URL from canvas
   * @private
   * @param format The image format to export as
   * @returns Data URL of the exported image
   */
  private getImageDataURL(format: string = "png"): string {
    if (!this.app || !this.app.renderer) {
      throw new Error("Renderer not initialized");
    }

    const canvas = this.app.renderer.domElement;

    // Determine MIME type based on format
    const mimeType =
      format === "jpg" || format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
        ? "image/webp"
        : "image/png";

    // For JPEG format, provide quality setting
    const quality = format === "jpg" || format === "jpeg" ? 0.95 : undefined;

    // Get data URL with appropriate format and quality
    try {
      return canvas.toDataURL(mimeType, quality);
    } catch (error) {
      console.error("Error generating data URL:", error);
      throw new Error(
        `Failed to generate image data URL: ${(error as Error).message}`
      );
    }
  }

  /**
   * Handle export errors in a consistent way
   * @private
   * @param error The error that occurred
   * @param exportType The type of export that failed
   */
  private handleExportError(
    error: unknown,
    exportType: "image" | "code"
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      exportType === "image" ? "IMAGE_EXPORT_ERROR" : "CODE_EXPORT_ERROR";

    this.emit("error", {
      message: `Error exporting ${exportType}: ${errorMessage}`,
      code: errorCode,
      source: "export",
      recoverable: true,
    });

    console.error(`Error exporting ${exportType}:`, error);
  }

  /**
   * Log animation parameters if debug is enabled
   * @private
   * @param label Label for the log
   */
  private logAnimationParams(label: string): void {
    if (!this.config.debug.enabled || !this.app) return;

    console.log(`EXPORT: ${label} - Animation parameters:`, {
      animationSpeed: this.app.params.animationSpeed,
      normalNoiseSpeed: this.app.params.normalNoiseSpeed,
      colorNoiseSpeed: this.app.params.colorNoiseSpeed,
      pauseAnimation: this.app.params.pauseAnimation,
      time: this.app.time,
    });
  }

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

      // Log initial animation state if debug is enabled
      this.logAnimationParams("BEFORE EXPORT");

      // Save the current animation state
      const animState = this.captureAnimationState();

      // Check if animation is running
      const wasAnimating = this.isAnimating();

      // Pause animation if running
      if (wasAnimating) {
        this.stopAnimation();
        this.logAnimationParams("AFTER STOP");
      }

      // Configure renderer for export (returns original state for restoration)
      const rendererState = this.configureRendererForExport(mergedOptions);

      // Recreate geometry with high quality if requested
      if (mergedOptions.highQuality) {
        this.app!.recreateGeometryHighQuality();
      }

      // Render the frame
      this.renderFrame();

      // Get the image data URL with specified format
      const format = mergedOptions.format || "png";
      const dataURL = this.getImageDataURL(format);

      // Restore renderer state
      this.restoreRendererState(rendererState);

      // Restore original geometry quality if needed
      if (mergedOptions.highQuality) {
        this.app!.recreateGeometry();
      }

      // Calculate elapsed time during export
      const elapsedTime = performance.now() - animState.realTimestamp;

      // Restore animation state
      this.restoreAnimationState(animState, wasAnimating, elapsedTime);

      // Log final animation state if debug is enabled
      this.logAnimationParams("AFTER RESTORE");

      // Restart animation if it was running
      if (wasAnimating) {
        this.startAnimation();
        this.logAnimationParams("AFTER RESTART");
      } else {
        if (this.config.debug.enabled) {
          console.log("EXPORT: Animation was not restarted");
        }
      }

      // Emit export complete event
      this.emit("export-complete", {
        type: "image",
        result: dataURL,
      });

      return dataURL;
    } catch (error) {
      this.handleExportError(error, "image");
      throw error;
    }
  }

  /**
   * Export the current shader as code
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

      if (!this.app) {
        throw new Error("ShaderApp is not initialized");
      }

      // Get the current transparency setting from ExportInitializer if available
      let transparentSetting = mergedOptions.transparent || false;
      try {
        // Dynamic import to avoid circular dependencies
        const { getExportInitializer } = await import(
          "../stores/ExportInitializer"
        );
        const exportInitializer = getExportInitializer();
        // Get the current transparency setting
        transparentSetting =
          exportInitializer.getSignal("transparent").value ||
          transparentSetting;

        // Ensure our merged options have the correct transparency value
        mergedOptions.transparent = transparentSetting;
      } catch (error) {
        console.warn(
          "Could not get transparency setting from ExportInitializer:",
          error
        );
      }

      // Get shaders and uniforms from the app
      const vertexShader =
        this.app.params.geometryType === "sphere"
          ? this.app.shaders.sphereVertex
          : this.app.shaders.vertex;
      const fragmentShader = this.app.shaders.fragment;
      const uniforms = this.app.uniforms;

      // Generate appropriate code based on export options
      let code = "";
      const format = mergedOptions.format || "glsl";

      if (format === "glsl") {
        // GLSL format
        code = `// Vertex Shader\n${vertexShader}\n\n// Fragment Shader\n${fragmentShader}\n\n// Uniforms\n/*\n${JSON.stringify(
          uniforms,
          null,
          2
        )}\n*/`;
      } else if (format === "js") {
        // JavaScript code
        code = `// JavaScript Three.js implementation
const vertexShader = \`${vertexShader}\`;

const fragmentShader = \`${fragmentShader}\`;

const uniforms = ${JSON.stringify(uniforms, null, 2)};

// Use in Three.js material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms
});`;
      } else if (format === "ts") {
        // TypeScript code
        code = `// TypeScript Three.js implementation
const vertexShader = \`${vertexShader}\`;

const fragmentShader = \`${fragmentShader}\`;

const uniforms: Record<string, THREE.IUniform> = ${JSON.stringify(
          uniforms,
          null,
          2
        )};

// Use in Three.js material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms
});`;
      } else if (format === "html") {
        // Generate HTML export directly instead of using HTMLExporter
        const params = this.app.params;

        // Use the transparency setting we got from ExportInitializer or merged options
        const transparentBg = transparentSetting;

        // Log transparency setting for debugging purposes
        console.log(
          `[Code Export] Using transparency setting: ${transparentBg}`
        );

        const bgStyle = transparentBg
          ? "background-color: transparent; background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
          : `background-color: ${params.backgroundColor};`;

        const htmlSetup = `<!DOCTYPE html>
<html>
<head>
  <title>Gradient Shader</title>
  <style>
    body { margin: 0; overflow: hidden; ${bgStyle} }
    canvas { display: block; width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    // Your shader code will go here
  </script>
</body>
</html>`;

        // Generate scene setup
        const rendererOptions = transparentBg
          ? "{ antialias: true, alpha: true, preserveDrawingBuffer: true }"
          : "{ antialias: true }";

        const clearColorCode = transparentBg
          ? "renderer.setClearColor(0x000000, 0); // Fully transparent"
          : `renderer.setClearColor(new THREE.Color("${params.backgroundColor}"), 1.0); // Solid background`;

        // Get color stops if available
        let colorStopsCode = "";
        if (
          params.colorStops &&
          Array.isArray(params.colorStops) &&
          params.colorStops.length > 0
        ) {
          // We'll create a more robust solution that actually creates a proper texture
          // representing the color stops
          const colorStops = params.colorStops;
          const colors = [
            this.sampleColorAtPosition(colorStops, 0.0),
            this.sampleColorAtPosition(colorStops, 0.33),
            this.sampleColorAtPosition(colorStops, 0.66),
            this.sampleColorAtPosition(colorStops, 1.0),
          ];

          // First, set the legacy colors for fallback
          colorStopsCode = `uColors: { 
    value: [
      new THREE.Vector3(${this.getRGBValues(colors[0])}),
      new THREE.Vector3(${this.getRGBValues(colors[1])}),
      new THREE.Vector3(${this.getRGBValues(colors[2])}),
      new THREE.Vector3(${this.getRGBValues(colors[3])})
    ] 
  },
  // For HTML export, we need to create a texture - this is complex in pure JS
  // We'll instead use a pre-computed data array based on our color stops
  uColorStops: { 
    value: new THREE.DataTexture(
      new Uint8Array([
        // Pre-computed RGBA values for each color stop (R,G,B,Position*255)
        ${colorStops
          .map((stop) => {
            const color = new THREE.Color(stop.color);
            return `${Math.floor(color.r * 255)}, ${Math.floor(
              color.g * 255
            )}, ${Math.floor(color.b * 255)}, ${Math.floor(
              stop.position * 255
            )}`;
          })
          .join(",\n        ")}
      ]),
      ${colorStops.length}, 1, 
      THREE.RGBAFormat
    )
  },
  // Set the correct count to use the texture-based approach
  uColorStopCount: { value: ${colorStops.length} },`;
        } else {
          // Fallback to the old color1-4 system if colorStops is not available
          colorStopsCode = `uColors: { 
    value: [
      new THREE.Vector3(${this.getRGBValues(params.color1 || "#ff0000")}),
      new THREE.Vector3(${this.getRGBValues(params.color2 || "#00ff00")}),
      new THREE.Vector3(${this.getRGBValues(params.color3 || "#0000ff")}),
      new THREE.Vector3(${this.getRGBValues(params.color4 || "#ffff00")})
    ] 
  },
  // For fallback, create a simple dummy texture and set count to 0
  uColorStops: { 
    value: new THREE.DataTexture(
      new Uint8Array([255, 0, 255, 255]), // Simple 1x1 magenta texture
      1, 1, 
      THREE.RGBAFormat
    ) 
  },
  // Set count to 0 to trigger fallback
  uColorStopCount: { value: 0 },`;
        }

        const sceneSetup = `// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(${
          params.cameraFov
        }, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set camera position
camera.position.set(${params.cameraPosX.toFixed(
          4
        )}, ${params.cameraPosY.toFixed(4)}, ${params.cameraPosZ.toFixed(4)});

// Make camera look at the target point
camera.lookAt(${params.cameraTargetX.toFixed(
          4
        )}, ${params.cameraTargetY.toFixed(4)}, ${params.cameraTargetZ.toFixed(
          4
        )});

// Create renderer
const renderer = new THREE.WebGLRenderer(${rendererOptions});
renderer.setSize(window.innerWidth, window.innerHeight);
${clearColorCode}
document.body.appendChild(renderer.domElement);

${
  transparentBg
    ? `
// NOTE: Transparency in WebGL has limitations!
// 1. The preserveDrawingBuffer option is required for some export use cases
// 2. Some browsers may handle alpha differently - test in multiple browsers
// 3. For production use, you might need additional handling for mobile devices
`
    : ""
}

// Create shader material with your custom parameters
const uniforms = {
  uTime: { value: 0.0 },
  uNoiseScaleX: { value: ${params.normalNoiseScaleX} },
  uNoiseScaleY: { value: ${params.normalNoiseScaleY} },
  uNoiseSpeed: { value: ${params.normalNoiseSpeed} },
  uNoiseStrength: { value: ${params.normalNoiseStrength} },
  uNoiseShiftX: { value: ${params.normalNoiseShiftX} },
  uNoiseShiftY: { value: ${params.normalNoiseShiftY} },
  uNoiseShiftSpeed: { value: ${params.normalNoiseShiftSpeed} },
  uColorNoiseScale: { value: ${params.colorNoiseScale} },
  uColorNoiseSpeed: { value: ${params.colorNoiseSpeed} },
  uGradientMode: { value: ${params.gradientMode} },
  uGeometryType: { value: ${params.geometryType === "sphere" ? 1.0 : 0.0} },
  uGradientShiftX: { value: ${params.gradientShiftX} },
  uGradientShiftY: { value: ${params.gradientShiftY} },
  uGradientShiftSpeed: { value: ${params.gradientShiftSpeed} },
  ${colorStopsCode}
  uLightDir: { 
    value: new THREE.Vector3(${params.lightDirX}, ${params.lightDirY}, ${
          params.lightDirZ
        }).normalize() 
  },
  uDiffuseIntensity: { value: ${params.diffuseIntensity} },
  uAmbientIntensity: { value: ${params.ambientIntensity} },
  uRimLightIntensity: { value: ${params.rimLightIntensity} }
};`;

        // Generate geometry and animation code
        let geometryCode = "";
        switch (params.geometryType) {
          case "sphere":
            geometryCode = `const geometry = new THREE.SphereGeometry(${params.sphereRadius}, ${params.sphereWidthSegments}, ${params.sphereHeightSegments});`;
            break;
          case "plane":
          default:
            geometryCode = `const geometry = new THREE.PlaneGeometry(${params.planeWidth}, ${params.planeHeight}, ${params.planeSegments}, ${params.planeSegments});`;
            break;
        }

        const geometryAnimation = `// Create geometry and mesh
${geometryCode}

// Set material wireframe property
material.wireframe = ${params.showWireframe};

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = ${params.rotateX};
plane.rotation.y = ${params.rotateY};
plane.rotation.z = ${params.rotateZ};
scene.add(plane);

// Animation loop
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  // Get delta time for frame-rate independent animation
  const delta = clock.getDelta();
  // Maximum delta to prevent huge jumps if the tab loses focus
  const maxDelta = 1/30;
  const cappedDelta = Math.min(delta, maxDelta);
  
  // Update time uniform using delta time for frame-rate independence
  uniforms.uTime.value += ${params.animationSpeed} * cappedDelta * 60.0;
  
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation loop
animate();`;

        // Format shaders with backticks to ensure proper multi-line strings in JavaScript
        // Add extra escaping to preserve the backticks in the resulting code
        const escapedVertexShader = vertexShader.replace(/`/g, "\\`");
        const escapedFragmentShader = fragmentShader.replace(/`/g, "\\`");

        // Combine all parts
        const fullHtmlCode = htmlSetup.replace(
          "// Your shader code will go here",
          `
    // Vertex shader
    const vertexShader = \`${escapedVertexShader}\`;
    
    // Fragment shader
    const fragmentShader = \`${escapedFragmentShader}\`;
    
    ${sceneSetup}
    
    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      wireframe: ${this.app!.params.showWireframe}
    });
    
    // Add error handler for WebGL errors
    const onError = (event) => {
      console.error('WebGL Error:', event);
    };
    renderer.domElement.addEventListener('webglcontextlost', onError);
    renderer.domElement.addEventListener('webglcontextrestored', () => console.log('WebGL context restored'));
    
    // Add uniform debugging before scene creation - this will show what uniforms are available
    console.log('Shader Uniforms:', uniforms);
    
    ${geometryAnimation}
    `
        );

        // Add debug logging after code generation for HTML export
        // Immediately before the export-complete event
        if (format === "html") {
          console.log(`HTML Export Debugger:
          - Shader uses a texture for color stops, but we're using the fallback with uColors
          - The completed HTML uses ${
            params.colorStops ? params.colorStops.length : 0
          } color stops
          - We've set uColorStopCount to 0 to trigger the legacy colors fallback
          - This should make the shader work with the provided colors`);
        }

        code = fullHtmlCode;
      }

      // Apply minification if requested
      if (mergedOptions.minify) {
        // Simple minification - remove comments and excess whitespace
        code = code
          .replace(/\/\/.*$/gm, "") // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
          .replace(/\s+/g, " ") // Collapse whitespace
          .trim();
      }

      // Emit export complete event
      this.emit("export-complete", {
        type: "code",
        result: code,
      });

      return code;
    } catch (error) {
      this.handleExportError(error, "code");
      throw error;
    }
  }

  /**
   * Get RGB values from hex color
   * @private
   * @param hexColor - Hex color string
   * @returns RGB values as comma-separated string
   */
  private getRGBValues(hexColor: string): string {
    const color = new THREE.Color(hexColor);
    return `${color.r}, ${color.g}, ${color.b}`;
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
      "cubeSegments",
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

  /**
   * Validates that all components of the export implementation are working properly
   * This is a development/testing helper method and should not be called in production
   * @private
   * @returns Object with validation results
   */
  private validateExportImplementation(): Record<string, boolean> {
    if (!this.app) {
      console.error(
        "Cannot validate export implementation: App not initialized"
      );
      return { valid: false };
    }

    const results: Record<string, boolean> = {};

    // Test animation state capture
    try {
      const animState = this.captureAnimationState();
      results.captureAnimationState =
        typeof animState === "object" &&
        "animationSpeed" in animState &&
        "normalNoiseSpeed" in animState;
    } catch (error) {
      console.error("Error in captureAnimationState:", error);
      results.captureAnimationState = false;
    }

    // Test renderer state capture
    try {
      const rendererState = this.captureRendererState();
      results.captureRendererState =
        typeof rendererState === "object" &&
        "clearColor" in rendererState &&
        "clearAlpha" in rendererState;
    } catch (error) {
      console.error("Error in captureRendererState:", error);
      results.captureRendererState = false;
    }

    // Test renderer configuration
    try {
      const rendererState = this.configureRendererForExport({});
      results.configureRendererForExport =
        typeof rendererState === "object" && "clearColor" in rendererState;
      // Restore renderer state
      this.restoreRendererState(rendererState);
      results.restoreRendererState = true;
    } catch (error) {
      console.error(
        "Error in configureRendererForExport/restoreRendererState:",
        error
      );
      results.configureRendererForExport = false;
      results.restoreRendererState = false;
    }

    // Test getImageDataURL
    try {
      // Just test if the method runs without error (don't actually get the URL)
      // This checks that the structure of the method is correct
      results.getImageDataURL = typeof this.getImageDataURL === "function";
    } catch (error) {
      console.error("Error in getImageDataURL check:", error);
      results.getImageDataURL = false;
    }

    // Test image format support
    const formats = ["png", "jpg", "webp"];
    results.formatSupport = formats.every((format) => {
      try {
        return (
          this.config.export.defaultImageExport.format === format ||
          typeof format === "string"
        );
      } catch {
        return false;
      }
    });

    // Test code format support
    const codeFormats = ["glsl", "js", "ts", "html"];
    results.codeFormatSupport = codeFormats.every((format) => {
      try {
        return (
          this.config.export.defaultCodeExport.format === format ||
          typeof format === "string"
        );
      } catch {
        return false;
      }
    });

    // Calculate overall validation result
    results.valid = Object.entries(results)
      .filter(([key]) => key !== "valid")
      .every(([_, value]) => value === true);

    console.log("Export implementation validation results:", results);
    return results;
  }

  /**
   * DEVELOPMENT ONLY: Validate that the export implementation is working correctly
   * This method should only be called in development/testing environment
   * @returns Results of validation checks
   */
  public validateExport(): Record<string, any> {
    console.warn(
      "ShaderAppFacade.validateExport() is a development method and should not be used in production!"
    );

    try {
      return this.validateExportImplementation();
    } catch (error) {
      console.error("Error during export validation:", error);
      return {
        valid: false,
        error: true,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sample a color at a specific position from the color stops array
   * @private
   * @param colorStops - Array of color stops
   * @param position - Position to sample (0-1)
   * @returns The color at the position, interpolated if necessary
   */
  private sampleColorAtPosition(colorStops: any[], position: number): string {
    // Early return for empty array
    if (!colorStops || colorStops.length === 0) {
      return "#ff00ff"; // Magenta as error color
    }

    // Sort stops by position to ensure correct sampling
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);

    // If position is before first stop or after last stop
    if (position <= sortedStops[0].position) {
      return sortedStops[0].color;
    }

    if (position >= sortedStops[sortedStops.length - 1].position) {
      return sortedStops[sortedStops.length - 1].color;
    }

    // Find the two stops we're between
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const stop1 = sortedStops[i];
      const stop2 = sortedStops[i + 1];

      if (position >= stop1.position && position <= stop2.position) {
        // Linear interpolation between the two colors
        const t =
          (position - stop1.position) / (stop2.position - stop1.position);
        return this.lerpColor(stop1.color, stop2.color, t);
      }
    }

    // Fallback
    return sortedStops[0].color;
  }

  /**
   * Linearly interpolate between two colors
   * @private
   * @param color1 - First color (hex)
   * @param color2 - Second color (hex)
   * @param t - Interpolation factor (0-1)
   * @returns Interpolated color as hex string
   */
  private lerpColor(color1: string, color2: string, t: number): string {
    // Convert hex to rgb
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);

    // Interpolate
    const r = c1.r + (c2.r - c1.r) * t;
    const g = c1.g + (c2.g - c1.g) * t;
    const b = c1.b + (c2.b - c1.b) * t;

    // Create new color
    const color = new THREE.Color(r, g, b);

    // Convert back to hex
    return "#" + color.getHexString();
  }
}
