import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import "./Panel.css";
import { FigmaInput } from "../FigmaInput";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type { SettingGroup } from "../../lib/settings/types";
import { useFacade } from "../../lib/facade/FacadeContext";
import { useDebounce } from "../../lib/hooks/useDebounce";

interface LightingPanelProps {
  // No props needed for now
}

const LightingPanel: FunctionComponent<LightingPanelProps> = () => {
  // Get the facade instance using the hook
  const facade = useFacade();

  // Get the lighting panel settings
  const lightingPanelConfigSignal = getPanelSettings("lighting");
  const lightingPanelConfig = useComputed(
    () => lightingPanelConfigSignal.value
  );

  // Create debounced update function
  const updateLightingWithDebounce = useDebounce(
    (id: string, value: number) => {
      updateSettingValue(id, value);
      // The shader param update is now handled by updateSettingValue
    },
    5
  );

  // If no settings are available, show a placeholder
  if (!lightingPanelConfig.value) {
    return <div className="noSettings">No lighting settings available</div>;
  }

  // Find the lighting settings group
  const lightingGroup = lightingPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "lighting"
  );

  // Handle lighting value change
  const handleLightingChange = (id: string, value: number) => {
    updateLightingWithDebounce(id, value);
  };

  return (
    <div className="panel">
      {/* Lighting Position */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Position</h3>
        <FigmaInput
          label="X"
          value={getSettingValue("lightDirX") as number}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightDirX", value)}
        />
        <FigmaInput
          label="Y"
          value={getSettingValue("lightDirY") as number}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightDirY", value)}
        />
        <FigmaInput
          label="Z"
          value={getSettingValue("lightDirZ") as number}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightDirZ", value)}
        />
      </div>

      {/* Lighting Intensity */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Intensity</h3>
        <FigmaInput
          label="Diffuse"
          value={getSettingValue("diffuseIntensity") as number}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("diffuseIntensity", value)}
        />
        <FigmaInput
          label="Ambient"
          value={getSettingValue("ambientIntensity") as number}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("ambientIntensity", value)}
        />
        <FigmaInput
          label="Rim"
          value={getSettingValue("rimLightIntensity") as number}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("rimLightIntensity", value)}
        />
      </div>
    </div>
  );
};

export default LightingPanel;
