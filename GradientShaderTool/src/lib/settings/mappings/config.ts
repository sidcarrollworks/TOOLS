/**
 * Mapping configuration between UI settings and shader parameters
 */
import type { MappingConfig } from "./types";

/**
 * The complete mapping configuration for all settings to shader parameters
 */
export const parameterMappings: MappingConfig = {
  panels: {
    // Presets panel - mapping preset buttons to functions
    presets: {
      panelId: "presets",
      mappings: [
        { settingId: "presetDefault", paramName: "Default" },
        { settingId: "presetOceanWaves", paramName: "Ocean Waves" },
        { settingId: "presetLavaFlow", paramName: "Lava Flow" },
        { settingId: "presetAbstractArt", paramName: "Abstract Art" },
      ],
    },

    // Colors panel mappings
    colors: {
      panelId: "colors",
      mappings: [
        { settingId: "gradientMode", paramName: "gradientMode" },
        { settingId: "color1", paramName: "color1" },
        { settingId: "color2", paramName: "color2" },
        { settingId: "color3", paramName: "color3" },
        { settingId: "color4", paramName: "color4" },
        { settingId: "colorNoiseScale", paramName: "colorNoiseScale" },
        { settingId: "colorNoiseSpeed", paramName: "colorNoiseSpeed" },
        { settingId: "gradientShiftX", paramName: "gradientShiftX" },
        { settingId: "gradientShiftY", paramName: "gradientShiftY" },
        { settingId: "gradientShiftSpeed", paramName: "gradientShiftSpeed" },
        // Background is handled in export settings
        {
          settingId: "transparentBackground",
          paramName: "exportTransparentBg",
        },
        { settingId: "backgroundColor", paramName: "backgroundColor" },
      ],
    },

    // Lighting panel mappings
    lighting: {
      panelId: "lighting",
      mappings: [
        { settingId: "lightDirX", paramName: "lightDirX" },
        { settingId: "lightDirY", paramName: "lightDirY" },
        { settingId: "lightDirZ", paramName: "lightDirZ" },
        { settingId: "diffuseIntensity", paramName: "diffuseIntensity" },
        { settingId: "ambientIntensity", paramName: "ambientIntensity" },
        { settingId: "rimLightIntensity", paramName: "rimLightIntensity" },
      ],
    },

    // Geometry panel mappings
    geometry: {
      panelId: "geometry",
      mappings: [
        { settingId: "geometryType", paramName: "geometryType" },
        { settingId: "planeWidth", paramName: "planeWidth" },
        { settingId: "planeHeight", paramName: "planeHeight" },
        { settingId: "planeSegments", paramName: "planeSegments" },
        { settingId: "sphereRadius", paramName: "sphereRadius" },
        { settingId: "sphereWidthSegments", paramName: "sphereWidthSegments" },
        {
          settingId: "sphereHeightSegments",
          paramName: "sphereHeightSegments",
        },
        { settingId: "cubeSize", paramName: "cubeSize" },
        { settingId: "cubeWidthSegments", paramName: "cubeWidthSegments" },
        { settingId: "cubeHeightSegments", paramName: "cubeHeightSegments" },
        { settingId: "cubeDepthSegments", paramName: "cubeDepthSegments" },
        { settingId: "rotationX", paramName: "rotationX" },
        { settingId: "rotationY", paramName: "rotationY" },
        { settingId: "rotationZ", paramName: "rotationZ" },
        { settingId: "showWireframe", paramName: "showWireframe" },
        { settingId: "wireframeColor", paramName: "wireframeColor" },
        { settingId: "flatShading", paramName: "flatShading" },
      ],
    },

    // Distortion panel mappings
    distortion: {
      panelId: "distortion",
      mappings: [
        { settingId: "normalNoiseScaleX", paramName: "normalNoiseScaleX" },
        { settingId: "normalNoiseScaleY", paramName: "normalNoiseScaleY" },
        { settingId: "normalNoiseSpeed", paramName: "normalNoiseSpeed" },
        { settingId: "normalNoiseStrength", paramName: "normalNoiseStrength" },
        { settingId: "normalNoiseShiftX", paramName: "normalNoiseShiftX" },
        { settingId: "normalNoiseShiftY", paramName: "normalNoiseShiftY" },
        {
          settingId: "normalNoiseShiftSpeed",
          paramName: "normalNoiseShiftSpeed",
        },
      ],
    },

    // Camera panel mappings
    camera: {
      panelId: "camera",
      mappings: [
        { settingId: "cameraDistance", paramName: "cameraDistance" },
        { settingId: "cameraFov", paramName: "cameraFov" },
        { settingId: "cameraPosX", paramName: "cameraPosX" },
        { settingId: "cameraPosY", paramName: "cameraPosY" },
        { settingId: "cameraPosZ", paramName: "cameraPosZ" },
        { settingId: "cameraTargetX", paramName: "cameraTargetX" },
        { settingId: "cameraTargetY", paramName: "cameraTargetY" },
        { settingId: "cameraTargetZ", paramName: "cameraTargetZ" },
      ],
    },

    // Animation panel mappings
    animation: {
      panelId: "animation",
      mappings: [
        { settingId: "animationSpeed", paramName: "animationSpeed" },
        { settingId: "pauseAnimation", paramName: "pauseAnimation" },
      ],
    },

    // Export panel mappings
    export: {
      panelId: "export",
      mappings: [
        { settingId: "exportTransparentBg", paramName: "exportTransparentBg" },
        { settingId: "exportHighQuality", paramName: "exportHighQuality" },
      ],
    },
  },
};
