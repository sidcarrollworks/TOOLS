import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useRef } from "preact/hooks";
import "./Panel.css";
import { FigmaInput } from "../FigmaInput";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type { SettingGroup } from "../../lib/settings/types";
import { appSignal } from "../../app";

interface LightingPanelProps {
  // No props needed for now
}

const LightingPanel: FunctionComponent<LightingPanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Debounce timer for lighting updates
  const debounceTimerRef = useRef<number | null>(null);

  // Get the lighting panel settings
  const lightingPanelConfigSignal = getPanelSettings("lighting");
  const lightingPanelConfig = useComputed(
    () => lightingPanelConfigSignal.value
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
    // Map the setting ID to the app parameter name
    const paramMap: Record<string, string> = {
      lightX: "lightDirX",
      lightY: "lightDirY",
      lightZ: "lightDirZ",
      lightDiffuse: "diffuseIntensity",
      lightAmbient: "ambientIntensity",
      lightRim: "rimLightIntensity",
    };

    const appParamName = paramMap[id];
    if (!appParamName) return;

    // Update the setting value in the store
    updateSettingValue(id, value);

    // Update the app parameter
    if (app.value) {
      // Check if the parameter exists in the app.params object
      if (appParamName in app.value.params) {
        // Use type assertion to safely update the parameter
        (app.value.params as any)[appParamName] = value;
      }

      // For light direction parameters, we need to handle them all together
      // to prevent normalization issues
      if (["lightDirX", "lightDirY", "lightDirZ"].includes(appParamName)) {
        // Store the direct values in the app.params without normalization
        // (this is done above)

        // Clear any existing timer
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }

        // Debounce updates to avoid too many updates
        debounceTimerRef.current = window.setTimeout(() => {
          if (app.value && app.value.updateParams) {
            app.value.updateParams(false); // Update without camera reset
          }
          debounceTimerRef.current = null;
        }, 50);
      } else {
        // For intensity parameters, we can update them immediately

        // Clear any existing timer
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }

        // Debounce updates to avoid too many updates
        debounceTimerRef.current = window.setTimeout(() => {
          if (app.value && app.value.updateParams) {
            app.value.updateParams(false); // Update without camera reset
          }
          debounceTimerRef.current = null;
        }, 50);
      }
    }
  };

  return (
    <div className="panel">
      {/* Lighting Position */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Light Position</h3>
        <FigmaInput
          label="X"
          value={getSettingValue("lightX") as number}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightX", value)}
        />
        <FigmaInput
          label="Y"
          value={getSettingValue("lightY") as number}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightY", value)}
        />
        <FigmaInput
          label="Z"
          value={getSettingValue("lightZ") as number}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightZ", value)}
        />
      </div>

      {/* Lighting Intensity */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Light Intensity</h3>
        <FigmaInput
          label="Diffuse"
          value={getSettingValue("lightDiffuse") as number}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightDiffuse", value)}
        />
        <FigmaInput
          label="Ambient"
          value={getSettingValue("lightAmbient") as number}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightAmbient", value)}
        />
        <FigmaInput
          label="Rim"
          value={getSettingValue("lightRim") as number}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleLightingChange("lightRim", value)}
        />
      </div>
    </div>
  );
};

export default LightingPanel;
