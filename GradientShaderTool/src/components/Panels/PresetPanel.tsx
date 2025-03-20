import type { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { CardButton } from "../UI/CardButton";
import { useComputed } from "@preact/signals";
import { setPresetApplying } from "../FigmaInput/FigmaInput";
import { SettingsGroup } from "../UI/SettingsGroup/SettingsGroup";
import { getPresetStore } from "../../lib/stores/PresetStore";
import type { Preset } from "../../lib/stores/PresetStore";
import { facadeSignal } from "../../app";
import { initializeSettingsFromShaderApp } from "../../lib/settings/initApp";

// Map of PresetStore preset IDs to facade preset names
const presetIdToFacadeName = new Map<string, string>([
  ["preset-default", "Default"],
  ["preset-ocean-waves", "Ocean Waves"],
  ["preset-lava-flow", "Lava Flow"],
  ["preset-abstract-art", "Abstract Art"],
]);

interface PresetPanelProps {
  // No props needed for now
}

export const PresetPanel: FunctionComponent<PresetPanelProps> = () => {
  // State for tracking the last applied preset
  const [lastAppliedPreset, setLastAppliedPreset] = useState<string | null>(
    null
  );
  const [presets, setPresets] = useState<Preset[]>([]);

  // Get the facade
  const facade = useComputed(() => facadeSignal.value);

  // Get the preset store
  const presetStore = getPresetStore();

  // Load presets from the store
  useEffect(() => {
    // Update local state from store
    const updatePresetsFromStore = () => {
      const state = presetStore.getState();

      // Convert presets record to array and sort by name
      const presetsArray = Object.values(state.presets).sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );

      setPresets(presetsArray as Preset[]);

      // Update last applied preset if there's a current preset
      if (state.currentPresetId !== null) {
        setLastAppliedPreset(state.currentPresetId);
      }
    };

    // Initial sync
    updatePresetsFromStore();

    // Subscribe to store changes
    const storeSignal = presetStore.getSignal();
    const unsubscribe = storeSignal.subscribe(updatePresetsFromStore);

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle preset click
  const handlePresetClick = (presetId: string) => {
    console.log(`Applying preset: ${presetId}`);

    // Set the preset application state to true before applying the preset
    setPresetApplying(true);

    try {
      // Get the facade preset name
      const facadePresetName = presetIdToFacadeName.get(presetId);

      if (!facadePresetName) {
        console.error(`Mapping not found for preset ID: ${presetId}`);
        setPresetApplying(false);
        return;
      }

      if (!facade.value) {
        console.error("Facade not available");
        setPresetApplying(false);
        return;
      }

      // Apply the preset directly using the facade for consistent behavior
      const success = facade.value.applyPreset(facadePresetName);

      if (success) {
        console.log(`Applied preset: ${facadePresetName}`);

        // Sync the facade parameters back to the settings store
        initializeSettingsFromShaderApp(facade.value);

        // Update the UI state
        setLastAppliedPreset(presetId);

        // Mark the preset as the current preset in the store
        presetStore.setState({
          currentPresetId: presetId,
          isModified: false,
        });
      } else {
        console.error(`Failed to apply preset: ${facadePresetName}`);
      }

      // Set the preset application state back to false after a delay
      setTimeout(() => {
        setPresetApplying(false);
      }, 600); // Slightly longer than the transition duration
    } catch (error) {
      console.error(`Error applying preset: ${presetId}`, error);
      setPresetApplying(false);
    }
  };

  // If no presets are available, show a placeholder
  if (presets.length === 0) {
    return <div className="noPresets">No presets available</div>;
  }

  // Render the preset buttons
  return (
    <SettingsGroup collapsible={false} header={false} grid>
      {presets.map((preset) => {
        const isLastApplied = lastAppliedPreset === preset.id;

        return (
          <CardButton
            key={preset.id}
            label={preset.name}
            onClick={() => handlePresetClick(preset.id)}
            isActive={isLastApplied}
          />
        );
      })}
    </SettingsGroup>
  );
};

export default PresetPanel;
