import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ShaderLoader } from "./modules/ShaderLoader";
import { SceneManager } from "./modules/SceneManager";
import { PresetManager } from "./modules/PresetManager";
import { Utils } from "./modules/Utils";
import { ExportManager } from "./modules/ExportManager";
import Stats from "stats.js";

// Define types
export interface ShaderParams {
  // Plane geometry
  planeWidth: number;
  planeHeight: number;
  planeSegments: number;

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
  flatShading: boolean;

  // Animation
  animationSpeed: number;
  pauseAnimation: boolean;

  // Export options
  exportTransparentBg: boolean;
  exportHighQuality: boolean;
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
  geometry: THREE.PlaneGeometry | null;
  material: THREE.ShaderMaterial | null;

  // GUI and control state
  params: ShaderParams;
  presets: ShaderPresets;
  controllers: any[];

  // Animation state
  time: number;
  stats: Stats | null;
  private _animationFrameId: number | null;

  // Shader resources
  shaders: {
    perlinNoise: string;
    vertex: string;
    fragment: string;
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
    this.shaders = {
      perlinNoise: "",
      vertex: "",
      fragment: "",
    };

    // Animation frame ID for cancellation
    this._animationFrameId = null;

    // Default parameters
    this.params = {
      // Plane geometry
      planeWidth: 2,
      planeHeight: 2,
      planeSegments: 128,

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

      // Gradient shift
      gradientShiftX: 0.2,
      gradientShiftY: 0.1,
      gradientShiftSpeed: 0.05,

      // Colors
      gradientMode: 0, // 0: B-spline, 1: Linear, 2: Step, 3: Smooth step, 4: Direct mapping
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
      flatShading: false,

      // Animation
      animationSpeed: 0.01,
      pauseAnimation: false,

      // Export options
      exportTransparentBg: false,
      exportHighQuality: true,
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
      uShowWireframe: { value: this.params.showWireframe },
    };

    // Initialize managers
    this.shaderLoader = new ShaderLoader();
    this.sceneManager = new SceneManager(this);
    this.presetManager = new PresetManager(this);
    this.utils = new Utils();
    this.exportManager = new ExportManager(this);

    // Preset functions
    this.presets = {
      Default: this.presetManager.presetDefault.bind(this.presetManager),
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

      // Set up performance stats
      this.utils.setupStats(this);

      // Load default preset
      this.presetManager.presetDefault();

      // Ensure parameters are properly applied on initial load
      this.updateParams(true);

      // Start animation loop
      this.animate();

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
   * Recreate plane
   */
  recreatePlane(): void {
    this.sceneManager.recreatePlane();
    
    // Update the dev panel if it's been set up
    if ("updateDevPanel" in this) {
      (this as any).updateDevPanel();
    }
  }

  /**
   * Recreate plane with full quality (used after rapid interactions end)
   */
  recreatePlaneHighQuality(): void {
    this.sceneManager.recreatePlaneHighQuality();
    
    // Update the dev panel if it's been set up
    if ("updateDevPanel" in this) {
      (this as any).updateDevPanel();
    }
  }

  /**
   * Animation loop
   */
  animate(): void {
    this._animationFrameId = requestAnimationFrame(this.animate.bind(this));

    // Begin stats measurement
    if (this.stats) this.stats.begin();

    if (!this.params.pauseAnimation) {
      // Update time for shader uniforms
      this.time += this.params.animationSpeed;
    }

    // Always update the time uniform
    this.uniforms.uTime.value = this.time;

    // Update OrbitControls
    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // End stats measurement
    if (this.stats) this.stats.end();
  }

  /**
   * Save canvas as image
   */
  saveAsImage(): void {
    this.exportManager.saveAsImage();
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

    console.log("Application resources cleaned up");
  }
}
