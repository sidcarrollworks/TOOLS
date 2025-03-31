/**
 * ExportInitializer for managing export parameters
 */
import { Signal, computed } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import { InitializerBase, type ParameterDefinition } from "./InitializerBase";
import { getHistoryStore } from "./HistoryStore";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";

// Export types that were previously defined in ExportStore
export type ImageFormat = "png" | "jpg" | "webp";
export type CodeFormat = "glsl" | "js" | "ts" | "html";

/**
 * Export parameters interface
 */
export interface ExportParameters {
  // Image export parameters
  transparent: boolean;
  highQuality: boolean;
  imageFormat: ImageFormat;

  // Code export parameters
  codeFormat: CodeFormat;
  includeLib: boolean;
  minify: boolean;
}

/**
 * Default export parameters
 */
export const DEFAULT_EXPORT_PARAMETERS: ExportParameters = {
  // Image export defaults
  transparent: false,
  highQuality: true,
  imageFormat: "png",

  // Code export defaults
  codeFormat: "glsl",
  includeLib: true,
  minify: false,
};

/**
 * Export parameter definitions
 */
const PARAMETER_DEFINITIONS: Record<
  keyof ExportParameters,
  ParameterDefinition<any>
> = {
  transparent: {
    defaultValue: DEFAULT_EXPORT_PARAMETERS.transparent,
    facadeParam: "exportTransparentBg",
  },
  highQuality: {
    defaultValue: DEFAULT_EXPORT_PARAMETERS.highQuality,
    // Note: No direct facade parameter for highQuality, use default only
  },
  imageFormat: {
    defaultValue: DEFAULT_EXPORT_PARAMETERS.imageFormat,
    // Note: No direct facade parameter for imageFormat, use default only
  },
  codeFormat: {
    defaultValue: DEFAULT_EXPORT_PARAMETERS.codeFormat,
    // Note: No direct facade parameter for codeFormat, use default only
  },
  includeLib: {
    defaultValue: DEFAULT_EXPORT_PARAMETERS.includeLib,
    // Note: No direct facade parameter for includeLib, use default only
  },
  minify: {
    defaultValue: DEFAULT_EXPORT_PARAMETERS.minify,
    // Note: No direct facade parameter for minify, use default only
  },
};

/**
 * ExportInitializer class for managing export parameters
 */
export class ExportInitializer extends InitializerBase<ExportParameters> {
  // Signals for direct access
  public readonly transparent: Signal<boolean>;
  public readonly highQuality: Signal<boolean>;
  public readonly imageFormat: Signal<ImageFormat>;
  public readonly codeFormat: Signal<CodeFormat>;
  public readonly includeLib: Signal<boolean>;
  public readonly minify: Signal<boolean>;

  // Additional signals for export state
  private readonly _isExporting: Signal<boolean> = new Signal<boolean>(false);
  private readonly _lastExportResult: Signal<string | null> = new Signal<
    string | null
  >(null);
  private readonly _lastExportType: Signal<"image" | "code" | null> =
    new Signal<"image" | "code" | null>(null);
  private readonly _lastExportFileName: Signal<string> = new Signal<string>(
    "gradient-shader"
  );

  // Computed signals
  public readonly isExporting: ReadonlySignal<boolean> = this._isExporting;
  public readonly lastExportResult: ReadonlySignal<string | null> =
    this._lastExportResult;
  public readonly lastExportType: ReadonlySignal<"image" | "code" | null> =
    this._lastExportType;

  // File name to use for exports
  private readonly _fileName: string = "gradient-shader";

  // Singleton instance
  private static _instance: ExportInitializer | null = null;

  /**
   * Get the singleton instance
   */
  public static getInstance(): ExportInitializer {
    if (!ExportInitializer._instance) {
      ExportInitializer._instance = new ExportInitializer();
    }
    return ExportInitializer._instance;
  }

  constructor() {
    super(PARAMETER_DEFINITIONS, {
      debug: false,
      autoSync: false,
      updateFacade: true,
    });

    // Initialize signals
    this.transparent = this.getWritableSignal("transparent");
    this.highQuality = this.getWritableSignal("highQuality");
    this.imageFormat = this.getWritableSignal("imageFormat");
    this.codeFormat = this.getWritableSignal("codeFormat");
    this.includeLib = this.getWritableSignal("includeLib");
    this.minify = this.getWritableSignal("minify");

    // Now that signals are initialized, we can sync with facade
    try {
      this.syncWithFacade();
    } catch (error) {
      console.warn("ExportInitializer: Error during initial sync:", error);
    }
  }

  /**
   * Export the current state as an image
   * @returns Promise that resolves with the exported image URL
   */
  public async exportImage(): Promise<string> {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      const errorMsg = "Cannot export: Application not ready";
      getUIStore().showToast(errorMsg, "error");
      return Promise.reject(new Error(errorMsg));
    }

    this._isExporting.value = true;

    try {
      // Prepare export options with all available settings
      const exportOptions = {
        format: this.imageFormat.value,
        transparent: this.transparent.value,
        highQuality: this.highQuality.value,
        fileName: this._fileName,
      };

      // Call facade to export
      const result = await facade.exportAsImage(exportOptions);

      // Store result
      this._lastExportResult.value = result;
      this._lastExportType.value = "image";
      this._lastExportFileName.value = this._fileName;

      getUIStore().showToast("Image exported successfully", "success");
      return result;
    } catch (error) {
      console.error("Failed to export image:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      getUIStore().showToast(
        `Failed to export image: ${errorMessage}`,
        "error"
      );
      return Promise.reject(error);
    } finally {
      this._isExporting.value = false;
    }
  }

  /**
   * Download the last export result
   * @returns Whether the download was successful
   */
  public downloadLastExport(): boolean {
    const result = this._lastExportResult.value;
    const type = this._lastExportType.value;

    if (!result) {
      getUIStore().showToast("No export result to download", "warning");
      return false;
    }

    try {
      // Create download link
      const link = document.createElement("a");

      if (type === "image") {
        // For images, use data URL directly
        link.href = result;
        const format = this.imageFormat.value;
        link.download = `${this._lastExportFileName.value}.${format}`;
      } else {
        // For code, create a blob
        const blob = new Blob([result], { type: "text/plain" });
        link.href = URL.createObjectURL(blob);

        const format = this.codeFormat.value;
        link.download = `${this._lastExportFileName.value}.${format}`;
      }

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      getUIStore().showToast("Download started", "success");
      return true;
    } catch (error) {
      console.error("Failed to download:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      getUIStore().showToast(`Failed to download: ${errorMessage}`, "error");
      return false;
    }
  }

  /**
   * Override syncWithFacade to handle additional logic
   */
  public override syncWithFacade(): boolean {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      return false;
    }

    // Get values from facade first so we can compare
    // Since exportTransparentBg and exportHighQuality are no longer accessible,
    // we'll just proceed with syncing based on our stored values
    const beforeValues = {
      // These properties are now managed internally, not from facade
      transparent:
        this.transparent?.value ?? DEFAULT_EXPORT_PARAMETERS.transparent,
      highQuality:
        this.highQuality?.value ?? DEFAULT_EXPORT_PARAMETERS.highQuality,
    };

    // Call the base implementation which handles sync based on parameter definitions
    const result = super.syncWithFacade();
    if (!result) {
      return false;
    }

    // Safe check signals are initialized before accessing values
    if (
      this.transparent &&
      this.highQuality &&
      this.imageFormat &&
      this.codeFormat &&
      this.includeLib &&
      this.minify
    ) {
      // Get current signal values after sync
      const afterValues = {
        transparent: this.transparent.value,
        highQuality: this.highQuality.value,
        imageFormat: this.imageFormat.value,
        codeFormat: this.codeFormat.value,
        includeLib: this.includeLib.value,
        minify: this.minify.value,
      };

      // We no longer update facade directly with these parameters
      // They will be applied during export operations as needed
    } else {
      // Some signals not initialized during sync
      return false;
    }

    return true;
  }

  /**
   * Update image export settings
   */
  updateImageSettings(settings: {
    transparent?: boolean;
    highQuality?: boolean;
    imageFormat?: ImageFormat;
  }): boolean {
    const updates: Partial<ExportParameters> = {};

    if (settings.transparent !== undefined) {
      updates.transparent = settings.transparent;
    }

    if (settings.highQuality !== undefined) {
      updates.highQuality = settings.highQuality;
    }

    if (settings.imageFormat !== undefined) {
      updates.imageFormat = settings.imageFormat;
    }

    const result = this.updateParameters(updates);

    // If transparency setting changes, update the scene's background immediately
    if (settings.transparent !== undefined) {
      this.applyTransparencyToScene(settings.transparent);
    }

    return result;
  }

  /**
   * Update code export settings
   */
  updateCodeSettings(settings: {
    codeFormat?: CodeFormat;
    includeLib?: boolean;
    minify?: boolean;
  }): boolean {
    const updates: Partial<ExportParameters> = {};

    if (settings.codeFormat !== undefined) {
      updates.codeFormat = settings.codeFormat;
    }

    if (settings.includeLib !== undefined) {
      updates.includeLib = settings.includeLib;
    }

    if (settings.minify !== undefined) {
      updates.minify = settings.minify;
    }

    return this.updateParameters(updates);
  }

  /**
   * Update transparent background setting
   * This should also sync with global settings store and ColorInitializer
   */
  updateTransparentBackground(
    transparent: boolean,
    source: "color" | "export" = "export"
  ): boolean {
    // First, update our own parameter
    const result = this.updateParameter("transparent", transparent);

    // Apply transparency to the scene
    this.applyTransparencyToScene(transparent);

    // Only sync with ColorInitializer if this update didn't come from it
    if (source !== "color") {
      try {
        // Update ColorInitializer
        import("./ColorInitializer")
          .then(({ getColorInitializer }) => {
            const colorInitializer = getColorInitializer();
            // Use the method that won't loop back
            colorInitializer.updateParameter(
              "transparentBackground",
              transparent
            );
          })
          .catch((err) => {
            // Error updating ColorInitializer
          });
      } catch (error) {
        // Error syncing transparent background
      }
    }

    return result;
  }

  /**
   * Apply transparency setting to the scene through the SceneManager
   * @private
   */
  private applyTransparencyToScene(transparent: boolean): void {
    // Get the facade from the signal
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) {
      return;
    }

    try {
      // Access the scene manager indirectly through an event
      // This avoids direct coupling to the internal 'app' property

      // Create a custom event that will be handled in ShaderAppFacade
      facade.emit("parameter-changed", {
        paramName: "transparencyUpdate",
        value: transparent,
        source: "user",
      });
    } catch (error) {
      // Error updating background transparency
      console.warn("Error applying transparency to scene:", error);
    }
  }

  /**
   * Override reset to ensure we properly reset all export parameters
   */
  public override reset(): boolean {
    super.reset();

    return true;
  }

  /**
   * Get the facade instance
   */
  protected getFacade() {
    return facadeSignal.value;
  }
}

/**
 * Get the export initializer singleton
 */
export function getExportInitializer(): ExportInitializer {
  return ExportInitializer.getInstance();
}

/**
 * Get a signal for a specific export parameter
 */
export function getExportParameter<K extends keyof ExportParameters>(
  paramId: K
): ReadonlySignal<ExportParameters[K]> {
  const initializer = getExportInitializer();
  return initializer.getSignal(paramId);
}

/**
 * Initialize export parameters
 */
export function initializeExportParameters(): boolean {
  const initializer = getExportInitializer();
  return initializer.syncWithFacade();
}
