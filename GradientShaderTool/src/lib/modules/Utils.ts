/**
 * Utils - Utility functions for the application
 */
import * as THREE from "three";
import Stats from "stats.js";
import { ShaderApp } from "../ShaderApp";

export class Utils {
  /**
   * Check if WebGL is available
   */
  isWebGLAvailable(): boolean {
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
   * Setup Stats.js for performance monitoring
   * @param {ShaderApp} app - The shader app instance
   * @param {boolean} initiallyVisible - Whether stats should be initially visible
   */
  setupStats(app: ShaderApp, initiallyVisible: boolean = true): void {
    // Create Stats instance
    app.stats = new Stats();
    app.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom

    // Add Stats DOM element to the page
    if (app.parentElement) {
      app.stats.dom.style.position = "absolute";
      app.stats.dom.style.left = "0px";
      app.stats.dom.style.top = "0px";

      // Set initial visibility
      if (!initiallyVisible) {
        app.stats.dom.style.display = "none";
      }

      app.parentElement.appendChild(app.stats.dom);
    }
  }

  /**
   * Convert a hex color to RGB vector
   * @param {string} hex - Hex color (e.g., "#ff0000")
   * @returns {THREE.Vector3} RGB color as Vector3
   */
  hexToRgb(hex: string): THREE.Vector3 {
    const color = new THREE.Color(hex);
    return new THREE.Vector3(color.r, color.g, color.b);
  }

  /**
   * Generate a timestamp-based filename for export
   * @param {string} prefix - Prefix for the filename
   * @param {string} extension - File extension (without dot)
   * @returns {string} Generated filename
   */
  generateFilename(prefix: string, extension: string): string {
    const date = new Date();
    const timestamp =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0") +
      "_" +
      date.getHours().toString().padStart(2, "0") +
      date.getMinutes().toString().padStart(2, "0") +
      date.getSeconds().toString().padStart(2, "0");

    return `${prefix}_${timestamp}.${extension}`;
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy text: ", err);
      return false;
    }
  }

  /**
   * Creates and trigger a download of a text file
   * @param {string} filename - Name of the file to download
   * @param {string} text - Content of the file
   */
  downloadTextFile(filename: string, text: string): void {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
}
