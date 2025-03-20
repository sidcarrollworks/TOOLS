import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useRef, useEffect, useState } from "preact/hooks";
import { FigmaInput } from "../FigmaInput";
import { facadeSignal } from "../../app";
import { getCameraStore } from "../../lib/stores/CameraStore";
import { getUIStore } from "../../lib/stores/UIStore";
import { Button } from "../UI/Button";
import { SettingsGroup } from "../UI/SettingsGroup";
import { SettingsField } from "../UI/SettingsGroup/SettingsGroup";

interface CameraPanelProps {
  // No props needed for now
}

export const CameraPanel: FunctionComponent<CameraPanelProps> = () => {
  // Use the camera store
  const cameraStore = getCameraStore();
  const uiStore = getUIStore();

  // Local state for camera values
  const [position, setPosition] = useState({ x: 0, y: 0, z: 5 });
  const [target, setTarget] = useState({ x: 0, y: 0, z: 0 });
  const [fov, setFov] = useState(75);

  // Sync local state with store
  useEffect(() => {
    // Initial sync
    setPosition(cameraStore.get("position"));
    setTarget(cameraStore.get("target"));

    // Get FOV from facade
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      const currentFov = facade.getParam("cameraFov");
      setFov(currentFov);
    }

    // Set up interval to poll camera position from store
    // This is needed because three.js orbit controls update position directly
    const intervalId = setInterval(() => {
      setPosition(cameraStore.get("position"));
      setTarget(cameraStore.get("target"));

      // Sync FOV
      if (facade && facade.isInitialized()) {
        const currentFov = facade.getParam("cameraFov");
        setFov(currentFov);
      }
    }, 500); // Update every 500ms

    return () => clearInterval(intervalId);
  }, []);

  // Handle position changes from UI
  const handlePositionChange = (axis: "x" | "y" | "z", value: number) => {
    // Update local state for immediate feedback
    setPosition((prev) => ({
      ...prev,
      [axis]: value,
    }));

    // Update the store (which updates the facade)
    cameraStore.setPositionAxis(axis, value);
  };

  // Handle target changes from UI
  const handleTargetChange = (axis: "x" | "y" | "z", value: number) => {
    // Update local state for immediate feedback
    setTarget((prev) => ({
      ...prev,
      [axis]: value,
    }));

    // Update the store (which updates the facade)
    cameraStore.setTargetAxis(axis, value);
  };

  // Handle FOV change
  const handleFovChange = (value: number) => {
    setFov(value);

    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      facade.updateParam("cameraFov", value, { resetCamera: true });
    }
  };

  // Handle reset camera button
  const handleResetCamera = () => {
    cameraStore.resetCamera();

    // Update local state
    setPosition(cameraStore.get("defaultPosition"));
    setTarget(cameraStore.get("defaultTarget"));

    // Reset FOV
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      const defaultFov = 75; // Default FOV value
      facade.updateParam("cameraFov", defaultFov, { resetCamera: true });
      setFov(defaultFov);
    }
  };

  // Check if UI values match actual store values
  const isSynced = () => {
    const storePosition = cameraStore.get("position");
    const storeTarget = cameraStore.get("target");

    return (
      Math.abs(position.x - storePosition.x) < 0.001 &&
      Math.abs(position.y - storePosition.y) < 0.001 &&
      Math.abs(position.z - storePosition.z) < 0.001 &&
      Math.abs(target.x - storeTarget.x) < 0.001 &&
      Math.abs(target.y - storeTarget.y) < 0.001 &&
      Math.abs(target.z - storeTarget.z) < 0.001
    );
  };

  return (
    <>
      {/* Status information (for debugging) */}
      {/* <div className="settingsGroup">
        <p className="statusText" style={{ fontSize: "11px", color: "#888" }}>
          {cameraStore.get("status") || "No updates yet"}
          {!isSynced() && (
            <span style={{ color: "orange" }}> (out of sync)</span>
          )}
        </p>
      </div> */}

      {/* Field of View */}
      <SettingsGroup collapsible={false} header={false}>
        <SettingsField label="FOV">
          <FigmaInput
            value={fov}
            min={15}
            max={90}
            step={1}
            onChange={handleFovChange}
          />
        </SettingsField>
      </SettingsGroup>

      {/* Camera Position */}
      <SettingsGroup title="Position" collapsible={false} header={false}>
        <SettingsField label="X">
          <FigmaInput
            value={position.x}
            min={-10}
            max={10}
            step={0.1}
            onChange={(value) => handlePositionChange("x", value)}
          />
        </SettingsField>
        <SettingsField label="Y">
          <FigmaInput
            value={position.y}
            min={-10}
            max={10}
            step={0.1}
            onChange={(value) => handlePositionChange("y", value)}
          />
        </SettingsField>
        <SettingsField label="Z">
          <FigmaInput
            value={position.z}
            min={-10}
            max={10}
            step={0.1}
            onChange={(value) => handlePositionChange("z", value)}
          />
        </SettingsField>
      </SettingsGroup>

      {/* Camera Target */}
      <SettingsGroup title="Look At Point" collapsible={false} header={false}>
        <SettingsField label="X">
          <FigmaInput
            value={target.x}
            min={-10}
            max={10}
            step={0.1}
            onChange={(value) => handleTargetChange("x", value)}
          />
        </SettingsField>
        <SettingsField label="Y">
          <FigmaInput
            value={target.y}
            min={-10}
            max={10}
            step={0.1}
            onChange={(value) => handleTargetChange("y", value)}
          />
        </SettingsField>
        <SettingsField label="Z">
          <FigmaInput
            value={target.z}
            min={-10}
            max={10}
            step={0.1}
            onChange={(value) => handleTargetChange("z", value)}
          />
        </SettingsField>
      </SettingsGroup>

      <Button variant="primary" size="small" onClick={handleResetCamera}>
        Reset Camera
      </Button>
    </>
  );
};

export default CameraPanel;
