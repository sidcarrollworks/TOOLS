import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import "./Panel.css";
import Select from "../UI/Select";
import { FigmaInput } from "../FigmaInput";
import { Checkbox } from "../UI/Checkbox";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type {
  SettingGroup,
  SelectSetting,
  SliderSetting,
} from "../../lib/settings/types";
import { appSignal } from "../../app";
import { useDebounce } from "../../lib/hooks/useDebounce";

interface GeometryPanelProps {
  // No props needed for now
}

export const GeometryPanel: FunctionComponent<GeometryPanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Get the geometry panel settings
  const geometryPanelConfigSignal = getPanelSettings("geometry");
  const geometryPanelConfig = useComputed(
    () => geometryPanelConfigSignal.value
  );

  // Get the current geometry type
  const geometryType = useComputed(
    () => getSettingValue("geometryType") as string
  );

  // Create debounced update function for geometry settings
  const updateGeometryWithDebounce = useDebounce((id: string, value: any) => {
    updateSettingValue(id, value);

    // Recreate the geometry after updating the parameter
    // This needs to be done manually since it's a special operation
    if (app.value) {
      app.value.recreateGeometry();
    }
  }, 300);

  // If no settings are available, show a placeholder
  if (!geometryPanelConfig.value) {
    return <div className="noSettings">No geometry settings available</div>;
  }

  // Find the geometry type setting group
  const typeGroup = geometryPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "geometryType"
  );

  // Find the type setting
  const typeSetting = typeGroup?.settings.find(
    (setting): setting is SelectSetting => setting.id === "geometryType"
  );

  // Find the settings group for the current geometry type
  const currentTypeSettings = geometryPanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === `${geometryType.value}Settings`
  );

  // Handle geometry type change
  const handleTypeChange = (value: string) => {
    updateSettingValue("geometryType", value);

    // Force geometry recreation when type changes
    if (app.value) {
      app.value.recreateGeometry();
    }
  };

  // Handle slider value change
  const handleSliderChange = (id: string, value: number) => {
    updateGeometryWithDebounce(id, value);
  };

  // Handle checkbox change (for wireframe)
  const handleCheckboxChange = (id: string, checked: boolean) => {
    updateSettingValue(id, checked);
  };

  // Get the label for the current geometry type
  const getGeometryTypeLabel = () => {
    const option = typeSetting?.options.find(
      (opt) => opt.value.toString() === geometryType.value
    );
    return option ? option.label : "Select type";
  };

  return (
    <div className="panel">
      {/* Geometry Type Select */}
      {typeSetting && (
        <div className="settingRow">
          <label className="label">{typeSetting.label}</label>
          <Select.Root
            value={(getSettingValue("geometryType") as string).toString()}
            onValueChange={handleTypeChange}
          >
            <Select.Trigger>{getGeometryTypeLabel()}</Select.Trigger>
            <Select.Content>
              {typeSetting.options.map((option) => (
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

      {/* Geometry Settings */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Shape</h3>

        {/* Render sliders for the current geometry type */}
        {currentTypeSettings &&
          currentTypeSettings.settings.map((setting) => {
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
      </div>

      {/* Wireframe Toggle */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Display</h3>
        <Checkbox
          label="Show Wireframe"
          checked={getSettingValue("showWireframe") as boolean}
          onChange={(checked) => handleCheckboxChange("showWireframe", checked)}
        />
      </div>
    </div>
  );
};

export default GeometryPanel;
