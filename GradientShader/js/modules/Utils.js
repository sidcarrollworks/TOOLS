/**
 * Utils - General utility functions
 */
export class Utils {
  constructor() {
    // No initialization needed
  }
  
  /**
   * Check if WebGL is available
   */
  isWebGLAvailable() {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Set up performance stats
   * @param {ShaderApp} app - Reference to main app
   */
  setupStats(app) {
    try {
      // Check if Stats is defined
      if (typeof Stats === 'undefined') {
        console.warn('Stats.js library not loaded. Performance monitoring will be disabled.');
        return;
      }
      
      // Create Stats.js instance
      app.stats = new Stats();
      
      // Configure stats panel
      app.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      
      // Position the stats panel at the bottom left and add ID for styling
      app.stats.dom.style.position = 'absolute';
      app.stats.dom.style.left = '0px';
      app.stats.dom.style.bottom = '0px'; // Position at bottom instead of top
      app.stats.dom.style.top = 'auto'; // Remove top positioning
      app.stats.dom.id = 'stats';
      
      // Add stats to the document
      document.body.appendChild(app.stats.dom);
      
      console.log('Performance monitoring enabled with Stats.js');
    } catch (error) {
      console.error('Error setting up Stats.js:', error);
      app.stats = null;
    }
  }
  
  /**
   * Saves the current canvas view as an image
   * @param {ShaderApp} app - Reference to main app
   */
  saveAsImage(app) {
    // Store original settings
    const originalSegments = app.params.planeSegments;
    const originalAlpha = app.renderer.getClearAlpha();
    const originalClearColor = app.renderer.getClearColor().clone();
    
    try {
      // Apply high quality if enabled
      if (app.params.exportHighQuality && originalSegments < 256) {
        console.log("Increasing segments for high-quality export...");
        app.params.planeSegments = 256;
        app.recreatePlane();
      }
      
      // Apply transparent background if enabled
      if (app.params.exportTransparentBg) {
        console.log("Setting transparent background for export...");
        app.renderer.setClearColor(0x000000, 0); // Set alpha to 0 for transparency
      }
      
      // Force a render to ensure the canvas is up to date
      app.renderer.render(app.scene, app.camera);
      
      // Get the canvas element
      const canvas = app.renderer.domElement;
      
      // Convert canvas to data URL (PNG format for transparency support)
      const dataURL = canvas.toDataURL('image/png');
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'gradient-shader-' + new Date().toISOString().slice(0, 10) + '.png';
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("Image saved successfully");
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      // Restore original settings
      if (app.params.exportHighQuality && originalSegments < 256) {
        console.log("Restoring original segment count...");
        app.params.planeSegments = originalSegments;
        app.recreatePlane();
      }
      
      // Restore original background
      if (app.params.exportTransparentBg) {
        console.log("Restoring original background...");
        app.renderer.setClearColor(originalClearColor, originalAlpha);
        app.renderer.render(app.scene, app.camera);
      }
    }
  }
  
  /**
   * Clean up stats-related resources
   * @param {ShaderApp} app - Reference to main app
   */
  cleanupStats(app) {
    if (app.stats && app.stats.dom && app.stats.dom.parentElement) {
      app.stats.dom.parentElement.removeChild(app.stats.dom);
      app.stats = null;
    }
    
    console.log('Stats resources cleaned up');
  }
} 