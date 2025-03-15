import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useRef, useEffect } from "preact/hooks";
import "./Panel.css";
import { FigmaInput } from "../FigmaInput";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type { SettingGroup } from "../../lib/settings/types";
import { appSignal } from "../../app";
import { Vector3 } from "three";

// Flag to track if we're processing camera changes from orbit controls
let processingOrbitChange = false;

interface CameraPanelProps {
  // No props needed for now
}

const CameraPanel: FunctionComponent<CameraPanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Animation frame ID for camera updates
  const animFrameRef = useRef<number | null>(null);

  // Debounce timer for camera updates (keeping for backward compatibility)
  const debounceTimerRef = useRef<number | null>(null);

  // Clean up animation frames on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  // Get the camera panel settings
  const cameraPanelConfigSignal = getPanelSettings("camera");
  const cameraPanelConfig = useComputed(() => cameraPanelConfigSignal.value);

  // If no settings are available, show a placeholder
  if (!cameraPanelConfig.value) {
    return <div className="noSettings">No camera settings available</div>;
  }

  // Find the camera settings groups
  const cameraSettingsGroup = cameraPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "cameraSettings"
  );
  const cameraPositionGroup = cameraPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "cameraPosition"
  );

  // Handle camera value change
  const handleCameraChange = (id: string, value: number) => {
    // If we're processing changes from OrbitControls, don't update to avoid loops
    if (processingOrbitChange) return;

    // Mark that we're manually changing camera params
    processingOrbitChange = true;

    // Update the setting value in the store
    updateSettingValue(id, value);

    // Update the app parameter
    if (app.value) {
      // Check if the parameter exists in the app.params object
      if (id in app.value.params) {
        // Use type assertion to safely update the parameter
        (app.value.params as any)[id] = value;
      }

      // Cancel any existing animation frame
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }

      // Use requestAnimationFrame for smoother updates
      animFrameRef.current = requestAnimationFrame(() => {
        if (app.value?.sceneManager) {
          const camera = app.value.camera;
          const controls = app.value.controls;

          if (camera && controls) {
            // Update FOV if changed
            if (id === "cameraFov" && camera.fov !== value) {
              camera.fov = value;
              camera.updateProjectionMatrix();
            }

            // Update camera position if changed
            if (id.startsWith("cameraPos")) {
              const axis = id.slice(-1).toLowerCase(); // Get X, Y, or Z
              const position = camera.position;
              const target = controls.target;

              // Update position and target based on axis
              switch (axis) {
                case "x":
                  position.x = value;
                  break;
                case "y":
                  position.y = value;
                  break;
                case "z":
                  position.z = value;
                  break;
              }

              controls.update();
            }

            // Update camera distance if changed
            if (id === "cameraDistance") {
              const currentDistance = camera.position.distanceTo(
                controls.target
              );
              if (Math.abs(currentDistance - value) > 0.01) {
                const direction = camera.position
                  .clone()
                  .sub(controls.target)
                  .normalize();
                camera.position
                  .copy(controls.target)
                  .add(direction.multiplyScalar(value));
                controls.update();
              }
            }
          }
        }

        // Reset the orbit change flag after processing
        processingOrbitChange = false;
        animFrameRef.current = null;
      });
    } else {
      // Reset the orbit change flag if there's no app
      processingOrbitChange = false;
    }
  };

  return (
    <div className="panel">
      {/* Camera Settings */}
      <div className="settingsGroup">
        <FigmaInput
          label="Distance"
          value={getSettingValue("cameraDistance") as number}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(value) => handleCameraChange("cameraDistance", value)}
        />
        <FigmaInput
          label="Field of View"
          value={getSettingValue("cameraFov") as number}
          min={10}
          max={100}
          step={1}
          onChange={(value) => handleCameraChange("cameraFov", value)}
        />
      </div>

      {/* Camera Position */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Position</h3>
        <FigmaInput
          label="X"
          value={getSettingValue("cameraPosX") as number}
          min={-5}
          max={5}
          step={0.1}
          onChange={(value) => handleCameraChange("cameraPosX", value)}
        />
        <FigmaInput
          label="Y"
          value={getSettingValue("cameraPosY") as number}
          min={-5}
          max={5}
          step={0.1}
          onChange={(value) => handleCameraChange("cameraPosY", value)}
        />
        <FigmaInput
          label="Z"
          value={getSettingValue("cameraPosZ") as number}
          min={-5}
          max={5}
          step={0.1}
          onChange={(value) => handleCameraChange("cameraPosZ", value)}
        />
      </div>
    </div>
  );
};

export default CameraPanel;
