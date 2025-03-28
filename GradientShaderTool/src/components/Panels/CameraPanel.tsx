import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ScrubInput } from "../ScrubInput";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import { getCameraInitializer } from "../../lib/stores/CameraInitializer";
import { Checkbox } from "../UI";

interface CameraPanelProps {
  // No props needed for now
}

export const CameraPanel: FunctionComponent<CameraPanelProps> = () => {
  // Use the camera initializer
  const cameraInitializer = getCameraInitializer();

  // Local state for FOV and grain effect
  const [fov, setFov] = useState(cameraInitializer.cameraFov.value);
  const [enableGrain, setEnableGrain] = useState(cameraInitializer.enableGrain.value);
  const [grainIntensity, setGrainIntensity] = useState(cameraInitializer.grainIntensity.value);
  const [grainScale, setGrainScale] = useState(cameraInitializer.grainScale.value);
  const [grainDensity, setGrainDensity] = useState(cameraInitializer.grainDensity.value);
  const [grainSpeed, setGrainSpeed] = useState(cameraInitializer.grainSpeed.value);
  const [grainThreshold, setGrainThreshold] = useState(cameraInitializer.grainThreshold.value);

  // Subscribe to FOV and grain effect signals
  useEffect(() => {
    // Set initial values from initializer
    setFov(cameraInitializer.cameraFov.value);
    setEnableGrain(cameraInitializer.enableGrain.value);
    setGrainIntensity(cameraInitializer.grainIntensity.value);
    setGrainScale(cameraInitializer.grainScale.value);
    setGrainDensity(cameraInitializer.grainDensity.value);
    setGrainSpeed(cameraInitializer.grainSpeed.value);
    setGrainThreshold(cameraInitializer.grainThreshold.value);

    // Subscribe to FOV changes
    const unsubscribeFov = cameraInitializer.cameraFov.subscribe((newFov) => {
      setFov(newFov);
    });

    // Subscribe to grain effect changes
    const unsubscribeGrain = cameraInitializer.enableGrain.subscribe((newValue) => {
      setEnableGrain(newValue);
    });

    // Subscribe to grain intensity changes
    const unsubscribeGrainIntensity = cameraInitializer.grainIntensity.subscribe((newValue) => {
      setGrainIntensity(newValue);
    });

    // Subscribe to grain scale changes
    const unsubscribeGrainScale = cameraInitializer.grainScale.subscribe((newValue) => {
      setGrainScale(newValue);
    });

    // Subscribe to grain density changes
    const unsubscribeGrainDensity = cameraInitializer.grainDensity.subscribe((newValue) => {
      setGrainDensity(newValue);
    });

    // Subscribe to grain speed changes
    const unsubscribeGrainSpeed = cameraInitializer.grainSpeed.subscribe((newValue) => {
      setGrainSpeed(newValue);
    });

    // Subscribe to grain threshold changes
    const unsubscribeGrainThreshold = cameraInitializer.grainThreshold.subscribe((newValue) => {
      setGrainThreshold(newValue);
    });

    // Clean up subscriptions when component unmounts
    return () => {
      unsubscribeFov();
      unsubscribeGrain();
      unsubscribeGrainIntensity();
      unsubscribeGrainScale();
      unsubscribeGrainDensity();
      unsubscribeGrainSpeed();
      unsubscribeGrainThreshold();
    };
  }, []);

  // Handle FOV change from slider
  const handleFovChange = (value: number) => {
    // Update initializer which updates both the signals and the facade
    cameraInitializer.updateFov(value);
  };

  // Handle grain effect toggle
  const handleGrainChange = (checked: boolean) => {
    // Update initializer which updates both the signals and the facade
    cameraInitializer.updateGrain(checked);
  };

  // Handle grain intensity change
  const handleGrainIntensityChange = (value: number) => {
    cameraInitializer.updateGrainIntensity(value);
  };

  // Handle grain scale change
  const handleGrainScaleChange = (value: number) => {
    cameraInitializer.updateGrainScale(value);
  };

  // Handle grain density change
  const handleGrainDensityChange = (value: number) => {
    cameraInitializer.updateGrainDensity(value);
  };

  // Handle grain speed change
  const handleGrainSpeedChange = (value: number) => {
    cameraInitializer.updateGrainSpeed(value);
  };

  // Handle grain threshold change
  const handleGrainThresholdChange = (value: number) => {
    cameraInitializer.updateGrainThreshold(value);
  };

  return (
    <>
      {/* Field of View */}
      <SettingsGroup collapsible={false} header={false}>
        <SettingsField label="FOV" style={{ marginBottom: 0 }}>
          <ScrubInput
            value={fov}
            min={15}
            max={90}
            step={1}
            onChange={handleFovChange}
          />
        </SettingsField>
      </SettingsGroup>

      {/* Grain Effect */}
      <SettingsGroup title="Effects" collapsible={false} header={false}>
        <SettingsField label="Grain">
          <Checkbox
            checked={enableGrain}
            onChange={handleGrainChange}
          />
        </SettingsField>
        
        {/* Only show grain controls when grain effect is enabled */}
        {enableGrain && (
          <>
            <SettingsField label="Intensity">
              <ScrubInput
                value={grainIntensity}
                min={0}
                max={1}
                step={0.01}
                onChange={handleGrainIntensityChange}
              />
            </SettingsField>
            <SettingsField label="Scale">
              <ScrubInput
                value={grainScale}
                min={5}
                max={15}
                step={1}
                onChange={handleGrainScaleChange}
              />
            </SettingsField>
            <SettingsField label="Density">
              <ScrubInput
                value={grainDensity}
                min={0}
                max={1}
                step={0.01}
                onChange={handleGrainDensityChange}
              />
            </SettingsField>
            <SettingsField label="Speed">
              <ScrubInput
                value={grainSpeed}
                min={0}
                max={2}
                step={0.01}
                onChange={handleGrainSpeedChange}
              />
            </SettingsField>
            <SettingsField label="Threshold">
              <ScrubInput
                value={grainThreshold}
                min={0.01}
                max={0.5}
                step={0.01}
                onChange={handleGrainThresholdChange}
              />
            </SettingsField>
          </>
        )}
      </SettingsGroup>
    </>
  );
};

export default CameraPanel;
