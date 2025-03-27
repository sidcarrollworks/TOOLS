import type { FunctionComponent } from "preact";
import { useEffect } from "preact/hooks";

import { FigmaInput } from "../FigmaInput";
import { DirectionControl } from "../DirectionControl";
import { getUIStore } from "../../lib/stores/UIStore";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import {
  getDistortionInitializer,
  getDistortionParameter,
} from "../../lib/stores/DistortionInitializer";
import { useSignalValue } from "../../lib/hooks/useSignals";
import { facadeSignal } from "../../app";

interface DistortionPanelProps {
  // No props needed for now
}

export const DistortionPanel: FunctionComponent<DistortionPanelProps> = () => {
  // Get the distortion initializer
  const distortionInitializer = getDistortionInitializer();

  // Get UI store for toast messages
  const uiStore = getUIStore();

  // Use signal values directly with custom hooks
  const noiseScaleX = useSignalValue(
    getDistortionParameter("normalNoiseScaleX")
  );
  const noiseScaleY = useSignalValue(
    getDistortionParameter("normalNoiseScaleY")
  );
  const noiseStrength = useSignalValue(
    getDistortionParameter("normalNoiseStrength")
  );
  const noiseSpeed = useSignalValue(getDistortionParameter("normalNoiseSpeed"));
  const shiftX = useSignalValue(getDistortionParameter("normalNoiseShiftX"));
  const shiftY = useSignalValue(getDistortionParameter("normalNoiseShiftY"));
  const shiftSpeed = useSignalValue(
    getDistortionParameter("normalNoiseShiftSpeed")
  );

  // Create update handlers using the initializer's methods
  const handleNoiseScaleXChange = (value: number) => {
    distortionInitializer.updateParameter("normalNoiseScaleX", value);
  };

  const handleNoiseScaleYChange = (value: number) => {
    distortionInitializer.updateParameter("normalNoiseScaleY", value);
  };

  const handleNoiseStrengthChange = (value: number) => {
    distortionInitializer.updateParameter("normalNoiseStrength", value);
  };

  const handleNoiseSpeedChange = (value: number) => {
    distortionInitializer.updateParameter("normalNoiseSpeed", value);
  };

  const handleShiftXChange = (value: number) => {
    distortionInitializer.updateParameter("normalNoiseShiftX", value);
  };

  const handleShiftYChange = (value: number) => {
    distortionInitializer.updateParameter("normalNoiseShiftY", value);
  };

  const handleShiftSpeedChange = (value: number) => {
    distortionInitializer.updateParameter("normalNoiseShiftSpeed", value);
  };

  // Handle facade preset events and parameter changes
  useEffect(() => {
    const facade = facadeSignal.value;

    if (facade) {
      const handlePresetApplied = () => {
        // Sync initializer with facade
        distortionInitializer.syncWithFacade();
      };

      const handleParamChanged = (data: any) => {
        // Only respond to changes in distortion-related parameters
        if (data && data.paramName) {
          const distortionParams = [
            "normalNoiseScaleX",
            "normalNoiseScaleY",
            "normalNoiseStrength",
            "normalNoiseShiftX",
            "normalNoiseShiftY",
            "normalNoiseShiftSpeed",
            "normalNoiseSpeed",
          ];

          if (distortionParams.includes(data.paramName)) {
            // Sync the specific parameter with the facade
            distortionInitializer.syncParameterFromFacade(data.paramName);
          }
        }
      };

      // Listen for both preset application and parameter changes
      facade.on("preset-applied", handlePresetApplied);
      facade.on("parameter-changed", handleParamChanged);

      return () => {
        facade.off("preset-applied", handlePresetApplied);
        facade.off("parameter-changed", handleParamChanged);
      };
    }
  }, []);

  // Handle reset button click
  const handleReset = () => {
    distortionInitializer.reset();
    uiStore.showToast("Distortion settings reset to defaults", "success");
  };

  return (
    <>
      <SettingsGroup collapsible={false} header={false}>
        <SettingsGroup collapsible={false} header={false}>
          <SettingsField label="Scale" inputDir="row" labelDir="column">
            <FigmaInput
              value={noiseScaleX}
              min={0.1}
              max={5}
              step={0.01}
              onChange={handleNoiseScaleXChange}
              dragIcon={<span>X</span>}
            />

            <FigmaInput
              value={noiseScaleY}
              min={0.1}
              max={5}
              step={0.01}
              onChange={handleNoiseScaleYChange}
              dragIcon={<span>Y</span>}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup collapsible={false} header={false} direction="row">
          <SettingsField label="Strength" labelDir="column">
            <FigmaInput
              value={noiseStrength}
              min={0}
              max={0.75}
              step={0.01}
              onChange={handleNoiseStrengthChange}
            />
          </SettingsField>

          <SettingsField label="Speed" labelDir="column">
            <FigmaInput
              value={noiseSpeed}
              min={0}
              max={0.5}
              step={0.01}
              onChange={handleNoiseSpeedChange}
            />
          </SettingsField>
        </SettingsGroup>
      </SettingsGroup>

      <DirectionControl
        valueX={shiftX}
        valueY={shiftY}
        speed={shiftSpeed}
        min={-2}
        max={2}
        minSpeed={0}
        maxSpeed={2}
        step={0.01}
        onChangeX={handleShiftXChange}
        onChangeY={handleShiftYChange}
        onChangeSpeed={handleShiftSpeedChange}
      />
    </>
  );
};

export default DistortionPanel;
