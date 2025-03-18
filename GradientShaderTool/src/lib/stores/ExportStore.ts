import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import type { ExportCodeOptions, ExportImageOptions } from "../facade/types";

/**
 * Export format types
 */
export type ImageFormat = "png" | "jpg" | "webp";
export type CodeFormat = "glsl" | "js" | "ts";

/**
 * Export state interface
 */
export interface ExportState {
  /**
   * Is export in progress
   */
  isExporting: boolean;

  /**
   * Last export result (data URL for images, code string for code)
   */
  lastExportResult: string | null;

  /**
   * Last export timestamp
   */
  lastExportTime: number | null;

  /**
   * Last export type
   */
  lastExportType: "image" | "code" | null;

  /**
   * Last export options
   */
  lastExportOptions: Record<string, any> | null;

  /**
   * Error message if export failed
   */
  errorMessage: string | null;

  /**
   * Image export settings
   */
  imageSettings: {
    format: ImageFormat;
    transparent: boolean;
    highQuality: boolean;
    width: number;
    height: number;
    fileName: string;
  };

  /**
   * Code export settings
   */
  codeSettings: {
    format: CodeFormat;
    includeLib: boolean;
    minify: boolean;
    fileName: string;
  };
}

/**
 * Store for managing exports
 */
export class ExportStore extends StoreBase<ExportState> {
  /**
   * Create a new export store
   */
  constructor() {
    super(
      {
        isExporting: false,
        lastExportResult: null,
        lastExportTime: null,
        lastExportType: null,
        lastExportOptions: null,
        errorMessage: null,
        imageSettings: {
          format: "png",
          transparent: true,
          highQuality: true,
          width: 1920,
          height: 1080,
          fileName: "gradient-shader",
        },
        codeSettings: {
          format: "glsl",
          includeLib: true,
          minify: false,
          fileName: "gradient-shader",
        },
      },
      { name: "ExportStore", debug: false }
    );
  }

  /**
   * Export current state as an image
   */
  public async exportImage(
    options: Partial<ExportImageOptions> = {}
  ): Promise<string> {
    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Cannot export: Application not ready");
      getUIStore().showToast("Cannot export: Application not ready", "error");
      return Promise.reject(new Error("Facade not available"));
    }

    // Get current image settings
    const currentSettings = this.get("imageSettings");

    // Merge with provided options
    const exportOptions: ExportImageOptions = {
      format: options.format || currentSettings.format,
      transparent:
        options.transparent !== undefined
          ? options.transparent
          : currentSettings.transparent,
      highQuality:
        options.highQuality !== undefined
          ? options.highQuality
          : currentSettings.highQuality,
      width: options.width || currentSettings.width,
      height: options.height || currentSettings.height,
      fileName: options.fileName || currentSettings.fileName,
    };

    // Update last settings
    this.setState({
      isExporting: true,
      errorMessage: null,
      lastExportOptions: exportOptions,
      lastExportType: "image",
      imageSettings: {
        ...currentSettings,
        ...exportOptions,
      },
    });

    try {
      // Call facade to export
      const result = await facade.exportAsImage(exportOptions);

      // Update state with result
      this.setState({
        isExporting: false,
        lastExportResult: result,
        lastExportTime: Date.now(),
      });

      getUIStore().showToast(`Image exported successfully`, "success");
      return result;
    } catch (error) {
      console.error("Failed to export image:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.setState({
        isExporting: false,
        errorMessage: `Failed to export image: ${errorMessage}`,
      });

      getUIStore().showToast(
        `Failed to export image: ${errorMessage}`,
        "error"
      );
      return Promise.reject(error);
    }
  }

  /**
   * Export current state as code
   */
  public async exportCode(
    options: Partial<ExportCodeOptions> = {}
  ): Promise<string> {
    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Cannot export: Application not ready");
      getUIStore().showToast("Cannot export: Application not ready", "error");
      return Promise.reject(new Error("Facade not available"));
    }

    // Get current code settings
    const currentSettings = this.get("codeSettings");

    // Merge with provided options
    const exportOptions: ExportCodeOptions = {
      format: options.format || currentSettings.format,
      includeLib:
        options.includeLib !== undefined
          ? options.includeLib
          : currentSettings.includeLib,
      minify:
        options.minify !== undefined ? options.minify : currentSettings.minify,
      fileName: options.fileName || currentSettings.fileName,
    };

    // Update last settings
    this.setState({
      isExporting: true,
      errorMessage: null,
      lastExportOptions: exportOptions,
      lastExportType: "code",
      codeSettings: {
        ...currentSettings,
        ...exportOptions,
      },
    });

    try {
      // Call facade to export
      const result = await facade.exportAsCode(exportOptions);

      // Update state with result
      this.setState({
        isExporting: false,
        lastExportResult: result,
        lastExportTime: Date.now(),
      });

      getUIStore().showToast(`Code exported successfully`, "success");
      return result;
    } catch (error) {
      console.error("Failed to export code:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.setState({
        isExporting: false,
        errorMessage: `Failed to export code: ${errorMessage}`,
      });

      getUIStore().showToast(`Failed to export code: ${errorMessage}`, "error");
      return Promise.reject(error);
    }
  }

  /**
   * Download the last export result
   */
  public downloadLastExport(): boolean {
    const lastExportResult = this.get("lastExportResult");
    const lastExportType = this.get("lastExportType");
    const lastExportOptions = this.get("lastExportOptions");

    if (!lastExportResult) {
      getUIStore().showToast("No export result to download", "warning");
      return false;
    }

    try {
      // Create download link
      const link = document.createElement("a");

      if (lastExportType === "image") {
        // For images, use data URL directly
        link.href = lastExportResult;
        const format =
          (lastExportOptions as ExportImageOptions)?.format || "png";
        link.download = `${
          (lastExportOptions as ExportImageOptions)?.fileName ||
          "gradient-shader"
        }.${format}`;
      } else {
        // For code, create a blob
        const blob = new Blob([lastExportResult], { type: "text/plain" });
        link.href = URL.createObjectURL(blob);

        const format =
          (lastExportOptions as ExportCodeOptions)?.format || "glsl";
        link.download = `${
          (lastExportOptions as ExportCodeOptions)?.fileName ||
          "gradient-shader"
        }.${format}`;
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
      this.set("errorMessage", `Failed to download: ${errorMessage}`);
      getUIStore().showToast(`Failed to download: ${errorMessage}`, "error");
      return false;
    }
  }

  /**
   * Update image export settings
   */
  public updateImageSettings(
    settings: Partial<ExportState["imageSettings"]>
  ): void {
    this.set("imageSettings", {
      ...this.get("imageSettings"),
      ...settings,
    });
  }

  /**
   * Update code export settings
   */
  public updateCodeSettings(
    settings: Partial<ExportState["codeSettings"]>
  ): void {
    this.set("codeSettings", {
      ...this.get("codeSettings"),
      ...settings,
    });
  }

  /**
   * Copy the last export result to clipboard
   */
  public copyLastExportToClipboard(): boolean {
    const lastExportResult = this.get("lastExportResult");
    const lastExportType = this.get("lastExportType");

    if (!lastExportResult) {
      getUIStore().showToast("No export result to copy", "warning");
      return false;
    }

    try {
      if (lastExportType === "code") {
        // Copy code directly
        navigator.clipboard.writeText(lastExportResult);
        getUIStore().showToast("Code copied to clipboard", "success");
        return true;
      } else {
        // For images, we can only copy the data URL
        navigator.clipboard.writeText(lastExportResult);
        getUIStore().showToast("Image URL copied to clipboard", "success");
        return true;
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.set("errorMessage", `Failed to copy to clipboard: ${errorMessage}`);
      getUIStore().showToast(
        `Failed to copy to clipboard: ${errorMessage}`,
        "error"
      );
      return false;
    }
  }
}

// Singleton instance
let exportStore: ExportStore | null = null;

/**
 * Get the export store instance
 */
export function getExportStore(): ExportStore {
  if (!exportStore) {
    exportStore = new ExportStore();
  }
  return exportStore;
}
