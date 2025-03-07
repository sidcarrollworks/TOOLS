/**
 * ExportManager - Handles exporting functionality (image and code)
 */
import * as THREE from "three";
import { ShaderApp } from "../ShaderApp";

export class ExportManager {
  private app: ShaderApp;

  /**
   * Create an ExportManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
  }

  /**
   * Save the canvas as an image
   */
  saveAsImage(): void {
    if (!this.app.renderer) {
      console.error("Renderer not initialized");
      return;
    }

    // Get original background color
    const originalBgColor = this.app.params.backgroundColor;
    const transparent = this.app.params.exportTransparentBg;

    // Handle transparent background if needed
    if (transparent) {
      this.app.renderer.setClearColor(new THREE.Color("#000000"), 0);
    }

    // Render the scene
    if (this.app.scene && this.app.camera) {
      this.app.renderer.render(this.app.scene, this.app.camera);
    }

    // Get canvas and prepare for saving
    const canvas = this.app.renderer.domElement;

    try {
      // Create temporary link element for download
      const link = document.createElement("a");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `gradient-shader-${timestamp}.png`;

      // Set link attributes for download
      link.download = filename;
      link.href = canvas.toDataURL("image/png");

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Image saved as", filename);
    } catch (error) {
      console.error("Error saving image:", error);
      alert("Failed to save image. See console for details.");
    }

    // Restore original background
    if (transparent) {
      this.app.renderer.setClearColor(new THREE.Color(originalBgColor), 1);
      // Re-render the scene with original background
      if (this.app.scene && this.app.camera) {
        this.app.renderer.render(this.app.scene, this.app.camera);
      }
    }
  }

  /**
   * Export code (shaders, parameters, etc.)
   */
  exportCode(): void {
    if (
      !this.app.shaders.vertex ||
      !this.app.shaders.fragment ||
      !this.app.shaders.perlinNoise
    ) {
      console.error("Shader sources not available");
      alert("Shader sources not available for export.");
      return;
    }

    try {
      // Create code export
      const exportData = {
        shaders: {
          vertex: this.app.shaders.vertex,
          fragment: this.app.shaders.fragment,
          perlinNoise: this.app.shaders.perlinNoise,
        },
        params: this.app.params,
      };

      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);

      // Generate file name
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `gradient-shader-export-${timestamp}.json`;

      // Create blob and download link
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = filename;
      link.href = url;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL object
      URL.revokeObjectURL(url);

      console.log("Code exported as", filename);
    } catch (error) {
      console.error("Error exporting code:", error);
      alert("Failed to export code. See console for details.");
    }
  }
}
