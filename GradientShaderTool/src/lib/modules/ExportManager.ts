/**
 * ExportManager - Handles exporting functionality (image and code)
 */
import * as THREE from "three";
import { ShaderApp } from "../ShaderApp";
import { HTMLExporter, JSExporter, ShaderExporter, ExportUI } from "./export";

export class ExportManager {
  private app: ShaderApp;
  public htmlExporter: HTMLExporter;
  public jsExporter: JSExporter;
  public shaderExporter: ShaderExporter;
  private exportUI: ExportUI;

  /**
   * Create an ExportManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
    
    // Initialize exporters
    this.htmlExporter = new HTMLExporter(app);
    this.jsExporter = new JSExporter(app);
    this.shaderExporter = new ShaderExporter(app);
    this.exportUI = new ExportUI(app);
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
    // Show the export UI modal instead of downloading JSON
    this.exportUI.showExportCode();
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.exportUI.dispose();
  }
}
