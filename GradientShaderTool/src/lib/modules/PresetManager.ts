/**
 * PresetManager - Manages preset configurations for the shader app
 */
import { ShaderApp } from "../ShaderApp";

export class PresetManager {
  private app: ShaderApp;

  /**
   * Create a PresetManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
  }

  /**
   * Update all parameters at once
   */
  private updateAllParams(updateGUI = true): void {
    this.app.updateParams(true);

    // Update GUI if applicable (will be implemented in GUIManager for Preact)
    if (updateGUI && "updateGUI" in this.app) {
      (this.app as any).updateGUI();
    }
  }

  /**
   * Default preset
   */
  presetDefault(): void {
    // Reset plane dimensions
    this.app.params.planeWidth = 3.8;
    this.app.params.planeHeight = 3.2;
    this.app.params.planeSegments = 128;

    // Reset rotation
    this.app.params.rotationX = -1.1;
    this.app.params.rotationY = 0;
    this.app.params.rotationZ = 0;

    // Reset camera settings
    this.app.params.cameraDistance = 0.9;
    this.app.params.cameraFov = 30;
    this.app.params.cameraPosX = 0;
    this.app.params.cameraPosY = 0;
    this.app.params.cameraPosZ = 2;
    this.app.params.cameraTargetX = 0;
    this.app.params.cameraTargetY = 0;
    this.app.params.cameraTargetZ = 0;

    // Reset normal noise
    this.app.params.normalNoiseScaleX = 1.7;
    this.app.params.normalNoiseScaleY = 3.5;
    this.app.params.normalNoiseSpeed = 0.08;
    this.app.params.normalNoiseStrength = 0.15;
    this.app.params.normalNoiseShiftX = 0.0;
    this.app.params.normalNoiseShiftY = 0.0;
    this.app.params.normalNoiseShiftSpeed = 0.0;

    // Reset color noise
    this.app.params.colorNoiseScale = 2.0;
    this.app.params.colorNoiseSpeed = 0.3;

    // Reset gradient shift
    this.app.params.gradientShiftX = 0.2;
    this.app.params.gradientShiftY = 0.1;
    this.app.params.gradientShiftSpeed = 0.05;

    // Reset colors
    this.app.params.gradientMode = 0; // B-spline
    this.app.params.color1 = "#ffffff";
    this.app.params.color2 = "#ffffff";
    this.app.params.color3 = "#ffffff";
    this.app.params.color4 = "#ffffff";

    // Reset lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.8;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.5;
    this.app.params.ambientIntensity = 0.5;
    this.app.params.rimLightIntensity = 0.3;

    // Reset visualization
    this.app.params.backgroundColor = "#fcfcfc";
    this.app.params.showWireframe = false;
    this.app.params.wireframeColor = "#ffffff";

    // Reset animation
    this.app.params.animationSpeed = 0.01;
    this.app.params.pauseAnimation = false;

    // Reset export options
    this.app.params.exportTransparentBg = false;
    this.app.params.exportHighQuality = true;

    // Recreate plane and update all parameters
    this.app.recreatePlane();
    this.updateAllParams();
  }

  /**
   * Ocean Waves preset
   */
  presetOceanWaves(): void {
    // Set plane dimensions
    this.app.params.planeWidth = 3;
    this.app.params.planeHeight = 3;
    this.app.params.planeSegments = 192;

    // Set rotation
    this.app.params.rotationX = -Math.PI / 3;
    this.app.params.rotationY = 0;
    this.app.params.rotationZ = 0;

    // Set normal noise
    this.app.params.normalNoiseScaleX = 5.0;
    this.app.params.normalNoiseScaleY = 5.0;
    this.app.params.normalNoiseSpeed = 0.3;
    this.app.params.normalNoiseStrength = 0.1;
    this.app.params.normalNoiseShiftX = 0.1;
    this.app.params.normalNoiseShiftY = 0.1;
    this.app.params.normalNoiseShiftSpeed = 0.08;

    // Set color noise
    this.app.params.colorNoiseScale = 3.0;
    this.app.params.colorNoiseSpeed = 0.2;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.5;
    this.app.params.gradientShiftY = 0.2;
    this.app.params.gradientShiftSpeed = 0.08;

    // Set colors - ocean blue theme
    this.app.params.gradientMode = 1; // Linear interpolation
    this.app.params.color1 = "#006994";
    this.app.params.color2 = "#0099cc";
    this.app.params.color3 = "#00ffcc";
    this.app.params.color4 = "#0080ff";

    // Set lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.8;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.7;
    this.app.params.ambientIntensity = 0.3;
    this.app.params.rimLightIntensity = 0.5;

    // Set visualization
    this.app.params.backgroundColor = "#001030";
    this.app.params.showWireframe = false;

    // Set animation
    this.app.params.animationSpeed = 0.007;

    // Recreate plane and update all parameters
    this.app.recreatePlane();
    this.updateAllParams();
  }

  /**
   * Lava Flow preset
   */
  presetLavaFlow(): void {
    // Set plane dimensions
    this.app.params.planeWidth = 2.5;
    this.app.params.planeHeight = 2.5;
    this.app.params.planeSegments = 160;

    // Set rotation
    this.app.params.rotationX = -Math.PI / 4;
    this.app.params.rotationY = 0;
    this.app.params.rotationZ = 0;

    // Set normal noise
    this.app.params.normalNoiseScaleX = 1.6;
    this.app.params.normalNoiseScaleY = 3.7;
    this.app.params.normalNoiseSpeed = 0.1;
    this.app.params.normalNoiseStrength = 0.2;
    this.app.params.normalNoiseShiftX = -0.05;
    this.app.params.normalNoiseShiftY = -0.05;
    this.app.params.normalNoiseShiftSpeed = 0.0;

    // Set color noise
    this.app.params.colorNoiseScale = 6.1;
    this.app.params.colorNoiseSpeed = 0.15;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.1;
    this.app.params.gradientShiftY = 0.2;
    this.app.params.gradientShiftSpeed = 0.08;

    // Set colors - lava theme
    this.app.params.gradientMode = 3; // Smooth step
    this.app.params.color1 = "#9f0000";
    this.app.params.color2 = "#ff3000";
    this.app.params.color3 = "#ff6633";
    this.app.params.color4 = "#ff9900";

    // Set lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.5;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.6;
    this.app.params.ambientIntensity = 0.4;
    this.app.params.rimLightIntensity = 0.7;

    // Set visualization
    this.app.params.backgroundColor = "#1A0000";
    this.app.params.showWireframe = false;

    // Set animation
    this.app.params.animationSpeed = 0.008;

    // Recreate plane and update all parameters
    this.app.recreatePlane();
    this.updateAllParams();
  }

  /**
   * Abstract Art preset
   */
  presetAbstractArt(): void {
    // Set plane dimensions
    this.app.params.planeWidth = 3.8;
    this.app.params.planeHeight = 3.2;
    this.app.params.planeSegments = 100;

    // Set rotation
    this.app.params.rotationX = -Math.PI / 2.854;
    this.app.params.rotationY = 0;
    this.app.params.rotationZ = 0;

    // Set normal noise
    this.app.params.normalNoiseScaleX = 1.7;
    this.app.params.normalNoiseScaleY = 3.5;
    this.app.params.normalNoiseSpeed = 0.08;
    this.app.params.normalNoiseStrength = 0.15;
    this.app.params.normalNoiseShiftX = 0.09;
    this.app.params.normalNoiseShiftY = 0.0;
    this.app.params.normalNoiseShiftSpeed = 0.0;

    // Set color noise
    this.app.params.colorNoiseScale = 4.9;
    this.app.params.colorNoiseSpeed = 0.08;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.4;
    this.app.params.gradientShiftY = 0.4;
    this.app.params.gradientShiftSpeed = 0.02;

    // Set colors - vibrant colors
    this.app.params.gradientMode = 3; // Smooth step function
    this.app.params.color1 = "#fffd82";
    this.app.params.color2 = "#e84855";
    this.app.params.color3 = "#2b3a67";
    this.app.params.color4 = "#20ffe8";

    // Set lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.8;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.91;
    this.app.params.ambientIntensity = 0.65;
    this.app.params.rimLightIntensity = 0.49;

    // Set visualization
    this.app.params.backgroundColor = "#000000";
    this.app.params.showWireframe = false;
    this.app.params.wireframeColor = "#ffffff";

    // Set Camera
    this.app.params.cameraDistance = 0.9;
    this.app.params.cameraFov = 30;
    // Set animation
    this.app.params.animationSpeed = 0.005;

    // Recreate plane and update all parameters
    this.app.recreatePlane();
    this.updateAllParams();
  }
}
