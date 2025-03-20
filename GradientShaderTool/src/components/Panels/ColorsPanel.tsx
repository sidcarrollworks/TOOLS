import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";

import Select from "../UI/Select";
import { FigmaInput } from "../FigmaInput";
import { DirectionControl } from "../DirectionControl";
import { Checkbox, ColorInput } from "../UI";
import { SettingsField, SettingsGroup } from "../UI/SettingsGroup";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
  batchUpdateSettings,
} from "../../lib/settings/store";
import type { SettingGroup, SelectSetting } from "../../lib/settings/types";
import { facadeSignal } from "../../app";
import { useDebounce } from "../../lib/hooks/useDebounce";
import { getExportStore } from "../../lib/stores/index";

interface ColorsPanelProps {
  // No props needed for now
}

export const ColorsPanel: FunctionComponent<ColorsPanelProps> = () => {
  // Use facadeSignal instead of useFacade
  const facade = useComputed(() => facadeSignal.value);

  // Get the export store to keep transparent setting in sync
  const exportStore = getExportStore();

  // Get the colors panel settings
  const colorsPanelConfigSignal = getPanelSettings("colors");
  const colorsPanelConfig = useComputed(() => colorsPanelConfigSignal.value);

  // Create debounced update functions
  const updateSettingWithDebounce = useDebounce((id: string, value: any) => {
    updateSettingValue(id, value);
    // The shader param update is now handled by updateSettingValue
  }, 5);

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

  // Handle transparent background toggle
  const handleTransparentBackgroundChange = (checked: boolean) => {
    // Update the settings store
    updateSettingValue("transparentBackground", checked);

    // Also update the export store to keep them in sync
    exportStore.updateImageSettings({
      transparent: checked,
    });

    // Update the facade directly if available to ensure immediate visual feedback
    if (facade.value) {
      facade.value.updateParam("exportTransparentBg", checked);
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
    <>
      {/* Gradient Mode Select */}
      <SettingsGroup title="Gradient" collapsible={false} header={false}>
        {gradientModeSetting && (
          <SettingsField label={gradientModeSetting.label}>
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
          </SettingsField>
        )}
      </SettingsGroup>

      {/* Colors */}
      {colorsGroup && (
        <SettingsGroup title="Colors" collapsible={false} header={false}>
          {colorsGroup.settings.map((setting) => {
            if (setting.type === "color") {
              const currentValue = getSettingValue(setting.id) as string;

              return (
                <SettingsField key={setting.id} label={setting.label}>
                  <ColorInput
                    value={currentValue}
                    onChange={(value: string) =>
                      handleColorChange(setting.id, value)
                    }
                    debounce={5}
                  />
                </SettingsField>
              );
            }
            return null;
          })}
        </SettingsGroup>
      )}

      {/* Color Noise Settings */}

      <SettingsGroup title="Color Noise" collapsible={false} header={false}>
        <SettingsField label="Scale" labelDir="row">
          <FigmaInput
            value={getSettingValue("colorNoiseScale") as number}
            min={0}
            max={10}
            step={0.1}
            onChange={(value) => handleSliderChange("colorNoiseScale", value)}
          />
        </SettingsField>

        <SettingsField label="Speed" labelDir="row">
          <FigmaInput
            value={getSettingValue("colorNoiseSpeed") as number}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleSliderChange("colorNoiseSpeed", value)}
          />
        </SettingsField>

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
      </SettingsGroup>

      {/* Background Settings */}
      <SettingsGroup title="Background" collapsible={false} header={false}>
        <SettingsField label="Transparent">
          {/* Transparent Background Toggle */}
          <Checkbox
            checked={
              (getSettingValue("transparentBackground") as boolean) ?? false
            }
            onChange={handleTransparentBackgroundChange}
          />
        </SettingsField>

        {/* Background Color */}
        <SettingsField label="Color">
          <ColorInput
            value={getSettingValue("backgroundColor") as string}
            onChange={(value: string) =>
              handleColorChange("backgroundColor", value)
            }
            debounce={5}
          />
        </SettingsField>
      </SettingsGroup>
    </>
  );
};

export default ColorsPanel;
