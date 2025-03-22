/**
 * ExportManager - Handles export functionality
 */
import * as THREE from "three";
import { ShaderApp } from "../ShaderApp";
import { ExportUI } from "./export/ExportUI";

export class ExportManager {
  private app: ShaderApp;
  private exportUI: ExportUI;

  /**
   * Create an export manager
   * @param app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
    this.exportUI = new ExportUI(app);
  }

  /**
   * Save the current canvas as image
   */
  saveAsImage(): string | null {
    if (!this.app.renderer) {
      console.error("Cannot save image: Renderer not initialized");
      return null;
    }

    // Store original renderer clear color and alpha
    const originalClearColor = this.app.renderer.getClearColor(
      new THREE.Color()
    );
    const originalClearAlpha = this.app.renderer.getClearAlpha();

    // Transparent background option
    if (this.app.params.exportTransparentBg) {
      // Save with transparency
      this.app.renderer.setClearColor(0x000000, 0);
    } else {
      // Use the current background color
      const bgColor = new THREE.Color(this.app.params.backgroundColor);
      this.app.renderer.setClearColor(bgColor);
    }

    // Export the canvas - high quality geometry should already be created by the facade if needed
    console.log("ExportManager: Exporting canvas to image");
    const dataURL = this.exportCanvas();

    // Always restore original renderer settings
    this.app.renderer.setClearColor(originalClearColor, originalClearAlpha);

    return dataURL;
  }

  /**
   * Export the canvas as an image
   * @returns The data URL of the exported canvas, or null if export failed
   */
  private exportCanvas(): string | null {
    if (!this.app.renderer) return null;

    // Get the canvas
    const canvas = this.app.renderer.domElement;

    try {
      // Generate a data URL from the canvas
      const dataURL = canvas.toDataURL("image/png");
      return dataURL;
    } catch (error) {
      console.error("Error exporting canvas:", error);
      return null;
    }
  }

  /**
   * Export shader code
   */
  exportCode(): void {
    this.exportUI.showExportCode();
  }
}
