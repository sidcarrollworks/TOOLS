import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useRef } from "preact/hooks";
import "./Panel.css";
import { Button } from "../UI/Button";
import { Checkbox } from "../UI/Checkbox";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type { SettingGroup } from "../../lib/settings/types";
import { appSignal } from "../../app";

interface SavePanelProps {
  // No props needed for now
}

const SavePanel: FunctionComponent<SavePanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Debounce timer for updates
  const debounceTimerRef = useRef<number | null>(null);

  // Get the save panel settings
  const savePanelConfigSignal = getPanelSettings("save");
  const savePanelConfig = useComputed(() => savePanelConfigSignal.value);

  // If no settings are available, show a placeholder
  if (!savePanelConfig.value) {
    return <div className="noSettings">No save settings available</div>;
  }

  // Find the save options group
  const saveOptionsGroup = savePanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "saveOptions"
  );

  // Handle transparent background toggle
  const handleTransparentBgChange = (checked: boolean) => {
    // Update the setting value in the store
    updateSettingValue("transparentBackground", checked);

    // Update the app parameter
    if (app.value) {
      app.value.params.exportTransparentBg = checked;

      // Clear any existing timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Debounce updates to avoid too many updates
      debounceTimerRef.current = window.setTimeout(() => {
        if (app.value) {
          app.value.updateParams(false); // Update without camera reset
        }
        debounceTimerRef.current = null;
      }, 50);
    }
  };

  // Handle high quality toggle
  const handleHighQualityChange = (checked: boolean) => {
    // Update the setting value in the store
    updateSettingValue("highQuality", checked);

    // Update the app parameter
    if (app.value) {
      app.value.params.exportHighQuality = checked;
      // No need to call updateParams for this setting as it only affects export time
    }
  };

  // Handle save image button click
  const handleSaveImage = () => {
    if (!app.value) return;

    try {
      // Original geometry segment counts to restore after export
      let originalSettings: {
        planeSegments?: number;
        sphereWidthSegments?: number;
        sphereHeightSegments?: number;
        cubeWidthSegments?: number;
        cubeHeightSegments?: number;
        cubeDepthSegments?: number;
      } | null = null;

      // If high quality export is enabled, use high resolution
      if (app.value.params.exportHighQuality) {
        console.log("Using high quality export");

        // Store original settings and apply high quality settings based on geometry type
        originalSettings = {};

        // Apply high quality settings based on geometry type
        switch (app.value.params.geometryType) {
          case "sphere":
            // Store original sphere segment counts
            originalSettings.sphereWidthSegments =
              app.value.params.sphereWidthSegments;
            originalSettings.sphereHeightSegments =
              app.value.params.sphereHeightSegments;

            // Increase sphere segment counts for export (at least double or go to 128)
            app.value.params.sphereWidthSegments = Math.max(
              originalSettings.sphereWidthSegments * 2,
              128
            );
            app.value.params.sphereHeightSegments = Math.max(
              originalSettings.sphereHeightSegments * 2,
              128
            );
            break;

          case "cube":
            // Store original cube segment counts
            originalSettings.cubeWidthSegments =
              app.value.params.cubeWidthSegments;
            originalSettings.cubeHeightSegments =
              app.value.params.cubeHeightSegments;
            originalSettings.cubeDepthSegments =
              app.value.params.cubeDepthSegments;

            // Increase cube segment counts for export (at least double or go to 16)
            app.value.params.cubeWidthSegments = Math.max(
              originalSettings.cubeWidthSegments * 2,
              16
            );
            app.value.params.cubeHeightSegments = Math.max(
              originalSettings.cubeHeightSegments * 2,
              16
            );
            app.value.params.cubeDepthSegments = Math.max(
              originalSettings.cubeDepthSegments * 2,
              16
            );
            break;

          case "plane":
          default:
            // Store original plane segment count
            originalSettings.planeSegments = app.value.params.planeSegments;

            // Increase plane segment count for export (at least double or go to 256)
            app.value.params.planeSegments = Math.max(
              originalSettings.planeSegments * 2,
              256
            );
            break;
        }

        // Recreate geometry with higher segment counts
        app.value.recreateGeometry();

        // Run an update to ensure new geometry is fully rendered
        app.value.updateParams(false);

        // Give a small delay to ensure high quality rendering is ready before saving
        setTimeout(() => {
          if (app.value) {
            // Actually save the image once high quality rendering is ready
            app.value.saveAsImage();

            // Restore original settings after a delay
            setTimeout(() => {
              if (app.value && originalSettings) {
                // Restore original settings based on geometry type
                switch (app.value.params.geometryType) {
                  case "sphere":
                    app.value.params.sphereWidthSegments =
                      originalSettings.sphereWidthSegments as number;
                    app.value.params.sphereHeightSegments =
                      originalSettings.sphereHeightSegments as number;
                    break;

                  case "cube":
                    app.value.params.cubeWidthSegments =
                      originalSettings.cubeWidthSegments as number;
                    app.value.params.cubeHeightSegments =
                      originalSettings.cubeHeightSegments as number;
                    app.value.params.cubeDepthSegments =
                      originalSettings.cubeDepthSegments as number;
                    break;

                  case "plane":
                  default:
                    app.value.params.planeSegments =
                      originalSettings.planeSegments as number;
                    break;
                }

                // Recreate geometry with original settings
                app.value.recreateGeometry();
                app.value.updateParams(false);

                console.log("Restored original quality settings");
              }
            }, 100);
          }
        }, 100);
      } else {
        // Just save without high quality
        app.value.saveAsImage();
      }
    } catch (error) {
      console.error("Error saving image:", error);
    }
  };

  return (
    <div className="panel">
      <div className="settingsGroup">
        <Checkbox
          label="Transparent Background"
          checked={
            app.value?.params.exportTransparentBg ??
            (getSettingValue("transparentBackground") as boolean) ??
            false
          }
          onChange={handleTransparentBgChange}
        />

        <Checkbox
          label="High Quality"
          checked={
            app.value?.params.exportHighQuality ??
            (getSettingValue("highQuality") as boolean) ??
            true
          }
          onChange={handleHighQualityChange}
        />

        <Button
          variant="primary"
          onClick={handleSaveImage}
          style={{
            width: "100%",
            height: "24px",
            fontSize: "12px",
            opacity: app.value ? 1 : 0.5,
            cursor: app.value ? "pointer" : "not-allowed",
          }}
        >
          Save Image
        </Button>
      </div>
    </div>
  );
};

export default SavePanel;
