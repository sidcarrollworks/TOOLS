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
import { facadeSignal } from "../../app";

// Flag to track if we're processing camera changes from orbit controls
let processingOrbitChange = false;

interface CameraPanelProps {
  // No props needed for now
}

export const CameraPanel: FunctionComponent<CameraPanelProps> = () => {
  // Use facadeSignal instead of useFacade
  const facade = useComputed(() => facadeSignal.value);

  // Animation frame ID for camera updates
  const animFrameRef = useRef<number | null>(null);

  // Clean up animation frames on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  // Handle camera parameter changes
  const handleCameraChange = (id: string, value: number) => {
    // Skip if we're processing changes from orbit controls
    if (processingOrbitChange) return;

    // Update the setting value in the store
    updateSettingValue(id, value);

    // Camera requires special handling beyond normal parameter updates
    if (facade.value && facade.value.isInitialized()) {
      // Cancel any existing animation frame
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // Use requestAnimationFrame for smoother updates
      animFrameRef.current = requestAnimationFrame(() => {
        if (facade.value && facade.value.isInitialized()) {
          // Use the facade's updateParam method for camera parameters
          facade.value.updateParam(id as any, value);
        }
      });
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
