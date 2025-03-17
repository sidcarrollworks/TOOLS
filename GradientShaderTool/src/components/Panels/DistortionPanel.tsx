import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import "./Panel.css";
import { FigmaInput } from "../FigmaInput";
import { DirectionControl } from "../DirectionControl";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type { SettingGroup, SliderSetting } from "../../lib/settings/types";
import { useFacade } from "../../lib/facade/FacadeContext";
import { useDebounce } from "../../lib/hooks/useDebounce";

interface DistortionPanelProps {
  // No props needed for now
}

export const DistortionPanel: FunctionComponent<DistortionPanelProps> = () => {
  // Get the facade instance using the hook
  const facade = useFacade();

  // Get the distortion panel settings
  const distortionPanelConfigSignal = getPanelSettings("distortion");
  const distortionPanelConfig = useComputed(
    () => distortionPanelConfigSignal.value
  );

  // Create debounced update function
  const updateDistortionWithDebounce = useDebounce(
    (id: string, value: number) => {
      updateSettingValue(id, value);
      // The shader param update is now handled by updateSettingValue
    },
    5
  );

  // Handle flow direction changes immediately without debounce
  const handleFlowDirectionChange = (id: string, value: number) => {
    console.log(`DEBUG DistortionPanel direct update (${id}):`, value);
    // Update directly without debounce
    updateSettingValue(id, value);
  };

  // Handle slider value change
  const handleSliderChange = (id: string, value: number) => {
    // For flow direction controls, use immediate updates
    if (id.includes("NoiseShift")) {
      handleFlowDirectionChange(id, value);
    } else {
      // For other sliders, use debounced updates
      updateDistortionWithDebounce(id, value);
    }
  };

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
          onChangeX={(value) => {
            console.log("DEBUG DistortionPanel onChangeX:", value);
            // Use direct update without debounce
            handleFlowDirectionChange("normalNoiseShiftX", value);
          }}
          onChangeY={(value) => {
            console.log("DEBUG DistortionPanel onChangeY:", value);
            // Use direct update without debounce
            handleFlowDirectionChange("normalNoiseShiftY", value);
          }}
          onChangeSpeed={(value) => {
            console.log("DEBUG DistortionPanel onChangeSpeed:", value);
            // Use direct update without debounce
            handleFlowDirectionChange("normalNoiseShiftSpeed", value);
          }}
        />
      </div>
    </div>
  );
};

export default DistortionPanel;
