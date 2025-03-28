import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { ScrubInput } from "../ScrubInput";
import { Button } from "../UI/Button";
import { SettingsField, SettingsGroup } from "../UI/SettingsGroup";
import { getLightingInitializer } from "../../lib/stores/LightingInitializer";
import { facadeSignal } from "../../app";

interface LightingPanelProps {
  // No props needed for now
}

const LightingPanel: FunctionComponent<LightingPanelProps> = () => {
  // Only use the lighting initializer
  const initializer = getLightingInitializer();

  // Get signals directly from the initializer
  const {
    lightDirX,
    lightDirY,
    lightDirZ,
    diffuseIntensity,
    ambientIntensity,
    rimLightIntensity,
  } = initializer;

  // Subscribe to changes when the component mounts
  useEffect(() => {
    // Ensure we have the latest values from the facade

    initializer.syncWithFacade();

    // Subscribe to preset applied events
    const facade = facadeSignal.value;
    if (facade) {
      const handlePresetApplied = () => {
        initializer.syncWithFacade();
      };

      facade.on("preset-applied", handlePresetApplied);

      return () => {
        facade.off("preset-applied", handlePresetApplied);
      };
    }

    return () => {
      // Cleanup effect
    };
  }, []);

  // Handle light direction changes from UI
  const handleDirectionChange = (axis: "x" | "y" | "z", value: number) => {
    initializer.updateDirectionAxis(axis, value);
  };

  // Handle light intensity changes from UI
  const handleIntensityChange = (
    type: "diffuse" | "ambient" | "rimLight",
    value: number
  ) => {
    initializer.updateIntensity(type, value);
  };

  // Handle reset lighting button
  const handleResetLighting = () => {
    initializer.reset();
  };

  return (
    <>
      {/* Lighting Position */}

      <SettingsGroup title="Position" collapsible={false} header={false}>
        <SettingsField label="X" labelDir="row">
          <ScrubInput
            value={lightDirX.value}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleDirectionChange("x", value)}
          />
        </SettingsField>

        <SettingsField label="Y" labelDir="row">
          <ScrubInput
            value={lightDirY.value}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleDirectionChange("y", value)}
          />
        </SettingsField>

        <SettingsField label="Z" labelDir="row">
          <ScrubInput
            value={lightDirZ.value}
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
          <ScrubInput
            value={diffuseIntensity.value}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("diffuse", value)}
          />
        </SettingsField>
        <SettingsField label="Ambient" labelDir="row">
          <ScrubInput
            value={ambientIntensity.value}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("ambient", value)}
          />
        </SettingsField>
        <SettingsField label="Rim" labelDir="row">
          <ScrubInput
            value={rimLightIntensity.value}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("rimLight", value)}
          />
        </SettingsField>
      </SettingsGroup>
    </>
  );
};

export default LightingPanel;
