/**
 * PresetManager - Handles preset configurations
 */
export class PresetManager {
  /**
   * Create a PresetManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app) {
    this.app = app;
  }
  
  /**
   * Preset: Default
   */
  presetDefault() {
    this.app.params.planeWidth = 3.8;
    this.app.params.planeHeight = 3.2;
    this.app.params.normalNoiseScaleX = 1.7;
    this.app.params.normalNoiseScaleY = 3.5;
    this.app.params.normalNoiseSpeed = 0.08;
    this.app.params.normalNoiseStrength = 0.15;
    this.app.params.normalNoiseShiftX = 0.0;
    this.app.params.normalNoiseShiftY = 0.0;
    this.app.params.normalNoiseShiftSpeed = 0.0;
    this.app.params.colorNoiseScale = 2.0;
    this.app.params.colorNoiseSpeed = 0.3;
    this.app.params.gradientMode = 0; // B-spline
    this.app.params.color1 = "#fff";
    this.app.params.color2 = "#fff";
    this.app.params.color3 = "#fff";
    this.app.params.color4 = "#fff";

    this.app.params.rotationX = -1.1;
    this.app.params.rotationY = 0;
    this.app.params.rotationZ = 0;
    this.app.params.cameraDistance = 0.9;
    this.app.params.cameraFov = 30;
    this.app.params.backgroundColor = "#fcfcfc";
    
    this.app.updateParams(true);
    this.app.guiManager.updateGUI();
    this.app.recreatePlane();
    
    // Reset camera position
    if (this.app.controls) {
      this.app.controls.reset();
      this.app.camera.position.set(0, 0, this.app.params.cameraDistance);
      this.app.controls.update();
    }
  }
  
  /**
   * Preset: Ocean Waves
   */
  presetOceanWaves() {
    this.app.params.normalNoiseScaleX = 5.0;
    this.app.params.normalNoiseScaleY = 5.0;
    this.app.params.normalNoiseSpeed = 0.3;
    this.app.params.normalNoiseStrength = 0.1;
    this.app.params.normalNoiseShiftX = 0.1;
    this.app.params.normalNoiseShiftY = 0.1;
    this.app.params.normalNoiseShiftSpeed = 0.08;
    this.app.params.colorNoiseScale = 3.0;
    this.app.params.colorNoiseSpeed = 0.2;
    this.app.params.gradientMode = 1; // Linear interpolation
    this.app.params.color1 = "#006994";
    this.app.params.color2 = "#0099cc";
    this.app.params.color3 = "#00ffcc";
    this.app.params.color4 = "#0080ff";

    // Set up gradient shift for wave-like movement
    this.app.params.gradientShiftX = 0.5;  // Horizontal wave movement
    this.app.params.gradientShiftY = 0.2;  // Slight vertical movement
    this.app.params.gradientShiftSpeed = 0.08;  // Moderate speed

    this.app.params.backgroundColor = "#001030";
    this.app.params.rotationX = -Math.PI / 3;
    
    this.app.updateParams(true);
    this.app.guiManager.updateGUI();
    this.app.recreatePlane();
    
    // Reset camera position
    if (this.app.controls) {
      this.app.controls.reset();
      this.app.camera.position.set(0, 0, this.app.params.cameraDistance);
      this.app.controls.update();
    }
  }
  
  /**
   * Preset: Lava Flow
   */
  presetLavaFlow() {
    this.app.params.normalNoiseScaleX = 1.6;
    this.app.params.normalNoiseScaleY = 3.7;
    this.app.params.normalNoiseSpeed = 0.1;
    this.app.params.normalNoiseStrength = 0.2;
    this.app.params.normalNoiseShiftX = -0.05;
    this.app.params.normalNoiseShiftY = -0.05;
    this.app.params.normalNoiseShiftSpeed = 0.0;
    this.app.params.colorNoiseScale = 6.1;
    this.app.params.colorNoiseSpeed = 0.15;
    this.app.params.gradientMode = 3; // Smooth step
    this.app.params.color1 = "#9f0000";
    this.app.params.color2 = "#ff3000";
    this.app.params.color3 = "#ff6633";
    this.app.params.color4 = "#ff9900";

    this.app.params.backgroundColor = "#1A0000";
    this.app.params.lightY = 0.5;
    
    this.app.updateParams(true);
    this.app.guiManager.updateGUI();
    this.app.recreatePlane();
    
    // Reset camera position
    if (this.app.controls) {
      this.app.controls.reset();
      this.app.camera.position.set(0, 0, this.app.params.cameraDistance);
      this.app.controls.update();
    }
  }
  
  /**
   * Preset: Abstract Art
   */
  presetAbstractArt() {
    this.app.params.normalNoiseScaleX = 1.7;
    this.app.params.normalNoiseScaleY = 3.5;
    this.app.params.normalNoiseSpeed = 0.08;
    this.app.params.normalNoiseStrength = 0.15;
    this.app.params.normalNoiseShiftX = 0.09;
    this.app.params.normalNoiseShiftY = 0.0;
    this.app.params.normalNoiseShiftSpeed = 0.0;
    this.app.params.colorNoiseScale = 4.9;
    this.app.params.colorNoiseSpeed = 0.08;
    this.app.params.gradientMode = 3; // Smooth step function
    this.app.params.color1 = "#fffd82";
    this.app.params.color2 = "#e84855";
    this.app.params.color3 = "#2b3a67";
    this.app.params.color4 = "#20ffe8";
    this.app.params.planeHeight = 3.2;
    this.app.params.planeWidth = 3.8;

    this.app.params.lightDirY = 0.8;
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.91;
    this.app.params.ambientIntensity = 0.65;
    this.app.params.rimLightIntensity = 0.49;

    this.app.params.rotationX = -Math.PI / 2.854;
    this.app.params.rotationY = 0;
    this.app.params.backgroundColor = "#000000";
    
    this.app.updateParams(true);
    this.app.guiManager.updateGUI();
    this.app.recreatePlane();
    
    // Reset camera position
    if (this.app.controls) {
      this.app.controls.reset();
      this.app.camera.position.set(0, 0, this.app.params.cameraDistance);
      this.app.controls.update();
    }
  }
} 