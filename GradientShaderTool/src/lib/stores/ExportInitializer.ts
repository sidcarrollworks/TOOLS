/**
 * ExportInitializer for managing export parameters
 */
import { Signal } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import { InitializerBase, type ParameterDefinition } from "./InitializerBase";
import { getHistoryStore } from "./HistoryStore";
import { facadeSignal } from "../../app";
import { getExportStore } from "./index";
import type { ImageFormat, CodeFormat } from "./ExportStore";

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
   * Override syncWithFacade to ensure proper synchronization
   */
  syncWithFacade(): boolean {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn("ExportInitializer: No facade available for sync");
      return false;
    }

    // Get values from facade first so we can compare
    const beforeValues = {
      transparent: facade.getParam("exportTransparentBg"),
      highQuality: facade.getParam("exportHighQuality"),
      // Don't try to get other parameters that might not exist in the facade
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

      // Ensure facade has the correct values
      try {
        facade.updateParam("exportTransparentBg", this.transparent.value);
        facade.updateParam("exportHighQuality", this.highQuality.value);
      } catch (error) {
        console.warn("ExportInitializer: Error updating facade params:", error);
        return false;
      }

      // Update the export store settings
      this.updateExportStore();
    } else {
      console.warn(
        "ExportInitializer: Some signals not initialized during sync"
      );
      return false;
    }

    return true;
  }

  /**
   * Update the export store to maintain consistency with our signals
   */
  private updateExportStore(): void {
    const exportStore = getExportStore();

    // Update image settings
    exportStore.updateImageSettings({
      transparent: this.transparent.value,
      highQuality: this.highQuality.value,
      format: this.imageFormat.value,
    });

    // Update code settings
    exportStore.updateCodeSettings({
      format: this.codeFormat.value,
      includeLib: this.includeLib.value,
      minify: this.minify.value,
    });

    console.log("ExportInitializer: Updated export store settings");
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

    // Update the export store to keep them in sync
    if (result) {
      this.updateExportStore();

      // Directly update facade parameters for immediate effect
      const facade = this.getFacade();
      if (facade && facade.isInitialized()) {
        try {
          if (settings.transparent !== undefined) {
            facade.updateParam("exportTransparentBg", settings.transparent);
          }
          if (settings.highQuality !== undefined) {
            facade.updateParam("exportHighQuality", settings.highQuality);
          }
          console.log(
            "ExportInitializer: Updated facade parameters directly:",
            settings
          );
        } catch (error) {
          console.warn(
            "ExportInitializer: Error updating facade params:",
            error
          );
        }
      }
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

    const result = this.updateParameters(updates);

    // Update the export store to keep them in sync
    if (result) {
      this.updateExportStore();
    }

    return result;
  }

  /**
   * Update transparent background setting
   * This should also sync with global settings store and ColorInitializer
   */
  updateTransparentBackground(
    transparent: boolean,
    source: "color" | "export" = "export"
  ): boolean {
    console.log(
      `ExportInitializer: Updating transparent bg to ${transparent} (source: ${source})`
    );

    // First, update our own parameter
    const result = this.updateParameter("transparent", transparent);

    // Always update the facade parameter directly for immediate visual feedback
    // This is critical to ensure the export works correctly
    const facade = facadeSignal.value;
    if (facade) {
      try {
        facade.updateParam("exportTransparentBg", transparent);
        console.log(
          `ExportInitializer: Updated facade param 'exportTransparentBg' to ${transparent}`
        );
      } catch (error) {
        console.warn(
          "ExportInitializer: Error updating facade parameter:",
          error
        );
      }
    }

    // Update export store directly (our signal updates should handle this, but being explicit)
    try {
      const exportStore = getExportStore();
      exportStore.updateImageSettings({ transparent });
      console.log(
        `ExportInitializer: Updated ExportStore transparent setting to ${transparent}`
      );
    } catch (error) {
      console.warn("ExportInitializer: Error updating ExportStore:", error);
    }

    // Only sync with ColorInitializer if this update didn't come from it
    if (source !== "color") {
      try {
        // Update global settings
        import("../../lib/settings/store")
          .then(({ updateSettingValue }) => {
            updateSettingValue("transparentBackground", transparent);
            console.log(
              `ExportInitializer: Updated global setting 'transparentBackground' to ${transparent}`
            );
          })
          .catch((err) => {
            console.warn("ExportInitializer: Error updating settings:", err);
          });

        // Update ColorInitializer
        import("./ColorInitializer")
          .then(({ getColorInitializer }) => {
            const colorInitializer = getColorInitializer();
            // Use the method that won't loop back
            colorInitializer.updateParameter(
              "transparentBackground",
              transparent
            );
            console.log(
              `ExportInitializer: Updated ColorInitializer 'transparentBackground' to ${transparent}`
            );
          })
          .catch((err) => {
            console.warn(
              "ExportInitializer: Error updating ColorInitializer:",
              err
            );
          });
      } catch (error) {
        console.warn(
          "ExportInitializer: Error syncing transparent background:",
          error
        );
      }
    }

    return result;
  }

  /**
   * Override reset to ensure we properly reset all export parameters
   */
  public override reset(): boolean {
    super.reset();

    // Update the export store to keep them in sync
    this.updateExportStore();

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
