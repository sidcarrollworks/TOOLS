import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import type { PresetInfo } from "../facade/types";

/**
 * Preset interface
 */
export interface Preset {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Description (optional)
   */
  description?: string;

  /**
   * Thumbnail image URL or data URI (optional)
   */
  thumbnail?: string;

  /**
   * Parameters for this preset
   */
  parameters: Record<string, any>;

  /**
   * Creation timestamp
   */
  dateCreated: number;

  /**
   * Last modified timestamp
   */
  dateModified: number;

  /**
   * Is this a favorite preset
   */
  isFavorite?: boolean;

  /**
   * Is this a built-in preset
   */
  isBuiltIn?: boolean;

  /**
   * Tags for filtering/categorization
   */
  tags?: string[];
}

/**
 * Preset state interface
 */
export interface PresetState {
  /**
   * All available presets
   */
  presets: Record<string, Preset>;

  /**
   * Currently applied preset ID
   */
  currentPresetId: string | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Saving state
   */
  isSaving: boolean;

  /**
   * Error message, if any
   */
  errorMessage: string | null;

  /**
   * Is the current state modified from the preset?
   */
  isModified: boolean;
}

/**
 * Store for preset management
 */
export class PresetStore extends StoreBase<PresetState> {
  /**
   * Timeout for auto-save
   */
  private autoSaveTimeout: number | null = null;

  /**
   * Create a new preset store
   */
  constructor() {
    super(
      {
        // Initial preset state
        presets: {},
        currentPresetId: null,
        isLoading: false,
        isSaving: false,
        errorMessage: null,
        isModified: false,
      },
      { name: "PresetStore", debug: false }
    );

    // Load presets when facade is available
    this.initializePresetsFromFacade();
  }

  /**
   * Initialize presets from the facade
   */
  private initializePresetsFromFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) return;

    this.set("isLoading", true);

    try {
      // Get available presets from the facade
      const availablePresets = facade.getAvailablePresets() || [];

      // Convert to the format we need
      const presetMap: Record<string, Preset> = {};

      availablePresets.forEach((presetInfo: PresetInfo) => {
        const id = `preset-${presetInfo.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`;

        presetMap[id] = {
          id,
          name: presetInfo.name,
          description: presetInfo.description,
          thumbnail: presetInfo.thumbnailUrl,
          isBuiltIn: presetInfo.isBuiltIn,
          parameters: {}, // We'll populate this when the preset is applied
          dateCreated: presetInfo.timestamp || Date.now(),
          dateModified: presetInfo.timestamp || Date.now(),
        };
      });

      // Try to load any user presets
      try {
        const userPresetsString = localStorage.getItem("user-presets");
        if (userPresetsString) {
          const userPresets = JSON.parse(userPresetsString) as Record<
            string,
            Preset
          >;

          // Merge with built-in presets
          Object.assign(presetMap, userPresets);
        }
      } catch (err) {
        console.error("Failed to load user presets:", err);
        getUIStore().showToast("Failed to load user presets", "warning");
      }

      // Update the store
      this.set("presets", presetMap);
      this.set("isLoading", false);
    } catch (error) {
      console.error("Failed to load presets:", error);
      this.set("errorMessage", "Failed to load presets");
      this.set("isLoading", false);
      getUIStore().showToast("Failed to load presets", "error");
    }
  }

  /**
   * Apply a preset by ID
   */
  public applyPreset(presetId: string): boolean {
    const preset = this.get("presets")[presetId];
    if (!preset) {
      this.set("errorMessage", `Preset "${presetId}" not found`);
      getUIStore().showToast(`Preset not found`, "error");
      return false;
    }

    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Facade not available");
      getUIStore().showToast(
        "Cannot apply preset: Application not ready",
        "error"
      );
      return false;
    }

    try {
      // Use the facade's applyPreset method
      const success = facade.applyPreset(preset.name);

      if (success) {
        // Now that it's applied, save the current parameters to our preset
        const currentParams = facade.getAllParams();
        preset.parameters = { ...currentParams };
        preset.dateModified = Date.now();

        // Update the preset in our store
        const updatedPresets = {
          ...this.get("presets"),
          [presetId]: preset,
        };

        this.setState({
          presets: updatedPresets,
          currentPresetId: presetId,
          isModified: false,
        });

        getUIStore().showToast(`Applied preset: ${preset.name}`, "success");
        return true;
      }

      // If applying the preset failed
      this.set("errorMessage", `Failed to apply preset: ${preset.name}`);
      getUIStore().showToast(`Failed to apply preset: ${preset.name}`, "error");
      return false;
    } catch (error) {
      console.error("Failed to apply preset:", error);
      this.set("errorMessage", "Failed to apply preset");
      getUIStore().showToast("Failed to apply preset", "error");
      return false;
    }
  }

  /**
   * Save current parameters as a new preset
   */
  public saveAsNewPreset(
    name: string,
    description?: string,
    tags?: string[]
  ): string | null {
    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Facade not available");
      getUIStore().showToast(
        "Cannot save preset: Application not ready",
        "error"
      );
      return null;
    }

    try {
      this.set("isSaving", true);

      // Generate a unique ID
      const id = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // Use facade savePreset method to save the preset
      const success = facade.savePreset({
        name,
        description,
        includeCamera: true,
        overwrite: false,
      });

      if (!success) {
        this.setState({
          errorMessage: "Failed to save preset to application",
          isSaving: false,
        });
        getUIStore().showToast("Failed to save preset", "error");
        return null;
      }

      // Get current parameters
      const parameters = facade.getAllParams();

      // Create the preset
      const preset: Preset = {
        id,
        name,
        description,
        tags,
        parameters,
        dateCreated: Date.now(),
        dateModified: Date.now(),
        isBuiltIn: false,
      };

      // Add to our presets
      const updatedPresets = {
        ...this.get("presets"),
        [id]: preset,
      };

      this.setState({
        presets: updatedPresets,
        currentPresetId: id,
        isSaving: false,
        isModified: false,
      });

      // Save to localStorage
      this.saveUserPresetsToStorage();

      getUIStore().showToast(`Saved preset: ${name}`, "success");
      return id;
    } catch (error) {
      console.error("Failed to save preset:", error);
      this.setState({
        errorMessage: "Failed to save preset",
        isSaving: false,
      });
      getUIStore().showToast("Failed to save preset", "error");
      return null;
    }
  }

  /**
   * Update an existing preset with current parameters
   */
  public updatePreset(presetId: string): boolean {
    const preset = this.get("presets")[presetId];
    if (!preset) {
      this.set("errorMessage", `Preset "${presetId}" not found`);
      getUIStore().showToast(`Preset not found`, "error");
      return false;
    }

    // Don't allow updating built-in presets
    if (preset.isBuiltIn) {
      this.set("errorMessage", "Cannot update built-in presets");
      getUIStore().showToast("Cannot update built-in presets", "warning");
      return false;
    }

    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Facade not available");
      getUIStore().showToast(
        "Cannot update preset: Application not ready",
        "error"
      );
      return false;
    }

    try {
      this.set("isSaving", true);

      // Use facade savePreset with overwrite option
      const success = facade.savePreset({
        name: preset.name,
        description: preset.description,
        includeCamera: true,
        overwrite: true,
      });

      if (!success) {
        this.setState({
          errorMessage: "Failed to update preset in application",
          isSaving: false,
        });
        getUIStore().showToast("Failed to update preset", "error");
        return false;
      }

      // Get current parameters
      const parameters = facade.getAllParams();

      // Update the preset
      const updatedPreset: Preset = {
        ...preset,
        parameters,
        dateModified: Date.now(),
      };

      // Update in our presets
      const updatedPresets = {
        ...this.get("presets"),
        [presetId]: updatedPreset,
      };

      this.setState({
        presets: updatedPresets,
        isSaving: false,
        isModified: false,
      });

      // Save to localStorage
      this.saveUserPresetsToStorage();

      getUIStore().showToast(`Updated preset: ${preset.name}`, "success");
      return true;
    } catch (error) {
      console.error("Failed to update preset:", error);
      this.setState({
        errorMessage: "Failed to update preset",
        isSaving: false,
      });
      getUIStore().showToast("Failed to update preset", "error");
      return false;
    }
  }

  /**
   * Delete a preset
   */
  public deletePreset(presetId: string): boolean {
    const preset = this.get("presets")[presetId];
    if (!preset) {
      this.set("errorMessage", `Preset "${presetId}" not found`);
      getUIStore().showToast(`Preset not found`, "error");
      return false;
    }

    // Don't allow deleting built-in presets
    if (preset.isBuiltIn) {
      this.set("errorMessage", "Cannot delete built-in presets");
      getUIStore().showToast("Cannot delete built-in presets", "warning");
      return false;
    }

    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Facade not available");
      getUIStore().showToast(
        "Cannot delete preset: Application not ready",
        "error"
      );
      return false;
    }

    try {
      // Use facade deletePreset method
      const success = facade.deletePreset(preset.name);

      if (!success) {
        this.set("errorMessage", `Failed to delete preset from application`);
        getUIStore().showToast("Failed to delete preset", "error");
        return false;
      }

      // Create a copy of the presets and delete the specified one
      const updatedPresets = { ...this.get("presets") };
      delete updatedPresets[presetId];

      // Update state
      this.setState({
        presets: updatedPresets,
        currentPresetId:
          this.get("currentPresetId") === presetId
            ? null
            : this.get("currentPresetId"),
      });

      // Save to localStorage
      this.saveUserPresetsToStorage();

      getUIStore().showToast(`Deleted preset: ${preset.name}`, "success");
      return true;
    } catch (error) {
      console.error("Failed to delete preset:", error);
      this.set("errorMessage", "Failed to delete preset");
      getUIStore().showToast("Failed to delete preset", "error");
      return false;
    }
  }

  /**
   * Mark a preset as favorite/unfavorite
   */
  public toggleFavorite(presetId: string): boolean {
    const preset = this.get("presets")[presetId];
    if (!preset) {
      this.set("errorMessage", `Preset "${presetId}" not found`);
      getUIStore().showToast(`Preset not found`, "error");
      return false;
    }

    try {
      // Toggle the favorite status
      const updatedPreset: Preset = {
        ...preset,
        isFavorite: !preset.isFavorite,
        dateModified: Date.now(),
      };

      // Update in our presets
      const updatedPresets = {
        ...this.get("presets"),
        [presetId]: updatedPreset,
      };

      this.set("presets", updatedPresets);

      // Save to localStorage if it's a user preset
      if (!preset.isBuiltIn) {
        this.saveUserPresetsToStorage();
      }

      const action = updatedPreset.isFavorite ? "Added to" : "Removed from";
      getUIStore().showToast(`${action} favorites: ${preset.name}`, "info");
      return true;
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      this.set("errorMessage", "Failed to update favorite status");
      getUIStore().showToast("Failed to update favorite status", "error");
      return false;
    }
  }

  /**
   * Export a preset as JSON
   */
  public exportPreset(presetId: string): string | null {
    const preset = this.get("presets")[presetId];
    if (!preset) {
      this.set("errorMessage", `Preset "${presetId}" not found`);
      getUIStore().showToast(`Preset not found`, "error");
      return null;
    }

    try {
      // Create a copy without internal implementation details
      const exportPreset = {
        name: preset.name,
        description: preset.description,
        parameters: preset.parameters,
        tags: preset.tags,
        dateCreated: preset.dateCreated,
        dateModified: preset.dateModified,
      };

      return JSON.stringify(exportPreset, null, 2);
    } catch (error) {
      console.error("Failed to export preset:", error);
      this.set("errorMessage", "Failed to export preset");
      getUIStore().showToast("Failed to export preset", "error");
      return null;
    }
  }

  /**
   * Import a preset from JSON
   */
  public importPreset(presetJson: string): string | null {
    try {
      // Parse the JSON
      const importedData = JSON.parse(presetJson);

      // Validate required fields
      if (!importedData.name || !importedData.parameters) {
        this.set("errorMessage", "Invalid preset format");
        getUIStore().showToast("Invalid preset format", "error");
        return null;
      }

      // Generate a unique ID
      const id = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // Create the preset
      const preset: Preset = {
        id,
        name: importedData.name,
        description: importedData.description,
        parameters: importedData.parameters,
        tags: importedData.tags || [],
        dateCreated: importedData.dateCreated || Date.now(),
        dateModified: importedData.dateModified || Date.now(),
        isBuiltIn: false,
      };

      // Add to our presets
      const updatedPresets = {
        ...this.get("presets"),
        [id]: preset,
      };

      this.set("presets", updatedPresets);

      // Save to localStorage
      this.saveUserPresetsToStorage();

      getUIStore().showToast(`Imported preset: ${preset.name}`, "success");
      return id;
    } catch (error) {
      console.error("Failed to import preset:", error);
      this.set("errorMessage", "Failed to import preset");
      getUIStore().showToast("Failed to import preset", "error");
      return null;
    }
  }

  /**
   * Mark the current state as modified from the preset
   */
  public markAsModified(): void {
    if (!this.get("isModified")) {
      this.set("isModified", true);
    }
  }

  /**
   * Save user presets to localStorage
   */
  private saveUserPresetsToStorage(): void {
    try {
      // Filter out just the user presets
      const userPresets = Object.values(this.get("presets"))
        .filter((preset) => !preset.isBuiltIn)
        .reduce((acc, preset) => {
          acc[preset.id] = preset;
          return acc;
        }, {} as Record<string, Preset>);

      // Save to localStorage
      localStorage.setItem("user-presets", JSON.stringify(userPresets));
    } catch (error) {
      console.error("Failed to save presets to storage:", error);
      getUIStore().showToast("Failed to save presets to storage", "error");
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clear any timeouts
    if (this.autoSaveTimeout !== null) {
      window.clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
  }
}

// Singleton instance
let presetStore: PresetStore | null = null;

/**
 * Get the preset store instance
 */
export function getPresetStore(): PresetStore {
  if (!presetStore) {
    presetStore = new PresetStore();
  }
  return presetStore;
}
