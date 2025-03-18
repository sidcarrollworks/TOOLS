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
  saveAsImage(): void {
    if (!this.app.renderer) {
      console.error("Cannot save image: Renderer not initialized");
      return;
    }

    // Transparent background option
    if (this.app.params.exportTransparentBg) {
      // Save with transparency
      this.app.renderer.setClearColor(0x000000, 0);
    } else {
      // Use the current background color
      const bgColor = new THREE.Color(this.app.params.backgroundColor);
      this.app.renderer.setClearColor(bgColor);
    }

    // Quality options
    if (this.app.params.exportHighQuality) {
      // For high quality, we'll recreate the geometry with more segments
      // Store current segments
      const currentPlaneSegments = this.app.params.planeSegments;
      const currentSphereWidthSegments = this.app.params.sphereWidthSegments;
      const currentSphereHeightSegments = this.app.params.sphereHeightSegments;

      // Set higher segment count
      this.app.params.planeSegments = Math.min(512, currentPlaneSegments * 2);
      this.app.params.sphereWidthSegments = Math.min(
        256,
        currentSphereWidthSegments * 2
      );
      this.app.params.sphereHeightSegments = Math.min(
        256,
        currentSphereHeightSegments * 2
      );

      // Recreate with high quality
      this.app.recreateGeometryHighQuality();

      // Render the scene
      if (this.app.scene && this.app.camera) {
        this.app.renderer.render(this.app.scene, this.app.camera);
      }

      // Export the canvas
      this.exportCanvas();

      // Restore original settings
      this.app.params.planeSegments = currentPlaneSegments;
      this.app.params.sphereWidthSegments = currentSphereWidthSegments;
      this.app.params.sphereHeightSegments = currentSphereHeightSegments;

      // Recreate with original quality
      this.app.recreateGeometryHighQuality();
    } else {
      // Just export the canvas as is
      this.exportCanvas();
    }

    // Restore background settings if needed
    if (this.app.params.exportTransparentBg) {
      const bgColor = new THREE.Color(this.app.params.backgroundColor);
      this.app.renderer.setClearColor(bgColor);
    }
  }

  /**
   * Export the canvas as an image
   */
  private exportCanvas(): void {
    if (!this.app.renderer) return;

    // Get the canvas
    const canvas = this.app.renderer.domElement;

    // Create a temporary link to download the image
    try {
      // Generate a data URL from the canvas
      const dataURL = canvas.toDataURL("image/png");

      // Create a link element
      const link = document.createElement("a");
      link.download = "gradient-shader.png";
      link.href = dataURL;

      // Add to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting canvas:", error);
    }
  }

  /**
   * Export shader code
   */
  exportCode(): void {
    this.exportUI.showExportCode();
  }
}
