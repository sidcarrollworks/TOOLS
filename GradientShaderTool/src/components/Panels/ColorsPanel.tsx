import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useRef } from "preact/hooks";
import "./Panel.css";
import Select from "../UI/Select";
import { FigmaInput } from "../FigmaInput";
import { DirectionControl } from "../DirectionControl";
import { Checkbox } from "../UI/Checkbox";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
  batchUpdateSettings,
} from "../../lib/settings/store";
import type {
  SettingGroup,
  SelectSetting,
  SliderSetting,
  ColorSetting,
} from "../../lib/settings/types";
import { appSignal } from "../../app";
import { useDebounce } from "../../lib/hooks/useDebounce";

interface ColorsPanelProps {
  // No props needed for now
}

export const ColorsPanel: FunctionComponent<ColorsPanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Get the colors panel settings
  const colorsPanelConfigSignal = getPanelSettings("colors");
  const colorsPanelConfig = useComputed(() => colorsPanelConfigSignal.value);

  // Create debounced update functions
  const updateSettingWithDebounce = useDebounce((id: string, value: any) => {
    updateSettingValue(id, value);
    // The shader param update is now handled by updateSettingValue
  }, 50);

  // Handle flow direction changes immediately without debounce
  const handleFlowDirectionChange = (id: string, value: number) => {
    console.log(`DEBUG ColorsPanel direct update (${id}):`, value);
    // Update directly without debounce
    updateSettingValue(id, value);
  };

  // Handle slider value change
  const handleSliderChange = (id: string, value: number) => {
    // For flow direction controls, use immediate updates
    if (id.includes("gradientShift")) {
      handleFlowDirectionChange(id, value);
    } else {
      // For other sliders, use debounced updates
      updateSettingWithDebounce(id, value);
    }
  };

  // If no settings are available, show a placeholder
  if (!colorsPanelConfig.value) {
    return <div className="noSettings">No color settings available</div>;
  }

  // Find the gradient mode settings group
  const gradientModeGroup = colorsPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "gradientMode"
  );

  // Find the colors settings group
  const colorsGroup = colorsPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "colors"
  );

  // Find the gradient mode setting
  const gradientModeSetting = gradientModeGroup?.settings.find(
    (setting): setting is SelectSetting => setting.id === "gradientMode"
  );

  // Handle gradient mode change
  const handleGradientModeChange = (value: string) => {
    const numericValue = parseInt(value, 10);
    updateSettingValue("gradientMode", numericValue);
  };

  // Handle color change
  const handleColorChange = (id: string, value: string) => {
    updateSettingWithDebounce(id, value);
  };

  // Get the label for the current gradient mode
  const getGradientModeLabel = () => {
    const currentValue = getSettingValue("gradientMode") as number;
    const option = gradientModeSetting?.options.find(
      (opt) => opt.value === currentValue
    );
    return option ? option.label : "Select mode";
  };

  return (
    <div className="panel">
      {/* Gradient Mode Select */}
      {gradientModeSetting && (
        <div className="settingRow">
          <label className="label">{gradientModeSetting.label}</label>
          <Select.Root
            value={(getSettingValue("gradientMode") as number).toString()}
            onValueChange={handleGradientModeChange}
          >
            <Select.Trigger>{getGradientModeLabel()}</Select.Trigger>
            <Select.Content>
              {gradientModeSetting.options.map((option) => (
                <Select.Item
                  key={option.value.toString()}
                  value={option.value.toString()}
                >
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      )}

      {/* Colors */}
      {colorsGroup && (
        <div className="settingsGroup">
          {colorsGroup.settings.map((setting) => {
            if (setting.type === "color") {
              const colorSetting = setting as ColorSetting;
              const currentValue = getSettingValue(setting.id) as string;

              return (
                <div key={setting.id} className="colorRow">
                  <label className="label">{setting.label}</label>
                  <div className="colorPickerContainer">
                    <input
                      type="color"
                      className="colorPicker"
                      value={currentValue}
                      onChange={(e) =>
                        handleColorChange(
                          setting.id,
                          (e.target as HTMLInputElement).value
                        )
                      }
                    />
                    <span className="colorValue">{currentValue}</span>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Color Noise Settings */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Color Noise</h3>
        <FigmaInput
          label="Scale"
          value={getSettingValue("colorNoiseScale") as number}
          min={0}
          max={10}
          step={0.1}
          onChange={(value) => handleSliderChange("colorNoiseScale", value)}
        />
        <FigmaInput
          label="Speed"
          value={getSettingValue("colorNoiseSpeed") as number}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleSliderChange("colorNoiseSpeed", value)}
        />

        <DirectionControl
          valueX={getSettingValue("gradientShiftX") as number}
          valueY={getSettingValue("gradientShiftY") as number}
          speed={getSettingValue("gradientShiftSpeed") as number}
          min={-1}
          max={1}
          minSpeed={0}
          maxSpeed={0.5}
          step={0.01}
          onChangeX={(value) => {
            console.log("DEBUG ColorsPanel onChangeX:", value);
            handleFlowDirectionChange("gradientShiftX", value);
          }}
          onChangeY={(value) => {
            console.log("DEBUG ColorsPanel onChangeY:", value);
            handleFlowDirectionChange("gradientShiftY", value);
          }}
          onChangeSpeed={(value) => {
            console.log("DEBUG ColorsPanel onChangeSpeed:", value);
            handleFlowDirectionChange("gradientShiftSpeed", value);
          }}
        />
      </div>

      {/* Background Settings */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Background</h3>

        {/* Transparent Background Toggle */}
        <Checkbox
          label="Transparent"
          checked={
            (getSettingValue("transparentBackground") as boolean) ?? false
          }
          onChange={(checked) => {
            updateSettingValue("transparentBackground", checked);
          }}
        />

        {/* Background Color */}
        <div className="colorRow">
          <label className="label">Color</label>
          <div className="colorPickerContainer">
            <input
              type="color"
              className="colorPicker"
              value={getSettingValue("backgroundColor") as string}
              onChange={(e) =>
                handleColorChange(
                  "backgroundColor",
                  (e.target as HTMLInputElement).value
                )
              }
            />
            <span className="colorValue">
              {getSettingValue("backgroundColor") as string}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorsPanel;
