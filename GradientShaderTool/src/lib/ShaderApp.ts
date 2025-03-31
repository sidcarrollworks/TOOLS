import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ShaderLoader } from "./modules/ShaderLoader";
import { SceneManager } from "./modules/SceneManager";
import { PresetManager } from "./modules/PresetManager";
import { Utils } from "./modules/Utils";
import { ExportManager } from "./modules/ExportManager";
import Stats from "stats.js";
import { getCameraInitializer } from "./stores/CameraInitializer";

// Define types
export interface ShaderParams {
  // Geometry type and parameters
  geometryType: string; // 'plane', 'sphere', 'cube', etc.
  // Plane geometry
  planeWidth: number;
  planeHeight: number;
  planeSegments: number;

  // Sphere geometry
  sphereRadius: number;
  sphereWidthSegments: number;
  sphereHeightSegments: number;

  // Cube geometry
  cubeSize: number;
  cubeSegments: number;
  cubeWidthSegments: number;
  cubeHeightSegments: number;
  cubeDepthSegments: number;

  // Rotation
  rotationX: number;
  rotationY: number;
  rotationZ: number;

  // Camera
  cameraDistance: number;
  cameraFov: number;
  cameraPosX: number;
  cameraPosY: number;
  cameraPosZ: number;
  cameraTargetX: number;
  cameraTargetY: number;
  cameraTargetZ: number;

  // Normal noise
  normalNoiseScaleX: number;
  normalNoiseScaleY: number;
  normalNoiseSpeed: number;
  normalNoiseStrength: number;
  normalNoiseShiftX: number;
  normalNoiseShiftY: number;
  normalNoiseShiftSpeed: number;

  // Color noise
  colorNoiseScale: number;
  colorNoiseSpeed: number;

  // Grain effect
  enableGrain: boolean;
  grainIntensity: number;
  grainScale: number;
  grainDensity: number;
  grainSpeed: number;
  grainThreshold: number;

  // Gradient shift
  gradientShiftX: number;
  gradientShiftY: number;
  gradientShiftSpeed: number;

  // Colors
  gradientMode: number;
  color1: string;
  color2: string;
  color3: string;
  color4: string;

  // Lighting
  lightDirX: number;
  lightDirY: number;
  lightDirZ: number;
  diffuseIntensity: number;
  ambientIntensity: number;
  rimLightIntensity: number;

  // Visualization
  backgroundColor: string;
  showWireframe: boolean;
  wireframeColor: string;
  flatShading: boolean;

  // Animation
  animationSpeed: number;
  pauseAnimation: boolean;

  // Export options
  exportTransparentBg: boolean;
  exportHighQuality: boolean;

  // Performance options
  useAdaptiveResolution: boolean;

  // Anti-aliasing
}

export interface ShaderPresets {
  [key: string]: () => void;
}

export class ShaderApp {
  // Three.js objects
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  plane: THREE.Mesh | null;
  geometry: THREE.BufferGeometry | null;
  material: THREE.ShaderMaterial | null;

  // GUI and control state
  params: ShaderParams;
  presets: ShaderPresets;
  controllers: any[];

  // Animation state
  time: number;
  stats: Stats | null;
  private _animationFrameId: number | null;
  private _clock: THREE.Clock;

  // Shader resources
  shaders: {
    perlinNoise: string;
    vertex: string;
    sphereVertex: string;
    cubeVertex: string;
    fragment: string;
    sphereFragment: string;
    cubeFragment: string;
  };

  // Uniform values for the shader
  uniforms: { [key: string]: THREE.IUniform };
  uniformColors: THREE.Vector3[];

  // Module instances
  shaderLoader: ShaderLoader;
  sceneManager: SceneManager;
  presetManager: PresetManager;
  utils: Utils;
  exportManager: ExportManager;

  // Reference to parent element
  parentElement: HTMLElement | null;

  constructor() {
    // Initialize properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.plane = null;
    this.geometry = null;
    this.material = null;
    this.controllers = [];
    this.time = 0;
    this.stats = null;
    this.parentElement = null;
    this._clock = new THREE.Clock();
    this.shaders = {
      perlinNoise: "",
      vertex: "",
      sphereVertex: "",
      cubeVertex: "",
      fragment: "",
      sphereFragment: "",
      cubeFragment: "",
    };

    // Animation frame ID for cancellation
    this._animationFrameId = null;

    // Default parameters
    this.params = {
      // Geometry type and parameters
      geometryType: "plane",
      // Plane geometry
      planeWidth: 2,
      planeHeight: 2,
      planeSegments: 128,

      // Sphere geometry
      sphereRadius: 1,
      sphereWidthSegments: 32,
      sphereHeightSegments: 32,

      // Cube geometry
      cubeSize: 1,
      cubeSegments: 1,
      cubeWidthSegments: 1,
      cubeHeightSegments: 1,
      cubeDepthSegments: 1,

      // Rotation
      rotationX: -Math.PI / 4, // 45 degrees
      rotationY: 0,
      rotationZ: 0,

      // Camera
      cameraDistance: 2,
      cameraFov: 90,
      cameraPosX: 0,
      cameraPosY: 0,
      cameraPosZ: 2,
      cameraTargetX: 0,
      cameraTargetY: 0,
      cameraTargetZ: 0,

      // Normal noise
      normalNoiseScaleX: 3.0,
      normalNoiseScaleY: 3.0,
      normalNoiseSpeed: 0.2,
      normalNoiseStrength: 0.15,
      normalNoiseShiftX: 0.0,
      normalNoiseShiftY: 0.0,
      normalNoiseShiftSpeed: 0.0,

      // Color noise
      colorNoiseScale: 2.0,
      colorNoiseSpeed: 0.3,

      // Grain effect
      enableGrain: false,
      grainIntensity: 0.1,
      grainScale: 1.0,
      grainDensity: 0.5,
      grainSpeed: 0.1,
      grainThreshold: 0.1,

      // Gradient shift
      gradientShiftX: 0.2,
      gradientShiftY: 0.1,
      gradientShiftSpeed: 0.05,

      // Colors
      gradientMode: 0, // 0: B-spline, 1: Linear, 2: Step, 3: Smooth step
      color1: "#ff0000",
      color2: "#00ff00",
      color3: "#0000ff",
      color4: "#ffff00",

      // Lighting
      lightDirX: 0.5,
      lightDirY: 0.8,
      lightDirZ: 1.0,
      diffuseIntensity: 0.5,
      ambientIntensity: 0.5,
      rimLightIntensity: 0.3,

      // Visualization
      backgroundColor: "#111111",
      showWireframe: false,
      wireframeColor: "#ffffff",
      flatShading: false,

      // Animation
      animationSpeed: 0.01,
      pauseAnimation: false,

      // Export options
      exportTransparentBg: false,
      exportHighQuality: true,

      // Performance options
      useAdaptiveResolution: false,
    };

    // Uniforms for the shader
    this.uniformColors = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 1, 0),
    ];

    this.uniforms = {
      uTime: { value: 0.0 },
      uNoiseScaleX: { value: this.params.normalNoiseScaleX },
      uNoiseScaleY: { value: this.params.normalNoiseScaleY },
      uNoiseSpeed: { value: this.params.normalNoiseSpeed },
      uNoiseStrength: { value: this.params.normalNoiseStrength },
      uNoiseShiftX: { value: this.params.normalNoiseShiftX },
      uNoiseShiftY: { value: this.params.normalNoiseShiftY },
      uNoiseShiftSpeed: { value: this.params.normalNoiseShiftSpeed },
      uColorNoiseScale: { value: this.params.colorNoiseScale },
      uColorNoiseSpeed: { value: this.params.colorNoiseSpeed },
      uGradientMode: { value: this.params.gradientMode },
      uGeometryType: {
        value:
          this.params.geometryType === "sphere"
            ? 1.0
            : this.params.geometryType === "cube"
            ? 2.0
            : 0.0,
      },

      // Grain effect uniforms
      uEnableGrain: { value: this.params.enableGrain },
      uGrainIntensity: { value: this.params.grainIntensity },
      uGrainScale: { value: this.params.grainScale },
      uGrainDensity: { value: this.params.grainDensity },
      uGrainSpeed: { value: this.params.grainSpeed },
      uGrainThreshold: { value: this.params.grainThreshold },

      // Gradient shift uniforms
      uGradientShiftX: { value: this.params.gradientShiftX },
      uGradientShiftY: { value: this.params.gradientShiftY },
      uGradientShiftSpeed: { value: this.params.gradientShiftSpeed },

      uColors: { value: this.uniformColors },

      uLightDir: {
        value: new THREE.Vector3(
          this.params.lightDirX,
          this.params.lightDirY,
          this.params.lightDirZ
        ).normalize(),
      },
      uDiffuseIntensity: { value: this.params.diffuseIntensity },
      uAmbientIntensity: { value: this.params.ambientIntensity },
      uRimLightIntensity: { value: this.params.rimLightIntensity },
    };

    // Initialize managers
    this.shaderLoader = new ShaderLoader();
    this.sceneManager = new SceneManager(this);
    this.presetManager = new PresetManager(this);
    this.utils = new Utils();
    this.exportManager = new ExportManager(this);

    // Preset functions
    this.presets = {
      "Source Milk": this.presetManager.presetDefault.bind(this.presetManager),
      "Ocean Waves": this.presetManager.presetOceanWaves.bind(
        this.presetManager
      ),
      "Lava Flow": this.presetManager.presetLavaFlow.bind(this.presetManager),
      "Abstract Art": this.presetManager.presetAbstractArt.bind(
        this.presetManager
      ),
    };
  }

  /**
   * Initialize the application
   */
  async init(parentElement: HTMLElement): Promise<boolean> {
    console.log("ShaderApp.init called");

    // Expose ShaderApp instance globally for debugging
    (window as any).shaderApp = this;
    console.log("ShaderApp instance exposed as window.shaderApp for debugging");

    this.parentElement = parentElement;

    try {
      // Check for WebGL support
      if (!this.utils.isWebGLAvailable()) {
        throw new Error("WebGL not supported");
      }

      // Load shader files
      await this.shaderLoader.loadShaders(this.shaders);

      // Set up Three.js scene
      this.sceneManager.setupScene(this.parentElement);

      // Set up performance stats - pass false to hide stats by default
      this.utils.setupStats(this, false);

      // Load default preset
      this.presetManager.presetAbstractArt();

      // Ensure parameters are properly applied on initial load
      this.updateParams(true);

      // Start animation loop
      this.animate();

      // Force the grain effect to be disabled on startup
      this.params.enableGrain = false;
      this.uniforms.uEnableGrain.value = false;

      return true; // Initialization successful
    } catch (error) {
      console.error("Initialization failed:", error);
      if (error instanceof Error) {
        alert(`Failed to initialize: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Update parameters
   */
  updateParams(updateCamera = false): void {
    // Update camera if requested
    if (updateCamera && this.camera) {
      // Update camera position and target
      this.camera.position.set(
        this.params.cameraPosX,
        this.params.cameraPosY,
        this.params.cameraPosZ
      );
      this.camera.lookAt(
        this.params.cameraTargetX,
        this.params.cameraTargetY,
        this.params.cameraTargetZ
      );
      this.camera.fov = this.params.cameraFov;
      this.camera.updateProjectionMatrix();

      if (this.controls) {
        this.controls.target.set(
          this.params.cameraTargetX,
          this.params.cameraTargetY,
          this.params.cameraTargetZ
        );
        this.controls.update();
      }
    }

    // Update uniforms based on current parameters
    if (this.uniforms) {
      // Update normal noise parameters
      this.uniforms.uNoiseScaleX.value = this.params.normalNoiseScaleX;
      this.uniforms.uNoiseScaleY.value = this.params.normalNoiseScaleY;
      this.uniforms.uNoiseSpeed.value = this.params.normalNoiseSpeed;
      this.uniforms.uNoiseStrength.value = this.params.normalNoiseStrength;
      this.uniforms.uNoiseShiftX.value = this.params.normalNoiseShiftX;
      this.uniforms.uNoiseShiftY.value = this.params.normalNoiseShiftY;
      this.uniforms.uNoiseShiftSpeed.value = this.params.normalNoiseShiftSpeed;

      // Update color noise parameters
      this.uniforms.uColorNoiseScale.value = this.params.colorNoiseScale;
      this.uniforms.uColorNoiseSpeed.value = this.params.colorNoiseSpeed;

      // Update grain effect parameters
      this.uniforms.uEnableGrain.value = this.params.enableGrain;
      this.uniforms.uGrainIntensity.value = this.params.grainIntensity;
      this.uniforms.uGrainScale.value = this.params.grainScale;
      this.uniforms.uGrainDensity.value = this.params.grainDensity;
      this.uniforms.uGrainSpeed.value = this.params.grainSpeed;
      this.uniforms.uGrainThreshold.value = this.params.grainThreshold;

      // Update gradient shift parameters
      this.uniforms.uGradientShiftX.value = this.params.gradientShiftX;
      this.uniforms.uGradientShiftY.value = this.params.gradientShiftY;
      this.uniforms.uGradientShiftSpeed.value = this.params.gradientShiftSpeed;

      // Update gradient mode
      this.uniforms.uGradientMode.value = this.params.gradientMode;
    }

    // Call the update method in SceneManager
    this.sceneManager.updateParams(updateCamera);

    // Update the dev panel if it's been set up
    if ("updateDevPanel" in this) {
      (this as any).updateDevPanel();
    }

    // Update the control panel GUI if it's been set up
    if ("updateGUI" in this) {
      (this as any).updateGUI();
    }
  }

  /**
   * Recreate the geometry with current parameters
   */
  recreateGeometry(): void {
    if (this.sceneManager) {
      this.sceneManager.recreateGeometry();
    }
  }

  /**
   * Recreate the geometry with high quality
   */
  recreateGeometryHighQuality(): void {
    if (this.sceneManager) {
      this.sceneManager.recreateGeometryHighQuality();
    }
  }

  /**
   * Animation loop
   */
  animate(): void {
    // Request next frame
    requestAnimationFrame(this.animate.bind(this));

    // Start stats measurement
    if (this.stats) {
      this.stats.begin();
    }

    // Get current time and update time uniform only if not paused
    const time = this._clock.getElapsedTime();
    if (this.uniforms) {
      if (!this.params.pauseAnimation) {
        // Only update the time when animation is not paused
        this.uniforms.uTime.value = time;
        this.time = time; // Update the stored time value
      }
      // When paused, we keep the existing time value
    }

    // Update controls - always do this regardless of animation state
    if (this.controls) {
      this.controls.update();
    }

    // Render the scene - always do this to keep the UI responsive
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // End stats measurement
    if (this.stats) this.stats.end();
  }

  /**
   * Save canvas as image
   * @returns The data URL of the saved image, or null if save failed
   */
  saveAsImage(): string | null {
    return this.exportManager.saveAsImage();
  }

  /**
   * Export code (shaders, parameters, etc.)
   */
  exportCode(): void {
    this.exportManager.exportCode();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Cancel animation loop
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    // Clean up resources in scene manager
    this.sceneManager.dispose();

    // Clean up stats if present
    if (this.stats && this.stats.dom.parentElement) {
      this.stats.dom.parentElement.removeChild(this.stats.dom);
    }
  }

  /**
   * Set whether to use adaptive resolution for geometry
   * @param enabled Whether to use adaptive resolution
   */
  setAdaptiveResolution(enabled: boolean): void {
    if (this.sceneManager) {
      this.sceneManager.setAdaptiveResolution(enabled);
    }
  }

  /**
   * Handle window resize
   */
  handleResize(): void {
    if (!this.renderer || !this.camera || !this.parentElement) {
      return;
    }

    // Get parent element dimensions
    const width = this.parentElement.clientWidth;
    const height = this.parentElement.clientHeight;

    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Reset the pixel ratio in case the device pixel ratio has changed
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Update renderer size
    this.renderer.setSize(width, height);
  }
}
