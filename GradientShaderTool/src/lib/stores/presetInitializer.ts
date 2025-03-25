import { getPresetStore } from "./PresetStore";
import type { Preset } from "./PresetStore";
import { facadeSignal } from "../../app";

/**
 * Initialize the PresetStore with the default presets
 * This ensures the PresetStore has the same presets as the old panel settings approach
 */
export function initializePresetStore(): void {
  const presetStore = getPresetStore();
  const facade = facadeSignal.value;

  if (!facade) {
    console.error("Cannot initialize preset store: Facade not available");
    return;
  }

  // Default presets from our application
  const defaultPresets: Preset[] = [
    {
      id: "preset-default",
      name: "Milky",
      description: "Reset to default settings",
      isBuiltIn: true,
      parameters: {},
      dateCreated: Date.now(),
      dateModified: Date.now(),
    },
    {
      id: "preset-ocean-waves",
      name: "Ocean Waves",
      description: "Apply ocean waves preset",
      isBuiltIn: true,
      parameters: {},
      dateCreated: Date.now(),
      dateModified: Date.now(),
    },
    {
      id: "preset-lava-flow",
      name: "Lava Flow",
      description: "Apply lava flow preset",
      isBuiltIn: true,
      parameters: {},
      dateCreated: Date.now(),
      dateModified: Date.now(),
    },
    {
      id: "preset-abstract-art",
      name: "Abstract Art",
      description: "Apply abstract art preset",
      isBuiltIn: true,
      parameters: {},
      dateCreated: Date.now(),
      dateModified: Date.now(),
    },
  ];

  // Get current presets from the store (if any)
  const currentState = presetStore.getState();
  const currentPresets = currentState.presets;

  // Create a new preset map with our defaults
  const presetMap: Record<string, Preset> = {};

  // Add each preset to the map
  defaultPresets.forEach((preset) => {
    presetMap[preset.id] = preset;
  });

  // Merge with any existing presets
  Object.assign(presetMap, currentPresets);

  // Update the store with our presets
  presetStore.setState({
    presets: presetMap,
    isLoading: false,
    errorMessage: null,
  });

  console.log(
    `PresetStore initialized with ${Object.keys(presetMap).length} presets`
  );
}
