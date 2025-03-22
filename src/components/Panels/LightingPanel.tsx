import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { FigmaInput } from "../FigmaInput";
import { getLightingStore } from "../../lib/stores/LightingStore";
import { Button } from "../UI/Button";
import { SettingsField, SettingsGroup } from "../UI/SettingsGroup";
import {
  getLightingInitializer,
  getLightingParameter,
} from "../../lib/stores/LightingInitializer";
import { useSignalValue } from "../../lib/hooks/useSignals";
import { facadeSignal } from "../../app";

interface LightingPanelProps {
  // No props needed for now
}

const LightingPanel: FunctionComponent<LightingPanelProps> = () => {
  // Get the lighting initializer
  const lightingInitializer = getLightingInitializer();

  // Use signal values directly with custom hooks
  const lightDirX = useSignalValue(getLightingParameter("lightDirX"));
  const lightDirY = useSignalValue(getLightingParameter("lightDirY"));
  const lightDirZ = useSignalValue(getLightingParameter("lightDirZ"));

  const diffuseIntensity = useSignalValue(
    getLightingParameter("diffuseIntensity")
  );
  const ambientIntensity = useSignalValue(
    getLightingParameter("ambientIntensity")
  );
  const rimLightIntensity = useSignalValue(
    getLightingParameter("rimLightIntensity")
  );

  // Create update handlers using the initializer's methods
  const handleDirectionChange = (axis: "x" | "y" | "z", value: number) => {
    lightingInitializer.updateDirectionAxis(axis, value);
  };

  // Handle light intensity changes from UI
  const handleIntensityChange = (
    type: "diffuse" | "ambient" | "rimLight",
    value: number
  ) => {
    lightingInitializer.updateIntensity(type, value);
  };

  // Handle reset lighting button
  const handleResetLighting = () => {
    lightingInitializer.reset();
  };

  // Handle facade preset events
  useEffect(() => {
    const facade = facadeSignal.value;

    if (facade) {
      const handlePresetApplied = () => {
        // Sync initializer with facade
        lightingInitializer.syncWithFacade();
      };

      facade.on("preset-applied", handlePresetApplied);

      return () => {
        facade.off("preset-applied", handlePresetApplied);
      };
    }
  }, []);

  return (
    <>
      {/* Lighting Position */}
      <SettingsGroup title="Position" collapsible={false} header={false}>
        <SettingsField label="X" labelDir="row">
          <FigmaInput
            value={lightDirX}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleDirectionChange("x", value)}
          />
        </SettingsField>

        <SettingsField label="Y" labelDir="row">
          <FigmaInput
            value={lightDirY}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleDirectionChange("y", value)}
          />
        </SettingsField>

        <SettingsField label="Z" labelDir="row">
          <FigmaInput
            value={lightDirZ}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleDirectionChange("z", value)}
          />
        </SettingsField>
      </SettingsGroup>

      {/* Lighting Intensity */}
      <SettingsGroup title="Intensity" collapsible={false} header={false}>
        <SettingsField label="Diffuse" labelDir="row">
          <FigmaInput
            value={diffuseIntensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("diffuse", value)}
          />
        </SettingsField>
        <SettingsField label="Ambient" labelDir="row">
          <FigmaInput
            value={ambientIntensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("ambient", value)}
          />
        </SettingsField>
        <SettingsField label="Rim" labelDir="row">
          <FigmaInput
            value={rimLightIntensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("rimLight", value)}
          />
        </SettingsField>
      </SettingsGroup>

      <Button variant="primary" size="small" onClick={handleResetLighting}>
        Reset Lighting
      </Button>
    </>
  );
};

export default LightingPanel;
