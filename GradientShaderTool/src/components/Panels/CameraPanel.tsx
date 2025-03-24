import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { FigmaInput } from "../FigmaInput";
import { SettingsGroup } from "../UI/SettingsGroup";
import { SettingsField } from "../UI/SettingsGroup/SettingsGroup";
import { getCameraInitializer } from "../../lib/stores/CameraInitializer";
import { facadeSignal } from "../../app";

interface CameraPanelProps {
  // No props needed for now
}

export const CameraPanel: FunctionComponent<CameraPanelProps> = () => {
  // Use the camera initializer
  const cameraInitializer = getCameraInitializer();

  // Local state for FOV
  const [fov, setFov] = useState(75);

  // Subscribe to FOV signal
  useEffect(() => {
    // Set initial FOV from initializer
    setFov(cameraInitializer.cameraFov.value);

    // Subscribe to FOV changes
    const unsubscribe = cameraInitializer.cameraFov.subscribe((newFov) => {
      setFov(newFov);
    });

    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle FOV change from slider
  const handleFovChange = (value: number) => {
    // Update initializer which updates both the signals and the facade
    cameraInitializer.updateFov(value);
  };

  return (
    <>
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
    </>
  );
};

export default CameraPanel;
