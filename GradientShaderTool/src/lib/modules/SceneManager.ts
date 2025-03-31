/**
 * SceneManager - Handles Three.js scene setup and management
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ShaderApp } from "../ShaderApp";
import { getCameraInitializer } from "../stores/CameraInitializer";
import { getColorInitializer } from "../stores/ColorInitializer";
import type { ColorStop } from "../types/ColorStop";

// Define the interface for camera settings updates
interface CameraSettings {
  cameraDistance?: number;
  cameraPosX?: number;
  cameraPosY?: number;
  cameraPosZ?: number;
  cameraTargetX?: number;
  cameraTargetY?: number;
  cameraTargetZ?: number;
  cameraFov?: number;
}

export class SceneManager {
  private app: ShaderApp;

  // Add new property to control adaptive resolution
  private useAdaptiveResolution: boolean = false;

  // Color stops texture for shader
  private colorStopsTexture: THREE.DataTexture | null = null;

  /**
   * Create a SceneManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
  }

  /**
   * Set up Three.js scene
   */
  setupScene(parentElement: HTMLElement): void {
    // Create scene
    this.app.scene = new THREE.Scene();

    // Find the shader-canvas element
    const shaderCanvasElement = document.getElementById("shader-canvas");
    const targetElement = shaderCanvasElement || parentElement;

    // Create camera
    this.app.camera = new THREE.PerspectiveCamera(
      this.app.params.cameraFov,
      parentElement.clientWidth / parentElement.clientHeight,
      0.1,
      1000
    );
    this.app.camera.position.z = this.app.params.cameraDistance;

    // Create renderer
    // Check if WebGL2 is available
    let webGL2Available = false;
    try {
      const canvas = document.createElement("canvas");
      webGL2Available = !!(
        window.WebGL2RenderingContext && canvas.getContext("webgl2")
      );
      console.log("WebGL2 available:", webGL2Available);
    } catch (e) {
      console.warn("WebGL2 detection failed:", e);
    }

    // Create renderer with appropriate context
    this.app.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      canvas: undefined,
      context: undefined,
      powerPreference: "high-performance",
      // THREE.js will use WebGL2 if available by default
    });

    // Set the pixel ratio for proper rendering on high DPI displays
    this.app.renderer.setPixelRatio(window.devicePixelRatio);

    if (webGL2Available) {
      console.info("Using WebGL2");
    } else {
      console.info("WebGL2 not available, using WebGL1");
    }

    this.app.renderer.setSize(
      parentElement.clientWidth,
      parentElement.clientHeight
    );

    // Expose renderer to window for DevPanel access
    if (typeof window !== "undefined") {
      (window as any).threeRenderer = this.app.renderer;
    }

    // Set clear color based on transparent background setting (using default value)
    this.setBackgroundTransparency(false);

    targetElement.appendChild(this.app.renderer.domElement);

    // Setup OrbitControls
    this.setupOrbitControls();

    // Create material with the appropriate vertex shader
    this.app.material = new THREE.ShaderMaterial({
      vertexShader:
        this.app.params.geometryType === "sphere"
          ? this.app.shaders.sphereVertex
          : this.app.params.geometryType === "cube"
          ? this.app.shaders.cubeVertex
          : this.app.shaders.vertex,
      fragmentShader:
        this.app.params.geometryType === "sphere"
          ? this.app.shaders.sphereFragment
          : this.app.params.geometryType === "cube"
          ? this.app.shaders.cubeFragment
          : this.app.shaders.fragment,
      uniforms: this.app.uniforms,
      side: THREE.DoubleSide,
    });

    // Create plane
    this.recreateGeometry();

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.app.scene.add(ambientLight);

    // Set up window resize handler
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (!this.app.camera || !this.app.renderer || !this.app.parentElement)
      return;

    // Get the current dimensions of the parent element
    const width = this.app.parentElement.clientWidth;
    const height = this.app.parentElement.clientHeight;

    // Update camera aspect ratio
    this.app.camera.aspect = width / height;
    this.app.camera.updateProjectionMatrix();

    // Reset the pixel ratio in case the device pixel ratio has changed
    this.app.renderer.setPixelRatio(window.devicePixelRatio);

    // Update renderer size
    this.app.renderer.setSize(width, height);

    // Force a render to update the view immediately
    if (this.app.scene) {
      this.app.renderer.render(this.app.scene, this.app.camera);
    }
  }

  /**
   * Set up OrbitControls
   */
  setupOrbitControls(): void {
    if (!this.app.camera || !this.app.renderer) return;

    // Create OrbitControls
    this.app.controls = new OrbitControls(
      this.app.camera,
      this.app.renderer.domElement
    );

    // Configure controls
    this.app.controls.enableDamping = true; // Add smooth damping
    this.app.controls.dampingFactor = 0.05;
    this.app.controls.rotateSpeed = 0.5;
    this.app.controls.zoomSpeed = 0.5;
    this.app.controls.panSpeed = 0.5;
    this.app.controls.minDistance = 0.5;
    this.app.controls.maxDistance = 10;
    this.app.controls.maxPolarAngle = Math.PI / 1.5; // Limit vertical rotation

    // Set initial position from params
    this.app.controls.target.set(
      this.app.params.cameraTargetX,
      this.app.params.cameraTargetY,
      this.app.params.cameraTargetZ
    );

    this.app.camera.position.set(
      this.app.params.cameraPosX,
      this.app.params.cameraPosY,
      this.app.params.cameraPosZ
    );

    // Add event listener for camera changes
    this.app.controls.addEventListener("change", () => {
      if (!this.app.camera || !this.app.controls) return;

      // Update the camera distance parameter to match the actual camera distance
      const distance = this.app.camera.position.distanceTo(
        this.app.controls.target
      );

      // Only update if the difference is significant to avoid feedback loops
      if (Math.abs(distance - this.app.params.cameraDistance) > 0.01) {
        this.app.params.cameraDistance = distance;

        // Update the control panel GUI if it's been set up
        if ("updateGUI" in this.app) {
          (this.app as any).updateGUI();
        }
      }

      // Save camera position and target to params
      this.app.params.cameraPosX = this.app.camera.position.x;
      this.app.params.cameraPosY = this.app.camera.position.y;
      this.app.params.cameraPosZ = this.app.camera.position.z;

      this.app.params.cameraTargetX = this.app.controls.target.x;
      this.app.params.cameraTargetY = this.app.controls.target.y;
      this.app.params.cameraTargetZ = this.app.controls.target.z;

      // Update the CameraInitializer with new camera values
      try {
        // Create an update function that uses requestAnimationFrame
        const updateSettings = () => {
          // Get the camera initializer
          const cameraInitializer = getCameraInitializer();

          // Update camera position and target
          cameraInitializer.updateFromFacade(
            this.app.camera?.position.x || 0,
            this.app.camera?.position.y || 0,
            this.app.camera?.position.z || 0,
            this.app.controls?.target.x || 0,
            this.app.controls?.target.y || 0,
            this.app.controls?.target.z || 0
          );
        };

        // Cancel existing animation frame if there is one
        if (this._cameraUpdateAnimFrame) {
          cancelAnimationFrame(this._cameraUpdateAnimFrame);
        }

        // Use requestAnimationFrame for smoother updates aligned with render cycle
        this._cameraUpdateAnimFrame = requestAnimationFrame(updateSettings);
      } catch (error) {
        console.error("Error updating camera settings:", error);
      }

      // Update the dev panel if it's been set up
      if ("updateDevPanel" in this.app) {
        (this.app as any).updateDevPanel();
      }
    });

    this.app.controls.update();
  }

  // Store the animation frame ID
  private _cameraUpdateAnimFrame: number | null = null;

  /**
   * Recreate the geometry with current parameters
   */
  recreateGeometry(): void {
    if (!this.app.scene) return;

    if (this.app.plane) {
      this.app.scene.remove(this.app.plane);
    }

    if (this.app.geometry) {
      this.app.geometry.dispose();
    }

    // Get segment count with adaptive reduction for performance
    const segmentCount = this.getAdaptiveSegmentCount();

    // Update the geometry type uniform
    if (this.app.uniforms.uGeometryType) {
      this.app.uniforms.uGeometryType.value =
        this.app.params.geometryType === "sphere"
          ? 1.0
          : this.app.params.geometryType === "cube"
          ? 2.0
          : 0.0;
    }

    // Create new geometry based on the selected type
    switch (this.app.params.geometryType) {
      case "sphere":
        this.app.geometry = new THREE.SphereGeometry(
          this.app.params.sphereRadius,
          this.app.params.sphereWidthSegments,
          this.app.params.sphereHeightSegments
        );
        break;
      case "cube":
        this.app.geometry = new THREE.BoxGeometry(
          this.app.params.cubeSize,
          this.app.params.cubeSize,
          this.app.params.cubeSize,
          this.app.params.cubeSegments,
          this.app.params.cubeSegments,
          this.app.params.cubeSegments
        );
        break;
      case "plane":
      default:
        this.app.geometry = new THREE.PlaneGeometry(
          this.app.params.planeWidth,
          this.app.params.planeHeight,
          segmentCount,
          segmentCount
        );
        break;
    }

    // Standard smooth shading
    this.app.geometry.computeVertexNormals();

    if (!this.app.material) return;

    // Dispose of the old material if it exists
    if (this.app.material) {
      this.app.material.dispose();
    }

    // Create a new material with the appropriate vertex shader
    this.app.material = new THREE.ShaderMaterial({
      vertexShader:
        this.app.params.geometryType === "sphere"
          ? this.app.shaders.sphereVertex
          : this.app.params.geometryType === "cube"
          ? this.app.shaders.cubeVertex
          : this.app.shaders.vertex,
      fragmentShader:
        this.app.params.geometryType === "sphere"
          ? this.app.shaders.sphereFragment
          : this.app.params.geometryType === "cube"
          ? this.app.shaders.cubeFragment
          : this.app.shaders.fragment,
      uniforms: this.app.uniforms,
      side: THREE.DoubleSide,
    });

    // Apply wireframe property directly to the material
    this.app.material.wireframe = this.app.params.showWireframe;

    // Create the mesh with the geometry and material
    this.app.plane = new THREE.Mesh(this.app.geometry, this.app.material);

    // Set the rotation
    this.app.plane.rotation.x = this.app.params.rotationX;
    this.app.plane.rotation.y = this.app.params.rotationY;
    this.app.plane.rotation.z = this.app.params.rotationZ;

    // Add to scene
    this.app.scene.add(this.app.plane);
  }

  /**
   * Get adaptive segment count based on performance considerations
   * This reduces resolution during rapid changes to maintain performance
   */
  private getAdaptiveSegmentCount(): number {
    // If adaptive resolution is disabled in app parameters, just return the requested segments
    if (this.app.params.useAdaptiveResolution === false) {
      return this.app.params.planeSegments;
    }

    const requestedSegments = this.app.params.planeSegments;

    // If we're in a high-performance context or resolution is already low, use the requested value
    if (requestedSegments <= 64) {
      return requestedSegments;
    }

    // Check if we're in a performance-critical situation (e.g., rapid slider changes)
    const now = performance.now();
    if (!this._lastGeometryUpdateTime) {
      this._lastGeometryUpdateTime = now;
      this._geometryUpdateCount = 0;
      return requestedSegments;
    }

    // Calculate time since last update and update the counter
    const timeSinceLastUpdate = now - this._lastGeometryUpdateTime;
    this._lastGeometryUpdateTime = now;

    // If updates are happening rapidly (less than 300ms apart), increment counter
    if (timeSinceLastUpdate < 300) {
      this._geometryUpdateCount++;
    } else {
      // Reset counter if updates are not rapid
      this._geometryUpdateCount = 0;
    }

    // Apply adaptive reduction based on update frequency
    if (this._geometryUpdateCount > 3) {
      // During rapid updates, reduce resolution for better performance
      // The more rapid updates, the more we reduce
      const reductionFactor = Math.min(
        0.75,
        (0.25 * Math.min(this._geometryUpdateCount, 10)) / 3
      );
      const reducedSegments = Math.max(
        32,
        Math.floor(requestedSegments * (1 - reductionFactor))
      );

      // Log the reduction for debugging
      console.log(
        `Performance optimization: Reducing resolution from ${requestedSegments} to ${reducedSegments}`
      );

      return reducedSegments;
    }

    // Use requested resolution if not in a performance-critical situation
    return requestedSegments;
  }

  // Add properties to track geometry updates
  private _lastGeometryUpdateTime: number | null = null;
  private _geometryUpdateCount: number = 0;

  /**
   * Update shader parameters
   */
  updateParams(updateCamera = false): void {
    if (!this.app.renderer) return;

    // Update noise parameters
    this.app.uniforms.uNoiseScaleX.value = this.app.params.normalNoiseScaleX;
    this.app.uniforms.uNoiseScaleY.value = this.app.params.normalNoiseScaleY;
    this.app.uniforms.uNoiseSpeed.value = this.app.params.normalNoiseSpeed;
    this.app.uniforms.uNoiseStrength.value =
      this.app.params.normalNoiseStrength;

    this.app.uniforms.uNoiseShiftX.value = this.app.params.normalNoiseShiftX;
    this.app.uniforms.uNoiseShiftY.value = this.app.params.normalNoiseShiftY;
    this.app.uniforms.uNoiseShiftSpeed.value =
      this.app.params.normalNoiseShiftSpeed;

    // Update color noise parameters
    this.app.uniforms.uColorNoiseScale.value = this.app.params.colorNoiseScale;
    this.app.uniforms.uColorNoiseSpeed.value = this.app.params.colorNoiseSpeed;

    // Update grain effect parameters
    this.app.uniforms.uEnableGrain.value = this.app.params.enableGrain;
    this.app.uniforms.uGrainIntensity.value = this.app.params.grainIntensity;
    this.app.uniforms.uGrainScale.value = this.app.params.grainScale;
    this.app.uniforms.uGrainDensity.value = this.app.params.grainDensity;
    this.app.uniforms.uGrainSpeed.value = this.app.params.grainSpeed;

    // Update gradient shift parameters
    this.app.uniforms.uGradientShiftX.value = this.app.params.gradientShiftX;
    this.app.uniforms.uGradientShiftY.value = this.app.params.gradientShiftY;
    this.app.uniforms.uGradientShiftSpeed.value =
      this.app.params.gradientShiftSpeed;

    // Update gradient mode
    this.app.uniforms.uGradientMode.value = this.app.params.gradientMode;

    // Update geometry type
    if (this.app.uniforms.uGeometryType) {
      this.app.uniforms.uGeometryType.value =
        this.app.params.geometryType === "sphere"
          ? 1.0
          : this.app.params.geometryType === "cube"
          ? 2.0
          : 0.0;
    }

    // Create or update the color stops texture
    this.updateColorStopsTexture();

    // Also update legacy color uniforms for backward compatibility
    const c1 = new THREE.Color(this.app.params.color1);
    const c2 = new THREE.Color(this.app.params.color2);
    const c3 = new THREE.Color(this.app.params.color3);
    const c4 = new THREE.Color(this.app.params.color4);

    this.app.uniforms.uColors.value[0].set(c1.r, c1.g, c1.b);
    this.app.uniforms.uColors.value[1].set(c2.r, c2.g, c2.b);
    this.app.uniforms.uColors.value[2].set(c3.r, c3.g, c3.b);
    this.app.uniforms.uColors.value[3].set(c4.r, c4.g, c4.b);

    // Update lighting
    // IMPORTANT: We create a normalized copy of the light direction for the shader
    // but never modify the original app.params values to avoid synchronization issues
    // between the UI components and the shader

    // Create a normalized light direction vector WITHOUT modifying the original parameters
    const lightDir = new THREE.Vector3(
      this.app.params.lightDirX,
      this.app.params.lightDirY,
      this.app.params.lightDirZ
    ).normalize();

    // Set the normalized vector to the uniform
    this.app.uniforms.uLightDir.value.copy(lightDir);

    // Update lighting intensity values
    this.app.uniforms.uDiffuseIntensity.value =
      this.app.params.diffuseIntensity;
    this.app.uniforms.uAmbientIntensity.value =
      this.app.params.ambientIntensity;
    this.app.uniforms.uRimLightIntensity.value =
      this.app.params.rimLightIntensity;

    // Apply wireframe property directly to the material if it exists
    if (this.app.material) {
      this.app.material.wireframe = this.app.params.showWireframe;
    }

    // Update plane transform
    if (this.app.plane) {
      this.app.plane.rotation.x = this.app.params.rotationX;
      this.app.plane.rotation.y = this.app.params.rotationY;
      this.app.plane.rotation.z = this.app.params.rotationZ;
    }

    // Update camera parameters only if explicitly requested
    if (updateCamera && this.app.camera && this.app.controls) {
      // Update camera FOV
      if (this.app.camera.fov !== this.app.params.cameraFov) {
        this.app.camera.fov = this.app.params.cameraFov;
        this.app.camera.updateProjectionMatrix();
      }

      // Update camera distance if using OrbitControls
      const currentDistance = this.app.camera.position.distanceTo(
        this.app.controls.target
      );
      if (Math.abs(currentDistance - this.app.params.cameraDistance) > 0.01) {
        // Calculate new position while maintaining direction
        const direction = this.app.camera.position
          .clone()
          .sub(this.app.controls.target)
          .normalize();
        const newPosition = direction
          .multiplyScalar(this.app.params.cameraDistance)
          .add(this.app.controls.target);
        this.app.camera.position.copy(newPosition);
        this.app.controls.update();
      }
    }

    // Always save current camera position and target to params
    if (this.app.camera) {
      this.app.params.cameraPosX = this.app.camera.position.x;
      this.app.params.cameraPosY = this.app.camera.position.y;
      this.app.params.cameraPosZ = this.app.camera.position.z;

      if (this.app.controls) {
        this.app.params.cameraTargetX = this.app.controls.target.x;
        this.app.params.cameraTargetY = this.app.controls.target.y;
        this.app.params.cameraTargetZ = this.app.controls.target.z;
      }
    }

    // Update background - removed exportTransparentBg reference
    // Background settings are now controlled through the facade
  }

  /**
   * Create or update the color stops texture for the shader
   */
  private updateColorStopsTexture(): void {
    try {
      // Get color initializer
      const colorInitializer = getColorInitializer();

      // Get current color stops
      const colorStops = colorInitializer.getSignal("colorStops").value;

      // Handle empty case
      if (!colorStops || colorStops.length === 0) {
        console.warn("No color stops found, using defaults");
        return;
      }

      // Sort stops by position
      const sortedStops = [...colorStops].sort(
        (a, b) => a.position - b.position
      );
      const stopCount = sortedStops.length;

      // Debug the color stops
      // this.debugColorStops(sortedStops);

      // Create a texture to hold color stops (RGBA format)
      // We use the alpha channel to store the stop position
      const data = new Float32Array(stopCount * 4);

      // Fill the texture data
      sortedStops.forEach((stop, index) => {
        const color = new THREE.Color(stop.color);
        const i = index * 4;
        data[i] = color.r;
        data[i + 1] = color.g;
        data[i + 2] = color.b;
        data[i + 3] = stop.position;
      });

      // Important: We need to create a new texture each time to avoid WebGL errors
      // This is better than trying to update an existing texture's dimensions
      if (this.colorStopsTexture) {
        // Dispose old texture to prevent memory leaks
        this.colorStopsTexture.dispose();
      }

      // Create new texture
      this.colorStopsTexture = new THREE.DataTexture(
        data,
        stopCount,
        1,
        THREE.RGBAFormat,
        THREE.FloatType
      );

      // Set proper texture parameters for point sampling
      this.colorStopsTexture.magFilter = THREE.NearestFilter;
      this.colorStopsTexture.minFilter = THREE.NearestFilter;
      this.colorStopsTexture.wrapS = THREE.ClampToEdgeWrapping;
      this.colorStopsTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.colorStopsTexture.needsUpdate = true;

      // Create/update uniforms
      if (!this.app.uniforms.uColorStops) {
        this.app.uniforms.uColorStops = { value: this.colorStopsTexture };
      } else {
        this.app.uniforms.uColorStops.value = this.colorStopsTexture;
      }

      // Create/update count uniform
      if (!this.app.uniforms.uColorStopCount) {
        this.app.uniforms.uColorStopCount = { value: stopCount };
      } else {
        this.app.uniforms.uColorStopCount.value = stopCount;
      }
    } catch (error) {
      console.error("Error updating color stops texture:", error);
    }
  }

  /**
   * Debug helper to print color stop information
   */
  private debugColorStops(stops: ColorStop[]): void {
    console.log("Color stops for texture:");
    stops.forEach((stop, index) => {
      console.log(
        `Stop ${index}: color=${stop.color}, position=${stop.position}`
      );
    });
  }

  /**
   * Clean up Three.js resources
   */
  dispose(): void {
    // Remove window resize handler
    window.removeEventListener("resize", this.handleResize);

    // Dispose of Three.js objects
    if (this.app.geometry) {
      this.app.geometry.dispose();
      this.app.geometry = null;
    }

    if (this.app.material) {
      this.app.material.dispose();
      this.app.material = null;
    }

    // Dispose of controls
    if (this.app.controls) {
      this.app.controls.dispose();
      this.app.controls = null;
    }

    // Clean up scene
    if (this.app.scene) {
      this.app.scene.clear();
      this.app.scene = null;
    }

    // Remove DOM elements and dispose renderer
    if (this.app.renderer) {
      if (
        this.app.renderer.domElement &&
        this.app.renderer.domElement.parentElement
      ) {
        this.app.renderer.domElement.parentElement.removeChild(
          this.app.renderer.domElement
        );
      }
      this.app.renderer.dispose();
      this.app.renderer = null;
    }

    console.log("SceneManager resources cleaned up");
  }

  /**
   * Recreate geometry with high quality
   * Used for high quality exports and after rapid interactions
   */
  recreateGeometryHighQuality(): void {
    if (!this.app.scene) return;

    console.log("Creating high quality geometry");

    // Store current segments
    const currentPlaneSegments = this.app.params.planeSegments;
    const currentSphereWidthSegments = this.app.params.sphereWidthSegments;
    const currentSphereHeightSegments = this.app.params.sphereHeightSegments;
    const currentCubeSegments = this.app.params.cubeSegments;

    // Increase segment counts for high quality
    // Use more aggressive multiplication for export
    const highQualityMultiplier = 4; // 4x the segments for high quality exports

    // Set higher resolution limits for high quality
    const maxPlaneSegments = 512;
    const maxSphereSegments = 256;
    const maxCubeSegments = 128;

    // Apply higher segment counts with upper limits to prevent crashes
    this.app.params.planeSegments = Math.min(
      maxPlaneSegments,
      Math.max(currentPlaneSegments * highQualityMultiplier, 128)
    );
    this.app.params.sphereWidthSegments = Math.min(
      maxSphereSegments,
      Math.max(currentSphereWidthSegments * highQualityMultiplier, 64)
    );
    this.app.params.sphereHeightSegments = Math.min(
      maxSphereSegments,
      Math.max(currentSphereHeightSegments * highQualityMultiplier, 64)
    );
    this.app.params.cubeSegments = Math.min(
      maxCubeSegments,
      Math.max(currentCubeSegments * highQualityMultiplier, 32)
    );

    console.log("High quality segments:", {
      plane: this.app.params.planeSegments,
      sphereWidth: this.app.params.sphereWidthSegments,
      sphereHeight: this.app.params.sphereHeightSegments,
      cube: this.app.params.cubeSegments,
    });

    if (this.app.plane) {
      this.app.scene.remove(this.app.plane);
    }

    if (this.app.geometry) {
      this.app.geometry.dispose();
    }

    // Create new geometry with increased resolution based on the selected type
    switch (this.app.params.geometryType) {
      case "sphere":
        this.app.geometry = new THREE.SphereGeometry(
          this.app.params.sphereRadius,
          this.app.params.sphereWidthSegments,
          this.app.params.sphereHeightSegments
        );
        break;
      case "cube":
        this.app.geometry = new THREE.BoxGeometry(
          this.app.params.cubeSize,
          this.app.params.cubeSize,
          this.app.params.cubeSize,
          this.app.params.cubeSegments,
          this.app.params.cubeSegments,
          this.app.params.cubeSegments
        );
        break;
      case "plane":
      default:
        this.app.geometry = new THREE.PlaneGeometry(
          this.app.params.planeWidth,
          this.app.params.planeHeight,
          this.app.params.planeSegments,
          this.app.params.planeSegments
        );
        break;
    }

    // Standard smooth shading
    this.app.geometry.computeVertexNormals();

    if (!this.app.material) return;

    // Apply wireframe property directly to the material
    this.app.material.wireframe = this.app.params.showWireframe;

    // Create the mesh with the geometry and material
    this.app.plane = new THREE.Mesh(this.app.geometry, this.app.material);

    // Set the rotation
    this.app.plane.rotation.x = this.app.params.rotationX;
    this.app.plane.rotation.y = this.app.params.rotationY;
    this.app.plane.rotation.z = this.app.params.rotationZ;

    // Add to scene
    this.app.scene.add(this.app.plane);

    // Restore original segment counts to avoid affecting the UI state
    this.app.params.planeSegments = currentPlaneSegments;
    this.app.params.sphereWidthSegments = currentSphereWidthSegments;
    this.app.params.sphereHeightSegments = currentSphereHeightSegments;
    this.app.params.cubeSegments = currentCubeSegments;
  }

  /**
   * Set whether to use adaptive resolution for geometry
   * @param enabled Whether to use adaptive resolution
   */
  setAdaptiveResolution(enabled: boolean): void {
    this.useAdaptiveResolution = enabled;
    // If we're disabling adaptive resolution and currently using reduced resolution,
    // recreate the geometry with the full resolution
    if (!enabled && this._geometryUpdateCount > 3) {
      this._geometryUpdateCount = 0;
      this.recreateGeometry();
    }
  }

  /**
   * Set background transparency for the renderer
   * @param transparent Whether the background should be transparent
   */
  public setBackgroundTransparency(transparent: boolean): void {
    if (!this.app || !this.app.renderer) return;

    if (transparent) {
      // Set transparent background (alpha = 0)
      this.app.renderer.setClearColor(0x000000, 0);

      // Apply checkered background to the canvas element for UI visibility
      const canvas = this.app.renderer.domElement;
      canvas.style.backgroundColor = "#191919";
      canvas.style.backgroundImage = `
        linear-gradient(45deg, #222222 25%, transparent 25%), 
        linear-gradient(-45deg, #222222 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #222222 75%),
        linear-gradient(-45deg, transparent 75%, #222222 75%)
      `;
      canvas.style.backgroundSize = "20px 20px";
      canvas.style.backgroundPosition = "0 0, 0 10px, 10px -10px, -10px 0px";
    } else {
      // Set solid background color - explicitly setting alpha to 1.0 for full opacity
      const bgColor = new THREE.Color(this.app.params.backgroundColor);
      this.app.renderer.setClearColor(bgColor, 1.0);

      // Remove checkered background
      const canvas = this.app.renderer.domElement;
      canvas.style.backgroundColor = "";
      canvas.style.backgroundImage = "";
      canvas.style.backgroundSize = "";
      canvas.style.backgroundPosition = "";
    }

    // Force a render update if scene and camera are available
    if (this.app.scene && this.app.camera) {
      this.app.renderer.render(this.app.scene, this.app.camera);
    }
  }
}
