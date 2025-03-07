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
    this.app.params.planeWidth = 2;
    this.app.params.planeHeight = 2;
    this.app.params.planeSegments = 128;

    // Reset rotation
    this.app.params.rotationX = -Math.PI / 4; // 45 degrees
    this.app.params.rotationY = 0;
    this.app.params.rotationZ = 0;

    // Reset camera settings
    this.app.params.cameraDistance = 2;
    this.app.params.cameraFov = 30;
    this.app.params.cameraPosX = 0;
    this.app.params.cameraPosY = 0;
    this.app.params.cameraPosZ = 2;
    this.app.params.cameraTargetX = 0;
    this.app.params.cameraTargetY = 0;
    this.app.params.cameraTargetZ = 0;

    // Reset normal noise
    this.app.params.normalNoiseScaleX = 3.0;
    this.app.params.normalNoiseScaleY = 3.0;
    this.app.params.normalNoiseSpeed = 0.2;
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
    this.app.params.color1 = "#ff0000";
    this.app.params.color2 = "#00ff00";
    this.app.params.color3 = "#0000ff";
    this.app.params.color4 = "#ffff00";

    // Reset lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.8;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.5;
    this.app.params.ambientIntensity = 0.5;
    this.app.params.rimLightIntensity = 0.3;

    // Reset visualization
    this.app.params.backgroundColor = "#191919";
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
    this.app.params.rotationX = -Math.PI / 4;
    this.app.params.rotationY = 0;
    this.app.params.rotationZ = 0;

    // Set normal noise
    this.app.params.normalNoiseScaleX = 1.5;
    this.app.params.normalNoiseScaleY = 1.5;
    this.app.params.normalNoiseSpeed = 0.25;
    this.app.params.normalNoiseStrength = 0.3;
    this.app.params.normalNoiseShiftX = 0.2;
    this.app.params.normalNoiseShiftY = 0.1;
    this.app.params.normalNoiseShiftSpeed = 0.1;

    // Set color noise
    this.app.params.colorNoiseScale = 1.2;
    this.app.params.colorNoiseSpeed = 0.15;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.3;
    this.app.params.gradientShiftY = 0.15;
    this.app.params.gradientShiftSpeed = 0.03;

    // Set colors - ocean blue theme
    this.app.params.gradientMode = 1; // Linear
    this.app.params.color1 = "#0a2463"; // Deep blue
    this.app.params.color2 = "#3e92cc"; // Medium blue
    this.app.params.color3 = "#fffaff"; // White foam
    this.app.params.color4 = "#1e1b18"; // Dark gray

    // Set lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.8;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.7;
    this.app.params.ambientIntensity = 0.3;
    this.app.params.rimLightIntensity = 0.5;

    // Set visualization
    this.app.params.backgroundColor = "#050a30";
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
    this.app.params.normalNoiseScaleX = 2.0;
    this.app.params.normalNoiseScaleY = 2.0;
    this.app.params.normalNoiseSpeed = 0.1;
    this.app.params.normalNoiseStrength = 0.2;
    this.app.params.normalNoiseShiftX = 0.0;
    this.app.params.normalNoiseShiftY = 0.0;
    this.app.params.normalNoiseShiftSpeed = 0.05;

    // Set color noise
    this.app.params.colorNoiseScale = 2.5;
    this.app.params.colorNoiseSpeed = 0.2;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.1;
    this.app.params.gradientShiftY = 0.2;
    this.app.params.gradientShiftSpeed = 0.08;

    // Set colors - lava theme
    this.app.params.gradientMode = 0; // B-spline
    this.app.params.color1 = "#ff4000"; // Bright orange
    this.app.params.color2 = "#ff0000"; // Red
    this.app.params.color3 = "#ffff00"; // Yellow
    this.app.params.color4 = "#400000"; // Dark red

    // Set lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.8;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.6;
    this.app.params.ambientIntensity = 0.4;
    this.app.params.rimLightIntensity = 0.7;

    // Set visualization
    this.app.params.backgroundColor = "#220000";
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
    this.app.params.planeWidth = 2.0;
    this.app.params.planeHeight = 2.0;
    this.app.params.planeSegments = 100;

    // Set rotation
    this.app.params.rotationX = -Math.PI / 3;
    this.app.params.rotationY = 0.2;
    this.app.params.rotationZ = 0.1;

    // Set normal noise
    this.app.params.normalNoiseScaleX = 5.0;
    this.app.params.normalNoiseScaleY = 5.0;
    this.app.params.normalNoiseSpeed = 0.05;
    this.app.params.normalNoiseStrength = 0.1;
    this.app.params.normalNoiseShiftX = 0.3;
    this.app.params.normalNoiseShiftY = 0.3;
    this.app.params.normalNoiseShiftSpeed = 0.1;

    // Set color noise
    this.app.params.colorNoiseScale = 3.0;
    this.app.params.colorNoiseSpeed = 0.1;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.4;
    this.app.params.gradientShiftY = 0.4;
    this.app.params.gradientShiftSpeed = 0.02;

    // Set colors - vibrant colors
    this.app.params.gradientMode = 4; // Direct mapping
    this.app.params.color1 = "#9c4aff"; // Purple
    this.app.params.color2 = "#00ff99"; // Mint
    this.app.params.color3 = "#ff6b6b"; // Coral
    this.app.params.color4 = "#ffdd59"; // Yellow

    // Set lighting
    this.app.params.lightDirX = 0.5;
    this.app.params.lightDirY = 0.5;
    this.app.params.lightDirZ = 1.0;
    this.app.params.diffuseIntensity = 0.4;
    this.app.params.ambientIntensity = 0.6;
    this.app.params.rimLightIntensity = 0.2;

    // Set visualization
    this.app.params.backgroundColor = "#1a1a2e";
    this.app.params.showWireframe = true;
    this.app.params.wireframeColor = "#ffffff";

    // Set animation
    this.app.params.animationSpeed = 0.005;

    // Recreate plane and update all parameters
    this.app.recreatePlane();
    this.updateAllParams();
  }
}
