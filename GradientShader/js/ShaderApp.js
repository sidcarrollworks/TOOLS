/**
 * ShaderApp - Main application class for the GLSL Gradient Shader Generator
 */
// Import modules
import { ShaderLoader } from './modules/ShaderLoader.js';
import { SceneManager } from './modules/SceneManager.js';
import { GUIManager } from './modules/GUIManager.js';
import { PresetManager } from './modules/PresetManager.js';
import { Utils } from './modules/Utils.js';
import { ExportManager } from './modules/ExportManager.js';

class ShaderApp {
  constructor() {
    // Initialize properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null; // OrbitControls
    this.plane = null;
    this.geometry = null;
    this.material = null;
    this.gui = null;
    this.controllers = [];
    this.time = 0;
    this.stats = null; // Performance stats
    this.shaders = {
      perlinNoise: '',
      vertex: '',
      fragment: ''
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
      wireframeColor: "#ffffff",
      
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
      uWireframeColor: { value: new THREE.Color(this.params.wireframeColor) },
    };
    
    // Initialize managers
    this.shaderLoader = new ShaderLoader();
    this.sceneManager = new SceneManager(this);
    this.guiManager = new GUIManager(this);
    this.presetManager = new PresetManager(this);
    this.utils = new Utils();
    this.exportManager = new ExportManager(this);
    
    // Preset functions
    this.presets = {
      Default: this.presetManager.presetDefault.bind(this.presetManager),
      "Ocean Waves": this.presetManager.presetOceanWaves.bind(this.presetManager),
      "Lava Flow": this.presetManager.presetLavaFlow.bind(this.presetManager),
      "Abstract Art": this.presetManager.presetAbstractArt.bind(this.presetManager),
    };
  }
  
  /**
   * Initialize the application
   */
  async init() {
    try {
      // Check for WebGL support
      if (!this.utils.isWebGLAvailable()) {
        throw new Error("WebGL not supported");
      }
      
      // Load shader files
      await this.shaderLoader.loadShaders(this.shaders);
      
      // Set up Three.js scene
      this.sceneManager.setupScene();
      
      // Set up performance stats
      this.utils.setupStats(this);
      
      // Set up GUI
      this.guiManager.setupGUI();
      
      // Set up event listeners
      this.guiManager.setupEventListeners();
      
      // Load default preset
      this.presetManager.presetDefault();
      
      // Ensure parameters are properly applied on initial load
      this.updateParams(true);
      
      // Start animation loop
      this.animate();
      
      return true; // Initialization successful
    } catch (error) {
      console.error("Initialization failed:", error);
      alert(`Failed to initialize: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Update parameters
   */
  updateParams(updateCamera = false) {
    // Call the update method in SceneManager
    this.sceneManager.updateParams(updateCamera);
  }
  
  /**
   * Recreate plane
   */
  recreatePlane() {
    this.sceneManager.recreatePlane();
  }
  
  /**
   * Animation loop
   */
  animate() {
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
    
    this.renderer.render(this.scene, this.camera);
    
    // End stats measurement
    if (this.stats) this.stats.end();
  }
  
  /**
   * Save canvas as image
   */
  saveAsImage() {
    this.utils.saveAsImage(this);
  }
  
  /**
   * Export code
   */
  exportCode() {
    this.exportManager.exportCode();
  }
  
  /**
   * Clean up resources when app is destroyed
   */
  dispose() {
    // Cancel animation loop
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
    
    // Call dispose on all managers
    this.guiManager.dispose();
    this.sceneManager.dispose();
    this.utils.cleanupStats(this);
    this.exportManager.dispose();
    
    // Remove reference to uniforms
    this.uniforms = null;
    this.uniformColors = null;
    
    console.log('ShaderApp resources cleaned up');
  }
}

// Export the class
export { ShaderApp }; 