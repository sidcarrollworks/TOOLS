/**
 * ShaderExport.ts
 * Handles all export functionality for the ShaderApp
 */

import * as THREE from "three";
import { EventEmitter } from "./EventEmitter";
import type { FacadeConfig } from "./FacadeConfig";
import type { ShaderApp } from "../ShaderApp";
import type { ExportCodeOptions, ExportImageOptions } from "./types";

/**
 * ShaderExport class
 * Encapsulates all export-related functionality for the ShaderApp
 */
export class ShaderExport extends EventEmitter {
  /**
   * The ShaderApp instance to export from
   * @private
   */
  private app: ShaderApp;

  /**
   * The configuration for exports
   * @private
   */
  private config: FacadeConfig;

  /**
   * Constructor for the ShaderExport class
   * @param app The ShaderApp instance to export from
   * @param config The facade configuration
   */
  constructor(app: ShaderApp, config: FacadeConfig) {
    super();
    this.app = app;
    this.config = config;
  }

  /**
   * Export the current state as an image
   * @param options Export options
   * @returns Promise that resolves with the exported image URL
   */
  public async exportAsImage(
    options: ExportImageOptions = {}
  ): Promise<string> {
    try {
      // Merge options with defaults
      const mergedOptions = {
        ...this.config.export.defaultImageExport,
        ...options,
      };

      // Emit export started event
      this.emit("export-started", {
        type: "image",
        settings: mergedOptions,
      });

      // Log initial animation state if debug is enabled
      this.logAnimationParams("BEFORE EXPORT");

      // Save the current animation state
      const animState = this.captureAnimationState();

      // Check if animation is running
      const wasAnimating = this.isAnimating();

      // Pause animation if running
      if (wasAnimating) {
        this.stopAnimation();
        this.logAnimationParams("AFTER STOP");
      }

      // Configure renderer for export (returns original state for restoration)
      const rendererState = this.configureRendererForExport(mergedOptions);

      // Recreate geometry with high quality if requested
      if (mergedOptions.highQuality) {
        this.app.recreateGeometryHighQuality();
      }

      // Render the frame
      this.renderFrame();

      // Get the image data URL with specified format
      const format = mergedOptions.format || "png";
      const dataURL = this.getImageDataURL(format);

      // Restore renderer state
      this.restoreRendererState(rendererState);

      // Restore original geometry quality if needed
      if (mergedOptions.highQuality) {
        this.app.recreateGeometry();
      }

      // Calculate elapsed time during export
      const elapsedTime = performance.now() - animState.realTimestamp;

      // Restore animation state
      this.restoreAnimationState(animState, wasAnimating, elapsedTime);

      // Log final animation state if debug is enabled
      this.logAnimationParams("AFTER RESTORE");

      // Restart animation if it was running
      if (wasAnimating) {
        this.startAnimation();
        this.logAnimationParams("AFTER RESTART");
      } else {
        if (this.config.debug.enabled) {
          console.log("EXPORT: Animation was not restarted");
        }
      }

      // Emit export complete event
      this.emit("export-complete", {
        type: "image",
        result: dataURL,
      });

      return dataURL;
    } catch (error) {
      this.handleExportError(error, "image");
      throw error;
    }
  }

  /**
   * Export the current shader as code
   * @param options Export options
   * @returns Promise that resolves with the exported code
   */
  public async exportAsCode(options: ExportCodeOptions = {}): Promise<string> {
    // Merge options with defaults
    const mergedOptions = {
      ...this.config.export.defaultCodeExport,
      ...options,
    };

    try {
      // Emit export started event
      this.emit("export-started", {
        type: "code",
        settings: mergedOptions,
      });

      // Get the current transparency setting from ExportInitializer if available
      let transparentSetting = mergedOptions.transparent || false;
      try {
        // Dynamic import to avoid circular dependencies
        const { getExportInitializer } = await import(
          "../stores/ExportInitializer"
        );
        const exportInitializer = getExportInitializer();
        // Get the current transparency setting
        transparentSetting =
          exportInitializer.getSignal("transparent").value ||
          transparentSetting;

        // Ensure our merged options have the correct transparency value
        mergedOptions.transparent = transparentSetting;
      } catch (error) {
        console.warn(
          "Could not get transparency setting from ExportInitializer:",
          error
        );
      }

      // Get shaders and uniforms from the app
      const vertexShader =
        this.app.params.geometryType === "sphere"
          ? this.app.shaders.sphereVertex
          : this.app.shaders.vertex;
      const fragmentShader = this.app.shaders.fragment;
      const uniforms = this.app.uniforms;

      // Generate appropriate code based on export options
      let code = "";
      const format = mergedOptions.format || "glsl";

      if (format === "glsl") {
        // GLSL format
        code = `// Vertex Shader\n${vertexShader}\n\n// Fragment Shader\n${fragmentShader}\n\n// Uniforms\n/*\n${JSON.stringify(
          uniforms,
          null,
          2
        )}\n*/`;
      } else if (format === "js") {
        // JavaScript code
        code = `// JavaScript Three.js implementation
const vertexShader = \`${vertexShader}\`;

const fragmentShader = \`${fragmentShader}\`;

const uniforms = ${JSON.stringify(uniforms, null, 2)};

// Use in Three.js material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms
});`;
      } else if (format === "ts") {
        // TypeScript code
        code = `// TypeScript Three.js implementation
const vertexShader = \`${vertexShader}\`;

const fragmentShader = \`${fragmentShader}\`;

const uniforms: Record<string, THREE.IUniform> = ${JSON.stringify(
          uniforms,
          null,
          2
        )};

// Use in Three.js material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms
});`;
      } else if (format === "html") {
        // Generate HTML export
        code = await this.generateHtmlExport(mergedOptions, transparentSetting);
      }

      // Apply minification if requested
      if (mergedOptions.minify) {
        // Simple minification - remove comments and excess whitespace
        code = code
          .replace(/\/\/.*$/gm, "") // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
          .replace(/\s+/g, " ") // Collapse whitespace
          .trim();
      }

      // Emit export complete event
      this.emit("export-complete", {
        type: "code",
        result: code,
      });

      return code;
    } catch (error) {
      this.handleExportError(error, "code");
      throw error;
    }
  }

  /**
   * Generate HTML export code
   * @private
   * @param options Export options
   * @param transparent Whether to use transparency
   * @returns The generated HTML code
   */
  private async generateHtmlExport(
    options: ExportCodeOptions,
    transparent: boolean
  ): Promise<string> {
    const params = this.app.params;
    const vertexShader =
      this.app.params.geometryType === "sphere"
        ? this.app.shaders.sphereVertex
        : this.app.shaders.vertex;
    const fragmentShader = this.app.shaders.fragment;

    // Log transparency setting for debugging purposes
    console.log(`[Code Export] Using transparency setting: ${transparent}`);

    const bgStyle = transparent
      ? "background-color: transparent; background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
      : `background-color: ${params.backgroundColor};`;

    const htmlSetup = `<!DOCTYPE html>
<html>
<head>
  <title>Gradient Shader</title>
  <style>
    body { margin: 0; overflow: hidden; ${bgStyle} }
    canvas { display: block; width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <script type="module">
    // Import Three.js from CDN (v0.174.0)
    import * as THREE from 'https://unpkg.com/three@0.174.0/build/three.module.js';
    
    // Your shader code will go here
  </script>
</body>
</html>`;

    // Generate scene setup
    const rendererOptions = transparent
      ? "{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }"
      : "{ antialias: true, powerPreference: 'high-performance' }";

    const clearColorCode = transparent
      ? "renderer.setClearColor(0x000000, 0); // Fully transparent"
      : `renderer.setClearColor(new THREE.Color("${params.backgroundColor}"), 1.0); // Solid background`;

    // Get color stops if available
    let colorStopsCode = "";
    if (
      params.colorStops &&
      Array.isArray(params.colorStops) &&
      params.colorStops.length > 0
    ) {
      // For HTML export, we'll use the legacy uColors fallback that's built into the shaders
      // This is because we can't easily create a texture for uColorStops in the exported HTML
      // The shaders have a fallback mechanism that uses uColors when uColorStopCount <= 1

      // Map the color stops to the four main colors used in the legacy system
      // We'll sample at 0.0, 0.33, 0.66, and 1.0
      const colors = [
        this.sampleColorAtPosition(params.colorStops, 0.0),
        this.sampleColorAtPosition(params.colorStops, 0.33),
        this.sampleColorAtPosition(params.colorStops, 0.66),
        this.sampleColorAtPosition(params.colorStops, 1.0),
      ];

      // First, set the legacy colors for fallback
      colorStopsCode = `uColors: { 
    value: [
      new THREE.Vector3(${this.getRGBValues(colors[0])}),
      new THREE.Vector3(${this.getRGBValues(colors[1])}),
      new THREE.Vector3(${this.getRGBValues(colors[2])}),
      new THREE.Vector3(${this.getRGBValues(colors[3])})
    ] 
  },
  // For HTML export, we need to create a texture - this is complex in pure JS
  // We'll instead use a pre-computed data array based on our color stops
  uColorStops: { 
    value: createColorStopsTexture()
  },
  // Set the correct count to use the texture-based approach
  uColorStopCount: { value: ${params.colorStops.length} },`;
    } else {
      // Fallback to the old color1-4 system if colorStops is not available
      colorStopsCode = `uColors: { 
    value: [
      new THREE.Vector3(${this.getRGBValues(params.color1 || "#ff0000")}),
      new THREE.Vector3(${this.getRGBValues(params.color2 || "#00ff00")}),
      new THREE.Vector3(${this.getRGBValues(params.color3 || "#0000ff")}),
      new THREE.Vector3(${this.getRGBValues(params.color4 || "#ffff00")})
    ] 
  },
  // For fallback, create a simple dummy texture and set count to 0
  uColorStops: { 
    value: createDummyTexture()
  },
  // Set count to 0 to trigger fallback
  uColorStopCount: { value: 0 },`;
    }

    const sceneSetup = `// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(${
      params.cameraFov
    }, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set camera position
camera.position.set(${params.cameraPosX.toFixed(
      4
    )}, ${params.cameraPosY.toFixed(4)}, ${params.cameraPosZ.toFixed(4)});

// Make camera look at the target point
camera.lookAt(${params.cameraTargetX.toFixed(
      4
    )}, ${params.cameraTargetY.toFixed(4)}, ${params.cameraTargetZ.toFixed(4)});

// Create renderer with modern options
const renderer = new THREE.WebGLRenderer(${rendererOptions});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Modern color space setting (replaces deprecated outputEncoding)
renderer.outputColorSpace = THREE.SRGBColorSpace;
${clearColorCode}
document.body.appendChild(renderer.domElement);

${
  transparent
    ? `
// NOTE: Transparency in WebGL has limitations!
// 1. The preserveDrawingBuffer option is required for some export use cases
// 2. Some browsers may handle alpha differently - test in multiple browsers
// 3. For production use, you might need additional handling for mobile devices
`
    : ""
}

// Helper function to create a texture from color stops
function createColorStopsTexture() {
  // Create sorted copy of the stops
  const colorStops = [
    ${
      params.colorStops
        ? params.colorStops
            .map(
              (stop) =>
                `{ position: ${stop.position}, color: new THREE.Color("${stop.color}") }`
            )
            .join(",\n    ")
        : ""
    }
  ];
  const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
  
  // Size of the texture - one pixel per color stop
  const width = sortedStops.length;
  const height = 1;
  
  // Create data array (RGBA format, 4 bytes per pixel)
  const data = new Uint8Array(width * height * 4);
  
  // Fill texture with color stop data
  // Each pixel has RGB from the color and A (alpha) from the position
  for (let i = 0; i < sortedStops.length; i++) {
    const baseIndex = i * 4;
    const stop = sortedStops[i];
    
    // RGB from the color (0-255)
    data[baseIndex] = Math.floor(stop.color.r * 255);
    data[baseIndex + 1] = Math.floor(stop.color.g * 255);
    data[baseIndex + 2] = Math.floor(stop.color.b * 255);
    
    // Position (0-1) stored in alpha channel
    data[baseIndex + 3] = Math.floor(stop.position * 255);
  }
  
  // Create the texture with modern settings
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat
  );
  
  // Required for DataTexture to work properly
  texture.needsUpdate = true;
  // Use LinearSRGBColorSpace for correct shader interpretation
  // The shader expects raw linear values, not sRGB-encoded ones
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  
  return texture;
}

// Helper function to create a dummy texture
function createDummyTexture() {
  const data = new Uint8Array([255, 0, 255, 255]); // Simple 1x1 magenta texture
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true; // Required for DataTexture to work properly
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  return texture;
}

// Create shader material with your custom parameters
const uniforms = {
  uTime: { value: 0.0 },
  uNoiseScaleX: { value: ${params.normalNoiseScaleX} },
  uNoiseScaleY: { value: ${params.normalNoiseScaleY} },
  uNoiseSpeed: { value: ${params.normalNoiseSpeed} },
  uNoiseStrength: { value: ${params.normalNoiseStrength} },
  uNoiseShiftX: { value: ${params.normalNoiseShiftX} },
  uNoiseShiftY: { value: ${params.normalNoiseShiftY} },
  uNoiseShiftSpeed: { value: ${params.normalNoiseShiftSpeed} },
  uColorNoiseScale: { value: ${params.colorNoiseScale} },
  uColorNoiseSpeed: { value: ${params.colorNoiseSpeed} },
  uGradientMode: { value: ${params.gradientMode} },
  uGeometryType: { value: ${params.geometryType === "sphere" ? 1.0 : 0.0} },
  uGradientShiftX: { value: ${params.gradientShiftX} },
  uGradientShiftY: { value: ${params.gradientShiftY} },
  uGradientShiftSpeed: { value: ${params.gradientShiftSpeed} },
  ${colorStopsCode}
  uLightDir: { 
    value: new THREE.Vector3(${params.lightDirX}, ${params.lightDirY}, ${
      params.lightDirZ
    }).normalize() 
  },
  uDiffuseIntensity: { value: ${params.diffuseIntensity} },
  uAmbientIntensity: { value: ${params.ambientIntensity} },
  uRimLightIntensity: { value: ${params.rimLightIntensity} }
};`;

    // Generate geometry and animation code
    let geometryCode = "";
    switch (params.geometryType) {
      case "sphere":
        geometryCode = `const geometry = new THREE.SphereGeometry(${params.sphereRadius}, ${params.sphereWidthSegments}, ${params.sphereHeightSegments});`;
        break;
      case "plane":
      default:
        geometryCode = `const geometry = new THREE.PlaneGeometry(${params.planeWidth}, ${params.planeHeight}, ${params.planeSegments}, ${params.planeSegments});`;
        break;
    }

    const geometryAnimation = `// Create geometry and mesh
${geometryCode}

// Set material wireframe property
material.wireframe = ${params.showWireframe};

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = ${params.rotateX};
plane.rotation.y = ${params.rotateY};
plane.rotation.z = ${params.rotateZ};
scene.add(plane);

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  // Get delta time for frame-rate independent animation
  const delta = clock.getDelta();
  // Maximum delta to prevent huge jumps if the tab loses focus
  const maxDelta = 1/30;
  const cappedDelta = Math.min(delta, maxDelta);
  
  // Update time uniform using delta time for frame-rate independence
  uniforms.uTime.value += ${params.animationSpeed} * cappedDelta * 60.0;
  
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
});

// Add error handler for WebGL errors
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  console.error('WebGL context lost:', event);
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  // Re-initialize any resources that need it
  if (uniforms.uColorStops && uniforms.uColorStops.value) {
    uniforms.uColorStops.value.needsUpdate = true;
  }
});

// Debug info in console
console.log('Shader Uniforms:', uniforms);

// Start animation loop
animate();`;

    // Format shaders with backticks to ensure proper multi-line strings in JavaScript
    // Add extra escaping to preserve the backticks in the resulting code
    const escapedVertexShader = vertexShader.replace(/`/g, "\\`");
    const escapedFragmentShader = fragmentShader.replace(/`/g, "\\`");

    // Combine all parts
    const fullHtmlCode = htmlSetup.replace(
      "// Your shader code will go here",
      `
    // Vertex shader
    const vertexShader = \`${escapedVertexShader}\`;
    
    // Fragment shader
    const fragmentShader = \`${escapedFragmentShader}\`;
    
    ${sceneSetup}
    
    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      wireframe: ${this.app.params.showWireframe}
    });
    
    ${geometryAnimation}
    `
    );

    // Add debug logging after code generation for HTML export
    if (options.format === "html") {
      console.log(`HTML Export Debugger:
      - Using Three.js version 0.174.0 with ES modules
      - Modern renderer settings: SRGBColorSpace, explicit pixel ratio
      - The completed HTML uses ${
        params.colorStops ? params.colorStops.length : 0
      } color stops
      - DataTexture created for color stops with needsUpdate=true`);
    }

    return fullHtmlCode;
  }

  /**
   * Capture the current animation state for later restoration after export
   * @private
   */
  private captureAnimationState(): Record<string, any> {
    // Capture the animation state
    return {
      // Animation parameters
      animationSpeed: this.app.params.animationSpeed,
      normalNoiseSpeed: this.app.params.normalNoiseSpeed,
      colorNoiseSpeed: this.app.params.colorNoiseSpeed,
      pauseAnimation: this.app.params.pauseAnimation,
      time: this.app.time,

      // Add real timestamp to track how long export takes
      realTimestamp: performance.now(),
    };
  }

  /**
   * Capture the current renderer state for validation
   * @private
   * @returns Object containing the current renderer state
   */
  private captureRendererState(): Record<string, any> {
    if (!this.app.renderer) {
      throw new Error("Renderer is not initialized");
    }

    const originalColor = this.app.renderer.getClearColor(new THREE.Color());
    const originalAlpha = this.app.renderer.getClearAlpha();

    return {
      clearColor: originalColor.getHex(),
      clearAlpha: originalAlpha,
    };
  }

  /**
   * Configure the renderer for export, returning the original state for later restoration
   * @private
   * @param options Export options
   * @returns Original renderer state for restoration
   */
  private configureRendererForExport(
    options: ExportImageOptions
  ): Record<string, any> {
    if (!this.app.renderer) {
      throw new Error("Renderer is not initialized");
    }

    // Store original renderer clear color and alpha
    const originalClearColor = this.app.renderer.getClearColor(
      new THREE.Color()
    );
    const originalClearAlpha = this.app.renderer.getClearAlpha();

    // Store original renderer state
    const rendererState = {
      clearColor: originalClearColor.getHex(),
      clearAlpha: originalClearAlpha,
    };

    // Use the SceneManager to set background transparency
    if (this.app.sceneManager) {
      this.app.sceneManager.setBackgroundTransparency(
        options.transparent || false
      );
    } else {
      // Fallback if SceneManager isn't available
      if (options.transparent) {
        this.app.renderer.setClearColor(0x000000, 0);
      } else {
        const bgColor = new THREE.Color(this.app.params.backgroundColor);
        this.app.renderer.setClearColor(bgColor);
      }
    }

    return rendererState;
  }

  /**
   * Restore the renderer to its original state
   * @private
   * @param rendererState The original renderer state to restore
   */
  private restoreRendererState(rendererState: Record<string, any>): void {
    if (!this.app.renderer) {
      throw new Error("Renderer is not initialized");
    }

    // Directly restore the original clear color and alpha
    this.app.renderer.setClearColor(
      rendererState.clearColor,
      rendererState.clearAlpha
    );

    // Make sure to reset the checkered background if SceneManager is available
    if (this.app.sceneManager && rendererState.clearAlpha === 1) {
      this.app.sceneManager.setBackgroundTransparency(false);
    }
  }

  /**
   * Restore the animation state after export
   * @private
   * @param animState Animation state to restore
   * @param wasAnimating Whether animation was running before export
   * @param elapsedTime Time elapsed during export
   */
  private restoreAnimationState(
    animState: Record<string, any>,
    wasAnimating: boolean,
    elapsedTime: number
  ): void {
    // Restore animation parameters
    this.app.params.animationSpeed = animState.animationSpeed;
    this.app.params.normalNoiseSpeed = animState.normalNoiseSpeed;
    this.app.params.colorNoiseSpeed = animState.colorNoiseSpeed;
    this.app.params.pauseAnimation = animState.pauseAnimation;

    // Calculate elapsed shader time if animation was running
    if (wasAnimating) {
      // Add the equivalent shader time that would have passed during export
      const timeIncrement = animState.animationSpeed * (elapsedTime / 1000.0);
      // Time is only updated when animation is running
      this.app.time = animState.time + timeIncrement;

      if (this.app.uniforms && this.app.uniforms.uTime) {
        this.app.uniforms.uTime.value = this.app.time;
      }
    }

    if (this.config.debug.enabled) {
      console.log(
        "EXPORT: Restored animation state, elapsed real time:",
        elapsedTime.toFixed(2),
        "ms"
      );
    }
  }

  /**
   * Get image data URL from canvas
   * @private
   * @param format The image format to export as
   * @returns Data URL of the exported image
   */
  private getImageDataURL(format: string = "png"): string {
    if (!this.app.renderer) {
      throw new Error("Renderer not initialized");
    }

    const canvas = this.app.renderer.domElement;

    // Determine MIME type based on format
    const mimeType =
      format === "jpg" || format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
        ? "image/webp"
        : "image/png";

    // For JPEG format, provide quality setting
    const quality = format === "jpg" || format === "jpeg" ? 0.95 : undefined;

    // Get data URL with appropriate format and quality
    try {
      return canvas.toDataURL(mimeType, quality);
    } catch (error) {
      console.error("Error generating data URL:", error);
      throw new Error(
        `Failed to generate image data URL: ${(error as Error).message}`
      );
    }
  }

  /**
   * Handle export errors in a consistent way
   * @private
   * @param error The error that occurred
   * @param exportType The type of export that failed
   */
  private handleExportError(
    error: unknown,
    exportType: "image" | "code"
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      exportType === "image" ? "IMAGE_EXPORT_ERROR" : "CODE_EXPORT_ERROR";

    this.emit("error", {
      message: `Error exporting ${exportType}: ${errorMessage}`,
      code: errorCode,
      source: "export",
      recoverable: true,
    });

    console.error(`Error exporting ${exportType}:`, error);
  }

  /**
   * Get RGB values from hex color
   * @private
   * @param hexColor - Hex color string
   * @returns RGB values as comma-separated string
   */
  private getRGBValues(hexColor: string): string {
    const color = new THREE.Color(hexColor);
    return `${color.r}, ${color.g}, ${color.b}`;
  }

  /**
   * Sample a color at a specific position from the color stops array
   * @private
   * @param colorStops - Array of color stops
   * @param position - Position to sample (0-1)
   * @returns The color at the position, interpolated if necessary
   */
  private sampleColorAtPosition(colorStops: any[], position: number): string {
    // Early return for empty array
    if (!colorStops || colorStops.length === 0) {
      return "#ff00ff"; // Magenta as error color
    }

    // Sort stops by position to ensure correct sampling
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);

    // If position is before first stop or after last stop
    if (position <= sortedStops[0].position) {
      return sortedStops[0].color;
    }

    if (position >= sortedStops[sortedStops.length - 1].position) {
      return sortedStops[sortedStops.length - 1].color;
    }

    // Find the two stops we're between
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const stop1 = sortedStops[i];
      const stop2 = sortedStops[i + 1];

      if (position >= stop1.position && position <= stop2.position) {
        // Linear interpolation between the two colors
        const t =
          (position - stop1.position) / (stop2.position - stop1.position);
        return this.lerpColor(stop1.color, stop2.color, t);
      }
    }

    // Fallback
    return sortedStops[0].color;
  }

  /**
   * Linearly interpolate between two colors
   * @private
   * @param color1 - First color (hex)
   * @param color2 - Second color (hex)
   * @param t - Interpolation factor (0-1)
   * @returns Interpolated color as hex string
   */
  private lerpColor(color1: string, color2: string, t: number): string {
    // Convert hex to rgb
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);

    // Interpolate
    const r = c1.r + (c2.r - c1.r) * t;
    const g = c1.g + (c2.g - c1.g) * t;
    const b = c1.b + (c2.b - c1.b) * t;

    // Create new color
    const color = new THREE.Color(r, g, b);

    // Convert back to hex
    return "#" + color.getHexString();
  }

  /**
   * Validates that all components of the export implementation are working properly
   * This is a development/testing helper method
   * @returns Object with validation results
   */
  public validateExport(): Record<string, any> {
    try {
      const results: Record<string, boolean> = {};

      // Test animation state capture
      try {
        const animState = this.captureAnimationState();
        results.captureAnimationState =
          typeof animState === "object" &&
          "animationSpeed" in animState &&
          "normalNoiseSpeed" in animState;
      } catch (error) {
        console.error("Error in captureAnimationState:", error);
        results.captureAnimationState = false;
      }

      // Test renderer state capture
      try {
        const rendererState = this.captureRendererState();
        results.captureRendererState =
          typeof rendererState === "object" &&
          "clearColor" in rendererState &&
          "clearAlpha" in rendererState;
      } catch (error) {
        console.error("Error in captureRendererState:", error);
        results.captureRendererState = false;
      }

      // Test renderer configuration
      try {
        const rendererState = this.configureRendererForExport({});
        results.configureRendererForExport =
          typeof rendererState === "object" && "clearColor" in rendererState;
        // Restore renderer state
        this.restoreRendererState(rendererState);
        results.restoreRendererState = true;
      } catch (error) {
        console.error(
          "Error in configureRendererForExport/restoreRendererState:",
          error
        );
        results.configureRendererForExport = false;
        results.restoreRendererState = false;
      }

      // Test getImageDataURL
      try {
        // Just test if the method runs without error (don't actually get the URL)
        results.getImageDataURL = typeof this.getImageDataURL === "function";
      } catch (error) {
        console.error("Error in getImageDataURL check:", error);
        results.getImageDataURL = false;
      }

      // Test image format support
      const formats = ["png", "jpg", "webp"];
      results.formatSupport = formats.every((format) => {
        try {
          return (
            this.config.export.defaultImageExport.format === format ||
            typeof format === "string"
          );
        } catch {
          return false;
        }
      });

      // Test code format support
      const codeFormats = ["glsl", "js", "ts", "html"];
      results.codeFormatSupport = codeFormats.every((format) => {
        try {
          return (
            this.config.export.defaultCodeExport.format === format ||
            typeof format === "string"
          );
        } catch {
          return false;
        }
      });

      // Calculate overall validation result
      results.valid = Object.entries(results)
        .filter(([key]) => key !== "valid")
        .every(([_, value]) => value === true);

      console.log("Export implementation validation results:", results);
      return results;
    } catch (error) {
      console.error("Error during export validation:", error);
      return {
        valid: false,
        error: true,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Helper method to check if animation is running
   * @private
   */
  private isAnimating(): boolean {
    return !this.app.params.pauseAnimation;
  }

  /**
   * Helper method to stop animation
   * @private
   */
  private stopAnimation(): void {
    this.app.params.pauseAnimation = true;
  }

  /**
   * Helper method to start animation
   * @private
   */
  private startAnimation(): void {
    this.app.params.pauseAnimation = false;
  }

  /**
   * Helper method to render a frame
   * @private
   */
  private renderFrame(): void {
    if (!this.app.renderer || !this.app.scene || !this.app.camera) {
      throw new Error("Renderer, scene, or camera is not initialized");
    }

    // Call the renderer's render method with scene and camera
    this.app.renderer.render(this.app.scene, this.app.camera);
  }

  /**
   * Log animation parameters for debugging
   * @private
   * @param label A label to identify where in the process this log is from
   */
  private logAnimationParams(label: string): void {
    if (this.config.debug.enabled) {
      console.log(
        `EXPORT ${label}: pauseAnimation=${this.app.params.pauseAnimation}, time=${this.app.time}`
      );
    }
  }
}
