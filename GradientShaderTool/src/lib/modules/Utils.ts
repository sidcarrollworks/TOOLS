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
}
