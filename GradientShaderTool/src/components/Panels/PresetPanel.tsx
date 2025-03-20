import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { CardButton } from "../UI/CardButton";
import { getPanelSettings } from "../../lib/settings/store";
import { useComputed } from "@preact/signals";

import type {
  PanelConfig,
  SettingGroup,
  ButtonSetting,
} from "../../lib/settings/types";
import { facadeSignal } from "../../app";
import { initializeSettingsFromShaderApp } from "../../lib/settings/initApp";
import { setPresetApplying } from "../FigmaInput/FigmaInput";
import { settingToParamMap } from "../../lib/settings/mappings";
import { SettingsGroup } from "../UI/SettingsGroup/SettingsGroup";

interface PresetPanelProps {
  // No props needed for now
}

export const PresetPanel: FunctionComponent<PresetPanelProps> = () => {
  // State for tracking the last applied preset
  const [lastAppliedPreset, setLastAppliedPreset] = useState<string | null>(
    null
  );

  // Use facadeSignal instead of useFacade
  const facade = useComputed(() => facadeSignal.value);

  // Get the presets panel settings
  const presetPanelConfigSignal = getPanelSettings("presets");
  const presetPanelConfig = useComputed(() => presetPanelConfigSignal.value);

  // If no settings are available, show a placeholder
  if (!presetPanelConfig.value) {
    return <div className="noPresets">No presets available</div>;
  }

  // Get all preset settings from all groups
  const presets = presetPanelConfig.value.groups.flatMap(
    (group: SettingGroup) =>
      group.settings.filter(
        (setting): setting is ButtonSetting => setting.type === "button"
      )
  );

  // Handle preset click
  const handlePresetClick = (presetId: string) => {
    console.log(`Applying preset: ${presetId}`);

    // Get the preset name from the mapping
    const presetName = settingToParamMap.get(presetId);
    if (!presetName) {
      console.error(`Mapping not found for preset ID: ${presetId}`);
      return;
    }

    // Check if facade is available
    if (!facade.value) {
      console.error("Facade not available");
      return;
    }

    // Set the preset application state to true before applying the preset
    setPresetApplying(true);

    try {
      // Apply the preset using the facade
      facade.value.applyPreset(presetName);
      console.log(`Applied preset: ${presetName}`);

      // Sync the facade parameters back to the settings store
      initializeSettingsFromShaderApp(facade.value);

      // Update the UI state
      setLastAppliedPreset(presetId);

      // Set the preset application state back to false after a delay
      setTimeout(() => {
        setPresetApplying(false);
      }, 600); // Slightly longer than the transition duration to ensure it completes
    } catch (error) {
      console.error(`Error applying preset: ${presetName}`, error);
      setPresetApplying(false);
    }
  };

  return (
    <SettingsGroup collapsible={false} header={false} grid>
      {presets.map((preset: ButtonSetting) => {
        const isLastApplied = lastAppliedPreset === preset.id;

        return (
          <CardButton
            key={preset.id}
            label={preset.label}
            onClick={() => handlePresetClick(preset.id)}
            isActive={isLastApplied}
          />
        );
      })}
    </SettingsGroup>
  );
};

export default PresetPanel;
