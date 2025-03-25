import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import * as THREE from "three";

import { Button } from "../UI/Button";
import { Checkbox } from "../UI/Checkbox";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import Select from "../UI/Select";
import { facadeSignal } from "../../app";

// Image format options
const FORMAT_OPTIONS = [
  { label: "PNG", value: "png" },
  { label: "JPG", value: "jpg" },
  { label: "WebP", value: "webp" },
];

// Format types
type ImageFormat = "png" | "jpg" | "webp";

interface SavePanelProps {
  // No props needed
}

const SavePanel: FunctionComponent<SavePanelProps> = () => {
  // State for UI controls
  const [transparentBg, setTransparentBg] = useState(false);
  const [highQuality, setHighQuality] = useState(true);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("png");
  const [isExporting, setIsExporting] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Get canvas dimensions on component mount
  useEffect(() => {
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      try {
        // Get the app instance
        const app = (facade as any).app;
        if (app && app.renderer) {
          const canvas = app.renderer.domElement;
          setCanvasDimensions({
            width: canvas.width,
            height: canvas.height,
          });
        }
      } catch (error) {
        console.warn("SavePanel: Failed to get canvas dimensions:", error);
      }
    }
  }, []);

  // Handle checkbox changes
  const handleTransparentBgChange = (checked: boolean) => {
    setTransparentBg(checked);

    // Update app parameter directly
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      try {
        const app = (facade as any).app;
        if (app) {
          // Update the parameter
          app.params.exportTransparentBg = checked;

          // Apply background change immediately
          if (app.renderer) {
            if (checked) {
              // Set transparent background
              app.renderer.setClearColor(0x000000, 0);

              // Apply checkered background to the canvas element for visual feedback
              const canvas = app.renderer.domElement;
              canvas.style.backgroundColor = "#191919";
              canvas.style.backgroundImage = `
                linear-gradient(45deg, #222222 25%, transparent 25%), 
                linear-gradient(-45deg, #222222 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #222222 75%),
                linear-gradient(-45deg, transparent 75%, #222222 75%)
              `;
              canvas.style.backgroundSize = "20px 20px";
              canvas.style.backgroundPosition =
                "0 0, 0 10px, 10px -10px, -10px 0px";
            } else {
              // Set solid background color
              const bgColor = new THREE.Color(app.params.backgroundColor);
              app.renderer.setClearColor(bgColor);

              // Remove checkered background
              const canvas = app.renderer.domElement;
              canvas.style.backgroundColor = "";
              canvas.style.backgroundImage = "";
              canvas.style.backgroundSize = "";
              canvas.style.backgroundPosition = "";
            }

            // Force a render to update the scene immediately
            if (app.scene && app.camera) {
              app.renderer.render(app.scene, app.camera);
            }
          }
        }
      } catch (error) {
        console.warn("Error updating transparent background:", error);
      }
    }
  };

  const handleHighQualityChange = (checked: boolean) => {
    setHighQuality(checked);

    // Update app parameter directly
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      try {
        const app = (facade as any).app;
        if (app) {
          app.params.exportHighQuality = checked;
        }
      } catch (error) {
        console.warn("Error updating high quality setting:", error);
      }
    }
  };

  // Handle format change
  const handleFormatChange = (value: string) => {
    setImageFormat(value as ImageFormat);
  };

  // Basic direct save image function
  const saveImage = async () => {
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) {
      console.error("Cannot save: Application not ready");
      return;
    }

    try {
      setIsExporting(true);

      // Get the app instance directly
      const app = (facade as any).app;
      if (!app || !app.renderer) {
        throw new Error("Renderer not available");
      }

      // IMPORTANT: Store ALL animation-related values
      const originalTimeValue = app.time;
      const originalPauseState = app.params.pauseAnimation;
      const originalAnimationSpeed = app.params.animationSpeed;

      // Completely stop animation by setting speed to 0 and pausing
      app.params.animationSpeed = 0;
      app.params.pauseAnimation = true;

      // Force time value to be exactly what it was before
      app.time = originalTimeValue;
      app.uniforms.uTime.value = originalTimeValue;

      // Store original renderer settings
      const originalColor = app.renderer.getClearColor(new THREE.Color());
      const originalAlpha = app.renderer.getClearAlpha();

      // CRITICAL FIX: Check if preserveDrawingBuffer is enabled
      const hasPreserveDrawingBuffer = app.renderer
        .getContext()
        .getContextAttributes().preserveDrawingBuffer;

      // For transparent background with no preserveDrawingBuffer, we need to work around it
      const needsTransparencyWorkaround =
        transparentBg && !hasPreserveDrawingBuffer;

      if (needsTransparencyWorkaround) {
        console.log(
          "Using transparency workaround due to missing preserveDrawingBuffer"
        );
      }

      // Apply transparent background if needed
      if (transparentBg) {
        app.renderer.setClearColor(0x000000, 0); // Black with 0 opacity
      } else {
        const bgColor = new THREE.Color(app.params.backgroundColor);
        app.renderer.setClearColor(bgColor);
      }

      // Store original geometry settings
      const originalSettings: any = {};

      // Apply high quality settings if needed
      if (highQuality) {
        // Store and update geometry settings based on type
        switch (app.params.geometryType) {
          case "plane":
            originalSettings.planeSegments = app.params.planeSegments;
            app.params.planeSegments = Math.max(
              originalSettings.planeSegments * 2,
              256
            );
            break;

          case "sphere":
            originalSettings.sphereWidthSegments =
              app.params.sphereWidthSegments;
            originalSettings.sphereHeightSegments =
              app.params.sphereHeightSegments;
            app.params.sphereWidthSegments = Math.max(
              originalSettings.sphereWidthSegments * 2,
              128
            );
            app.params.sphereHeightSegments = Math.max(
              originalSettings.sphereHeightSegments * 2,
              128
            );
            break;

          case "cube":
            originalSettings.cubeWidthSegments = app.params.cubeWidthSegments;
            originalSettings.cubeHeightSegments = app.params.cubeHeightSegments;
            originalSettings.cubeDepthSegments = app.params.cubeDepthSegments;
            app.params.cubeWidthSegments = Math.max(
              originalSettings.cubeWidthSegments * 2,
              16
            );
            app.params.cubeHeightSegments = Math.max(
              originalSettings.cubeHeightSegments * 2,
              16
            );
            app.params.cubeDepthSegments = Math.max(
              originalSettings.cubeDepthSegments * 2,
              16
            );
            break;
        }

        // Recreate geometry with higher quality
        app.recreateGeometry();
      }

      // Force a render frame with our frozen time
      app.renderer.render(app.scene, app.camera);

      // Get the canvas and export as image
      const canvas = app.renderer.domElement;
      const mimeType =
        imageFormat === "jpg"
          ? "image/jpeg"
          : imageFormat === "webp"
          ? "image/webp"
          : "image/png";

      // Important: JPEG format doesn't support transparency, so warn if needed
      if (transparentBg && imageFormat === "jpg") {
        console.warn(
          "JPEG format doesn't support transparency. Using PNG instead."
        );
        const pngDataUrl = canvas.toDataURL("image/png");

        // Trigger download with PNG instead
        const link = document.createElement("a");
        link.href = pngDataUrl;
        link.download = `gradient-shader.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (needsTransparencyWorkaround) {
        // Apply workaround for transparency when preserveDrawingBuffer is not enabled

        // 1. Create a new canvas with the same dimensions
        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        const ctx = offscreenCanvas.getContext("2d");

        if (!ctx) {
          throw new Error(
            "Failed to create canvas context for transparency workaround"
          );
        }

        // 2. Draw the WebGL canvas to our new canvas, preserving transparency
        ctx.drawImage(canvas, 0, 0);

        // 3. Get the data URL from our offscreen canvas
        const dataUrl = offscreenCanvas.toDataURL(
          mimeType === "image/jpeg" ? "image/png" : mimeType
        );

        // 4. Trigger download
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `gradient-shader.${
          mimeType === "image/jpeg" ? "png" : imageFormat
        }`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For PNG and WebP which support transparency and no workaround needed
        const quality = imageFormat === "jpg" ? 0.95 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Trigger download
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `gradient-shader.${imageFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // CRITICAL: Reset everything in proper order:

      // 1. First restore renderer settings
      app.renderer.setClearColor(originalColor, originalAlpha);

      // 2. Restore original geometry if we changed it
      if (highQuality) {
        // Restore geometry settings based on type
        switch (app.params.geometryType) {
          case "plane":
            app.params.planeSegments = originalSettings.planeSegments;
            break;

          case "sphere":
            app.params.sphereWidthSegments =
              originalSettings.sphereWidthSegments;
            app.params.sphereHeightSegments =
              originalSettings.sphereHeightSegments;
            break;

          case "cube":
            app.params.cubeWidthSegments = originalSettings.cubeWidthSegments;
            app.params.cubeHeightSegments = originalSettings.cubeHeightSegments;
            app.params.cubeDepthSegments = originalSettings.cubeDepthSegments;
            break;
        }

        // Recreate geometry with original settings
        app.recreateGeometry();
      }

      // 3. Reset time and animation values to exactly what they were
      app.time = originalTimeValue;
      app.uniforms.uTime.value = originalTimeValue;
      app.params.animationSpeed = originalAnimationSpeed;
      app.params.pauseAnimation = originalPauseState;

      // 4. Force one more render to ensure everything is correct
      // Use direct renderer call instead of animate which might advance time
      app.renderer.render(app.scene, app.camera);

      console.log("Export complete - Time reset to: ", originalTimeValue);
    } catch (error) {
      console.error("Error saving image:", error);
      alert(
        "Failed to save image: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <SettingsGroup collapsible={false} header={false}>
        <SettingsField label="Format">
          <Select.Root value={imageFormat} onValueChange={handleFormatChange}>
            <Select.Trigger>
              {FORMAT_OPTIONS.find((opt) => opt.value === imageFormat)?.label ||
                "PNG"}
            </Select.Trigger>
            <Select.Content>
              {FORMAT_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </SettingsField>

        <SettingsField label="Transparent Background">
          <Checkbox
            checked={transparentBg}
            onChange={handleTransparentBgChange}
          />
        </SettingsField>

        <SettingsField label="High Quality">
          <Checkbox checked={highQuality} onChange={handleHighQualityChange} />
        </SettingsField>
      </SettingsGroup>
      <SettingsGroup collapsible={false} header={false}>
        {canvasDimensions.width > 0 && (
          <SettingsField label="Dimensions">
            <div style={{ fontSize: "12px" }}>
              {canvasDimensions.width} × {canvasDimensions.height}px
            </div>
          </SettingsField>
        )}
        <Button
          onClick={saveImage}
          variant="primary"
          size="small"
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Save Image"}
        </Button>
      </SettingsGroup>
    </>
  );
};

export default SavePanel;
