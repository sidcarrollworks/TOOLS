/**
 * PresetManager - Manages preset configurations for the shader app
 */
import { ShaderApp } from "../ShaderApp";
import type { ColorStop } from "../types/ColorStop";

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

    if (updateGUI && "updateGUI" in this.app) {
      (this.app as any).updateGUI();
    }
  }

  /**
   * Helper to create color stops array from individual colors
   * @deprecated Use direct ColorStop arrays instead
   */
  public createColorStops(
    color1: string,
    color2: string,
    color3: string,
    color4: string
  ): ColorStop[] {
    return [
      { position: 0.0, color: color1 },
      { position: 0.33, color: color2 },
      { position: 0.66, color: color3 },
      { position: 1.0, color: color4 },
    ];
  }

  /**
   * Source Milk preset
   */
  presetDefault(): void {
    // Reset plane dimensions
    this.app.params.planeWidth = 3.8;
    this.app.params.planeHeight = 3.2;
    this.app.params.planeSegments = 128;

    // Reset rotation
    this.app.params.rotateX = -1.1;
    this.app.params.rotateY = 0;
    this.app.params.rotateZ = 0;

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

    // Reset grain effect
    this.app.params.enableGrain = false;
    this.app.params.grainIntensity = 0.1;
    this.app.params.grainScale = 1.0;
    this.app.params.grainSpeed = 0.1;

    // Reset gradient shift
    this.app.params.gradientShiftX = 0.2;
    this.app.params.gradientShiftY = 0.1;
    this.app.params.gradientShiftSpeed = 0.05;

    // Reset colors
    this.app.params.gradientMode = 0; // B-spline

    // Set default colors (all white)
    this.app.params.colorStops = [
      { position: 0.0, color: "#ffffff" },
      { position: 0.33, color: "#ffffff" },
      { position: 0.66, color: "#ffffff" },
      { position: 1.0, color: "#ffffff" },
    ];

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

    // Reset animation
    this.app.params.animationSpeed = 0.01;
    this.app.params.pauseAnimation = false;

    // Reset export options are now handled through the ExportInitializer

    // Recreate geometry and update all parameters
    this.app.recreateGeometry();
    this.updateAllParams();

    // Setting the background to non-transparent since it has been removed from params
    if (this.app.sceneManager) {
      this.app.sceneManager.setBackgroundTransparency(false);
    }
  }

  /**
   * Ocean Waves preset
   */
  presetOceanWaves(): void {
    // Set plane dimensions - larger plane with more segments for detailed waves
    this.app.params.planeWidth = 4;
    this.app.params.planeHeight = 4;
    this.app.params.planeSegments = 208;

    // Set rotation - slightly tilted for better wave visibility
    this.app.params.rotateX = -Math.PI / 3.5;
    this.app.params.rotateY = Math.PI / 24;
    this.app.params.rotateZ = 0;

    // Camera settings for better ocean view
    this.app.params.cameraDistance = 1.2;
    this.app.params.cameraFov = 35;
    this.app.params.cameraPosX = 0.2;
    this.app.params.cameraPosY = 0.1;
    this.app.params.cameraPosZ = 2.2;
    this.app.params.cameraTargetX = 0;
    this.app.params.cameraTargetY = -0.2;
    this.app.params.cameraTargetZ = 0;

    // Set normal noise - create more realistic wave patterns
    this.app.params.normalNoiseScaleX = 4.0;
    this.app.params.normalNoiseScaleY = 2.4;
    this.app.params.normalNoiseSpeed = 0.12;
    this.app.params.normalNoiseStrength = 0.15;
    this.app.params.normalNoiseShiftX = 0.33;
    this.app.params.normalNoiseShiftY = 0.2;
    this.app.params.normalNoiseShiftSpeed = 0.37;

    // Set color noise - create foam and depth variations
    this.app.params.colorNoiseScale = 5.0;
    this.app.params.colorNoiseSpeed = 0.04;

    // Set grain effect - subtle water surface texture
    this.app.params.enableGrain = false;
    this.app.params.grainIntensity = 0.05;
    this.app.params.grainScale = 3.0;
    this.app.params.grainSpeed = 0.2;

    // Set gradient shift - more dynamic color transitions
    this.app.params.gradientShiftX = -0.36;
    this.app.params.gradientShiftY = 0.3;
    this.app.params.gradientShiftSpeed = 0.03;

    // Set colors - enhanced oceanic palette with deeper blues and foam highlights
    this.app.params.gradientMode = 1; // Linear interpolation

    // Set ocean colors
    this.app.params.colorStops = [
      { position: 0.0, color: "#003b75" }, // Deep ocean blue
      { position: 0.33, color: "#0066aa" },
      { position: 0.66, color: "#00bbee" }, // Surface blue
      { position: 1.0, color: "#aaeeff" }, // Foam/highlights
    ];

    // Set lighting - improved to create realistic water reflections
    this.app.params.lightDirX = 0.6;
    this.app.params.lightDirY = 0.9;
    this.app.params.lightDirZ = 0.8;
    this.app.params.diffuseIntensity = 0.8;
    this.app.params.ambientIntensity = 0.25;
    this.app.params.rimLightIntensity = 0.7;

    // Set visualization
    this.app.params.backgroundColor = "#00163d"; // Deeper sky blue
    this.app.params.showWireframe = true;

    // Set animation - slightly faster for more dynamic waves
    this.app.params.animationSpeed = 0.009;
    this.app.params.pauseAnimation = false;

    // Recreate geometry and update all parameters
    this.app.recreateGeometry();
    this.updateAllParams();

    // Setting the background to non-transparent since it has been removed from params
    if (this.app.sceneManager) {
      this.app.sceneManager.setBackgroundTransparency(false);
    }
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
    this.app.params.rotateX = -Math.PI / 4; // 45 degrees
    this.app.params.rotateY = 0;
    this.app.params.rotateZ = 0;

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
    this.app.params.colorNoiseSpeed = 0.09;

    // Set grain effect - lava texture
    this.app.params.enableGrain = false;
    this.app.params.grainIntensity = 0.15;
    this.app.params.grainScale = 2.0;
    this.app.params.grainSpeed = 0.05;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.1;
    this.app.params.gradientShiftY = 0.2;
    this.app.params.gradientShiftSpeed = 0.08;

    // Set colors - lava theme
    this.app.params.gradientMode = 3; // Smooth step

    // Set lava colors
    this.app.params.colorStops = [
      { position: 0.0, color: "#9f0000" }, // Deep lava
      { position: 0.33, color: "#ff3000" },
      { position: 0.66, color: "#ff6633" },
      { position: 1.0, color: "#ff9900" }, // Hot spots
    ];

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
    this.app.params.pauseAnimation = false;

    // Recreate geometry and update all parameters
    this.app.recreateGeometry();
    this.updateAllParams();

    // Setting the background to non-transparent since it has been removed from params
    if (this.app.sceneManager) {
      this.app.sceneManager.setBackgroundTransparency(false);
    }
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
    this.app.params.rotateX = -Math.PI / 2.854;
    this.app.params.rotateY = 0;
    this.app.params.rotateZ = 0;

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

    // Set grain effect - artistic grain
    this.app.params.enableGrain = false;
    this.app.params.grainIntensity = 0.2;
    this.app.params.grainScale = 4.0;
    this.app.params.grainSpeed = 0.1;

    // Set gradient shift
    this.app.params.gradientShiftX = 0.4;
    this.app.params.gradientShiftY = 0.4;
    this.app.params.gradientShiftSpeed = 0.02;

    // Set colors - vibrant colors
    this.app.params.gradientMode = 3; // Smooth step function

    // Set abstract art colors
    this.app.params.colorStops = [
      { position: 0.0, color: "#fdfdf7" }, // Off-white
      { position: 0.33, color: "#e84855" }, // Vibrant red
      { position: 0.66, color: "#2b3a67" }, // Deep blue
      { position: 1.0, color: "#20ffe8" }, // Cyan
    ];

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

    // Set Camera
    this.app.params.cameraDistance = 0.9;
    this.app.params.cameraFov = 30;

    // Set animation
    this.app.params.animationSpeed = 0.005;
    this.app.params.pauseAnimation = false;

    // Recreate geometry and update all parameters
    this.app.recreateGeometry();
    this.updateAllParams();

    // Setting the background to non-transparent since it has been removed from params
    if (this.app.sceneManager) {
      this.app.sceneManager.setBackgroundTransparency(false);
    }
  }
}
