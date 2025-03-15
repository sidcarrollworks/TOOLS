import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useRef } from "preact/hooks";
import "./Panel.css";
import { FigmaInput } from "../FigmaInput";
import { DirectionControl } from "../DirectionControl";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type { SettingGroup, SliderSetting } from "../../lib/settings/types";
import { appSignal } from "../../app";

interface DistortionPanelProps {
  // No props needed for now
}

export const DistortionPanel: FunctionComponent<DistortionPanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Debounce timer for distortion updates
  const debounceTimerRef = useRef<number | null>(null);

  // Get the distortion panel settings
  const distortionPanelConfigSignal = getPanelSettings("distortion");
  const distortionPanelConfig = useComputed(
    () => distortionPanelConfigSignal.value
  );

  // If no settings are available, show a placeholder
  if (!distortionPanelConfig.value) {
    return <div className="noSettings">No distortion settings available</div>;
  }

  // Find the normal noise settings group
  const normalNoiseGroup = distortionPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "normalNoise"
  );

  // Find the normal noise shift settings group
  const normalNoiseShiftGroup = distortionPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "normalNoiseShift"
  );

  // Handle slider value change
  const handleSliderChange = (id: string, value: number) => {
    updateSettingValue(id, value);

    // Update the app parameter
    if (app.value) {
      // Check if the parameter exists in the app.params object
      if (id in app.value.params) {
        // Use type assertion to safely update the parameter
        (app.value.params as any)[id] = value;
      }

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
  };

  return (
    <div className="panel">
      {/* Noise Settings */}
      <div className="settingsGroup">
        {/* Render sliders for noise settings */}
        {normalNoiseGroup &&
          normalNoiseGroup.settings.map((setting) => {
            if (setting.type === "slider") {
              const sliderSetting = setting as SliderSetting;
              const currentValue = getSettingValue(setting.id) as number;

              return (
                <FigmaInput
                  key={setting.id}
                  label={setting.label}
                  value={currentValue}
                  min={sliderSetting.min}
                  max={sliderSetting.max}
                  step={sliderSetting.step}
                  onChange={(value) => handleSliderChange(setting.id, value)}
                />
              );
            }
            return null;
          })}

        <DirectionControl
          valueX={getSettingValue("normalNoiseShiftX") as number}
          valueY={getSettingValue("normalNoiseShiftY") as number}
          speed={getSettingValue("normalNoiseShiftSpeed") as number}
          min={-1}
          max={1}
          minSpeed={0}
          maxSpeed={1}
          step={0.01}
          onChangeX={(value) => handleSliderChange("normalNoiseShiftX", value)}
          onChangeY={(value) => handleSliderChange("normalNoiseShiftY", value)}
          onChangeSpeed={(value) =>
            handleSliderChange("normalNoiseShiftSpeed", value)
          }
        />
      </div>
    </div>
  );
};

export default DistortionPanel;
