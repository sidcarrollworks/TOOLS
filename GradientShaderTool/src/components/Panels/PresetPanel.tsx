import type { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { CardButton } from "../UI/CardButton";
import { useComputed } from "@preact/signals";

import { SettingsGroup } from "../UI/SettingsGroup/SettingsGroup";
import { getPresetStore } from "../../lib/stores/PresetStore";
import type { Preset } from "../../lib/stores/PresetStore";
import { facadeSignal } from "../../app";
import { initializeSettingsFromShaderApp } from "../../lib/settings/initApp";
import { getColorInitializer } from "../../lib/stores/ColorInitializer";
import { getDistortionInitializer } from "../../lib/stores/DistortionInitializer";

// Import preset images
import abstractImage from "../../assets/presetImages/abstract.png";
import lavaImage from "../../assets/presetImages/lava.png";
import oceanwavesImage from "../../assets/presetImages/oceanwaves.png";
import sourcemilkImage from "../../assets/presetImages/sourcemilk.png";

// Mapping from preset ID to facade preset name
const presetIdToFacadeName = new Map<string, string>([
  ["preset-default", "Default"],
  ["preset-ocean-waves", "Ocean Waves"],
  ["preset-lava-flow", "Lava Flow"],
  ["preset-abstract-art", "Abstract Art"],
]);

// Mapping from preset ID to image
const presetIdToImage = new Map<string, string>([
  ["preset-ocean-waves", oceanwavesImage],
  ["preset-lava-flow", lavaImage],
  ["preset-abstract-art", abstractImage],
  ["preset-default", sourcemilkImage],
]);

// Function to get preset name for a given ID
const getPresetNameForId = (id: string): string | undefined => {
  return presetIdToFacadeName.get(id);
};

// Function to get preset image for a given ID
const getPresetImageForId = (id: string): string | undefined => {
  return presetIdToImage.get(id);
};

// Preload all preset images
const preloadImages = () => {
  return new Promise<void>((resolve) => {
    const imageUrls = Array.from(presetIdToImage.values());
    let loadedCount = 0;

    if (imageUrls.length === 0) {
      resolve();
      return;
    }

    imageUrls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          resolve();
        }
      };
      img.src = url;
    });
  });
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
  const [isLoading, setIsLoading] = useState(true);

  // Get the facade
  const facade = useComputed(() => facadeSignal.value);

  // Get the preset store
  const presetStore = getPresetStore();

  // Preload images and data when component mounts
  useEffect(() => {
    const initializePanel = async () => {
      // Preload all images first
      await preloadImages();

      // Then update the store state
      const state = presetStore.getState();
      const presetsArray = Object.values(state.presets).sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );

      setPresets(presetsArray as Preset[]);

      if (state.currentPresetId !== null) {
        setLastAppliedPreset(state.currentPresetId);
      }

      // Only mark as loaded after everything is ready
      setIsLoading(false);
    };

    initializePanel();

    // Subscribe to store changes, but only after initial load
    const storeSignal = presetStore.getSignal();
    const unsubscribe = storeSignal.subscribe(() => {
      if (!isLoading) {
        const state = presetStore.getState();
        const presetsArray = Object.values(state.presets).sort(
          (a: any, b: any) => a.name.localeCompare(b.name)
        );

        setPresets(presetsArray as Preset[]);

        if (state.currentPresetId !== null) {
          setLastAppliedPreset(state.currentPresetId);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle preset select
  const handlePresetSelect = (id: string) => {
    const presetName = getPresetNameForId(id);
    if (!presetName) {
      console.error(`PresetPanel: No preset name found for ID: ${id}`);
      return;
    }

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
      } finally {
        // Always reset preset applying flag when done
        // setPresetApplying(false);
      }
    } else {
      console.error("PresetPanel: Facade not available for preset application");
      // setPresetApplying(false);
    }
  };

  // If still loading, show a placeholder with fixed dimensions
  if (isLoading) {
    return (
      <div style={{ minHeight: "200px", width: "100%" }}>
        {/* Empty placeholder with height to prevent layout shift */}
      </div>
    );
  }

  // If no presets are available, show a placeholder
  if (presets.length === 0) {
    return <div className="noPresets">No presets available</div>;
  }

  // Render the preset buttons
  return (
    <SettingsGroup collapsible={false} header={false} grid>
      {presets.map((preset) => {
        const isLastApplied = lastAppliedPreset === preset.id;
        const presetImage = getPresetImageForId(preset.id);

        return (
          <CardButton
            key={preset.id}
            label={preset.name}
            onClick={() => handlePresetSelect(preset.id)}
            isActive={isLastApplied}
            image={presetImage}
          />
        );
      })}
    </SettingsGroup>
  );
};

export default PresetPanel;
