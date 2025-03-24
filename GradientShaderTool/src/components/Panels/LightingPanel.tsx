import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { FigmaInput } from "../FigmaInput";
import { Button } from "../UI/Button";
import { SettingsField, SettingsGroup } from "../UI/SettingsGroup";
import { getLightingInitializer } from "../../lib/stores/LightingInitializer";
import { facadeSignal } from "../../app";

interface LightingPanelProps {
  // No props needed for now
}

const LightingPanel: FunctionComponent<LightingPanelProps> = () => {
  console.log("LightingPanel: Component rendering");

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
    console.log("LightingPanel: Setting up effect");

    // Log current values
    console.log("LightingPanel: Current signal values:", {
      lightDirX: lightDirX.value,
      lightDirY: lightDirY.value,
      lightDirZ: lightDirZ.value,
      diffuseIntensity: diffuseIntensity.value,
      ambientIntensity: ambientIntensity.value,
      rimLightIntensity: rimLightIntensity.value,
    });

    // Ensure we have the latest values from the facade
    console.log("LightingPanel: Syncing initializer with facade");
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
        console.log("LightingPanel: Cleanup effect");
      };
    }

    return () => {
      console.log("LightingPanel: Cleanup effect");
    };
  }, []);

  // Handle light direction changes from UI
  const handleDirectionChange = (axis: "x" | "y" | "z", value: number) => {
    console.log(`LightingPanel: Direction change - ${axis}: ${value}`);
    initializer.updateDirectionAxis(axis, value);
  };

  // Handle light intensity changes from UI
  const handleIntensityChange = (
    type: "diffuse" | "ambient" | "rimLight",
    value: number
  ) => {
    console.log(`LightingPanel: Intensity change - ${type}: ${value}`);
    initializer.updateIntensity(type, value);
  };

  // Handle reset lighting button
  const handleResetLighting = () => {
    console.log("LightingPanel: Reset lighting requested");
    initializer.reset();
  };

  return (
    <>
      {/* Lighting Position */}

      <SettingsGroup title="Position" collapsible={false} header={false}>
        <SettingsField label="X" labelDir="row">
          <FigmaInput
            value={lightDirX.value}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleDirectionChange("x", value)}
          />
        </SettingsField>

        <SettingsField label="Y" labelDir="row">
          <FigmaInput
            value={lightDirY.value}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleDirectionChange("y", value)}
          />
        </SettingsField>

        <SettingsField label="Z" labelDir="row">
          <FigmaInput
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
          <FigmaInput
            value={diffuseIntensity.value}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("diffuse", value)}
          />
        </SettingsField>
        <SettingsField label="Ambient" labelDir="row">
          <FigmaInput
            value={ambientIntensity.value}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleIntensityChange("ambient", value)}
          />
        </SettingsField>
        <SettingsField label="Rim" labelDir="row">
          <FigmaInput
            value={rimLightIntensity.value}
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
