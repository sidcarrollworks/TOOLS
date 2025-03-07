/**
 * ExportManager - Handles code export functionality
 */
import { HTMLExporter, JSExporter, ShaderExporter, UI } from './export/index.js';

export class ExportManager {
  /**
   * Create an ExportManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app) {
    this.app = app;
    
    // Initialize exporters
    this.htmlExporter = new HTMLExporter(app);
    this.jsExporter = new JSExporter(app);
    this.shaderExporter = new ShaderExporter(app);
    this.uiExporter = new UI(app);
  }
  
  /**
   * Export code
   */
  exportCode() {
    this.uiExporter.showExportCode();
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.uiExporter.dispose();
  }
} 