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
import { getColorInitializer } from "../../lib/stores/ColorInitializer";
import { getDistortionInitializer } from "../../lib/stores/DistortionInitializer";

// Mapping from preset ID to facade preset name
const presetIdToFacadeName = new Map<string, string>([
  ["preset-default", "Default"],
  ["preset-ocean-waves", "Ocean Waves"],
  ["preset-lava-flow", "Lava Flow"],
  ["preset-abstract-art", "Abstract Art"],
]);

// Function to get preset name for a given ID
const getPresetNameForId = (id: string): string | undefined => {
  return presetIdToFacadeName.get(id);
};

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

  // Handle preset select
  const handlePresetSelect = (id: string) => {
    console.log(`PresetPanel: Selected preset with ID: ${id}`);

    const presetName = getPresetNameForId(id);
    if (!presetName) {
      console.error(`PresetPanel: No preset name found for ID: ${id}`);
      return;
    }

    console.log(`PresetPanel: Applying preset: ${presetName}`);

    // Indicate that a preset is being applied (used by some components to avoid updates)
    setPresetApplying(true);

    // Update the facade with the selected preset
    const facade = facadeSignal.value;
    if (facade) {
      try {
        // Apply the preset
        facade.applyPreset(presetName);

        // Set current preset in store
        setLastAppliedPreset(id);
        presetStore.setState({
          currentPresetId: id,
          isModified: false,
        });

        console.log(`PresetPanel: Preset applied: ${presetName}`);

        // Force synchronize ALL initializers with facade
        // This ensures all panels get updated properly, even if they're not currently visible
        console.log(
          `PresetPanel: Forcing initializer synchronization after preset`
        );

        // Get the current parameters from facade for debugging
        const currentParams = {
          color1: facade.getParam("color1"),
          color2: facade.getParam("color2"),
          color3: facade.getParam("color3"),
          color4: facade.getParam("color4"),
          gradientMode: facade.getParam("gradientMode"),
        };
        console.log(`PresetPanel: Current facade color values:`, currentParams);

        // Sync ColorInitializer explicitly (even if ColorsPanel isn't visible)
        const colorInitializer = getColorInitializer();
        colorInitializer.syncWithFacade();

        // Sync DistortionInitializer explicitly
        const distortionInitializer = getDistortionInitializer();
        distortionInitializer.syncWithFacade();

        // Re-emit the preset-applied event in case any components missed it
        facade.emit("preset-applied", {
          presetName,
          affectedParams: Object.keys(facade.getAllParams()),
        });

        // Log signal values after sync for debugging
        const colorSignals = {
          color1: colorInitializer.getSignal("color1").value,
          color2: colorInitializer.getSignal("color2").value,
          color3: colorInitializer.getSignal("color3").value,
          color4: colorInitializer.getSignal("color4").value,
        };
        console.log(
          `PresetPanel: Color signals after forced sync:`,
          colorSignals
        );
      } finally {
        // Always reset preset applying flag when done
        setPresetApplying(false);
      }
    } else {
      console.error("PresetPanel: Facade not available for preset application");
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
            onClick={() => handlePresetSelect(preset.id)}
            isActive={isLastApplied}
          />
        );
      })}
    </SettingsGroup>
  );
};

export default PresetPanel;
