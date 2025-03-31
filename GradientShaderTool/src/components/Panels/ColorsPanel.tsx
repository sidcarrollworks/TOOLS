import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";

import Select from "../UI/Select";
import { ScrubInput } from "../ScrubInput";
import { DirectionControl } from "../DirectionControl";
import { Checkbox, ColorInput } from "../UI";
import { SettingsField, SettingsGroup } from "../UI/SettingsGroup";
import { getUIStore } from "../../lib/stores/UIStore";
import {
  getColorInitializer,
  getColorParameter,
  type ColorParameters,
} from "../../lib/stores/ColorInitializer";
import { useSignalValue } from "../../lib/hooks/useSignals";
import { facadeSignal } from "../../app";
import { MAX_COLOR_STOPS } from "../../lib/types/ColorStop";
import { GradientBar } from "../GradientBar/GradientBar";

interface ColorsPanelProps {
  // No props needed for now
}

/**
 * Color gradient mode options
 */
const GRADIENT_MODE_OPTIONS = [
  { label: "B-Spline", value: 0 },
  { label: "Linear", value: 1 },
  { label: "Step", value: 2 },
  { label: "Smooth Step", value: 3 },
];

export const ColorsPanel: FunctionComponent<ColorsPanelProps> = () => {
  // Get the initializer
  const colorInitializer = getColorInitializer();
  const uiStore = getUIStore();

  // Local state for immediate UI updates
  const [colorState, setColorState] = useState<ColorParameters>({
    gradientMode: 0,
    gradientShiftX: 0,
    gradientShiftY: 0,
    gradientShiftSpeed: 0,

    colorStops: [
      { position: 0.0, color: "#ff0000" },
      { position: 0.33, color: "#00ff00" },
      { position: 0.66, color: "#0000ff" },
      { position: 1.0, color: "#ffff00" },
    ],

    colorNoiseScale: 1.0,
    colorNoiseSpeed: 0.1,

    backgroundColor: "#000000",
    transparentBackground: false,
  });

  // Synchronize local state with initializer on initialization and when panel is opened
  useEffect(() => {
    // Force ColorInitializer to sync with facade
    colorInitializer.syncWithFacade();

    // Get transparency setting from ExportInitializer to ensure consistency
    const getTransparencyFromExport = async () => {
      try {
        const { getExportInitializer } = await import(
          "../../lib/stores/ExportInitializer"
        );
        const exportInitializer = getExportInitializer();
        const transparentValue =
          !!exportInitializer.getSignal("transparent").value;

        // Update local state with the export value
        setColorState((current) => ({
          ...current,
          transparentBackground: transparentValue,
        }));

        // Also update the ColorInitializer to keep them in sync
        colorInitializer.updateParameter(
          "transparentBackground",
          transparentValue
        );
      } catch (error) {
        console.error(
          "Could not get transparency setting from ExportInitializer:",
          error
        );
      }
    };

    // Call the function to get transparency
    getTransparencyFromExport();

    // First, try to get colors directly from facade for immediate accurate values
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      // Get all needed parameters directly from facade
      try {
        const updatedState: ColorParameters = {
          gradientMode: facade.getParam("gradientMode"),
          gradientShiftX: facade.getParam("gradientShiftX"),
          gradientShiftY: facade.getParam("gradientShiftY"),
          gradientShiftSpeed: facade.getParam("gradientShiftSpeed"),

          // Get color stops from initializer since they're not directly in facade
          colorStops: colorInitializer.getSignal("colorStops").value,

          colorNoiseScale: facade.getParam("colorNoiseScale"),
          colorNoiseSpeed: facade.getParam("colorNoiseSpeed"),

          backgroundColor: facade.getParam("backgroundColor"),
          transparentBackground: colorState.transparentBackground,
        };

        // Set color state directly from facade
        setColorState(updatedState);
      } catch (error) {
        console.error("ColorsPanel: Error loading from facade:", error);
      }
    }

    // Also sync with initializer as a fallback
    syncWithInitializer();

    // Set up polling interval to keep UI updated with any external changes
    const intervalId = setInterval(() => {
      syncWithInitializer();
    }, 500);

    // Set up facade event listener for preset changes
    if (facade) {
      const handlePresetApplied = () => {
        // Force sync with facade
        colorInitializer.syncWithFacade();

        // Force update local state with facade values
        syncWithInitializer();
      };

      facade.on("preset-applied", handlePresetApplied);

      return () => {
        clearInterval(intervalId);
        facade.off("preset-applied", handlePresetApplied);
      };
    }

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Function to sync local state from the initializer
  const syncWithInitializer = () => {
    const newState: ColorParameters = {
      gradientMode: colorInitializer.getSignal("gradientMode").value,
      gradientShiftX: colorInitializer.getSignal("gradientShiftX").value,
      gradientShiftY: colorInitializer.getSignal("gradientShiftY").value,
      gradientShiftSpeed:
        colorInitializer.getSignal("gradientShiftSpeed").value,
      colorStops: colorInitializer.getSignal("colorStops").value,
      colorNoiseScale: colorInitializer.getSignal("colorNoiseScale").value,
      colorNoiseSpeed: colorInitializer.getSignal("colorNoiseSpeed").value,
      backgroundColor: colorInitializer.getSignal("backgroundColor").value,
      transparentBackground: colorInitializer.getSignal("transparentBackground")
        .value,
    };

    setColorState(newState);
  };

  // Handle gradient mode change
  const handleGradientModeChange = (value: string) => {
    const numericValue = parseInt(value, 10);

    // Update local state immediately for UI responsiveness
    setColorState((prev) => ({
      ...prev,
      gradientMode: numericValue,
    }));

    // Update initializer
    colorInitializer.updateParameter("gradientMode", numericValue);
  };

  // Handle color stops change
  const handleColorStopsChange = (colorStops: typeof colorState.colorStops) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      colorStops,
    }));

    // Update initializer
    colorInitializer.updateParameter("colorStops", colorStops);
  };

  // Handle color noise changes
  const handleColorNoiseScaleChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      colorNoiseScale: value,
    }));

    // Update initializer
    colorInitializer.updateParameter("colorNoiseScale", value);
  };

  const handleColorNoiseSpeedChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      colorNoiseSpeed: value,
    }));

    // Update initializer
    colorInitializer.updateParameter("colorNoiseSpeed", value);
  };

  // Handle gradient shift changes
  const handleGradientShiftXChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      gradientShiftX: value,
    }));

    // Update initializer
    colorInitializer.updateParameter("gradientShiftX", value);
  };

  const handleGradientShiftYChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      gradientShiftY: value,
    }));

    // Update initializer
    colorInitializer.updateParameter("gradientShiftY", value);
  };

  const handleGradientShiftSpeedChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      gradientShiftSpeed: value,
    }));

    // Update initializer
    colorInitializer.updateParameter("gradientShiftSpeed", value);
  };

  // Handle background color change
  const handleBackgroundColorChange = (value: string) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      backgroundColor: value,
    }));

    // Update initializer
    colorInitializer.updateParameter("backgroundColor", value);
  };

  // Handle transparent background toggle with cross-component sync
  const handleTransparentBackgroundChange = (checked: boolean) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      transparentBackground: checked,
    }));

    // Update both color initializer and export store
    colorInitializer.updateTransparentBackground(checked, "color");
  };

  // Handle reset button click
  const handleReset = () => {
    // Reset all color parameters
    colorInitializer.reset();
    // Sync local state after reset
    syncWithInitializer();
    uiStore.showToast("Color settings reset to defaults", "success");
  };

  // Get the label for the current gradient mode
  const getGradientModeLabel = () => {
    const option = GRADIENT_MODE_OPTIONS.find(
      (opt) => opt.value === colorState.gradientMode
    );
    return option ? option.label : "Unknown";
  };

  return (
    <>
      {/* Gradient Mode and Gradient Bar */}
      <SettingsGroup title="Gradient" header={false} collapsible={false}>
        <SettingsField label="Mode">
          <Select.Root
            value={colorState.gradientMode.toString()}
            onValueChange={handleGradientModeChange}
          >
            <Select.Trigger>{getGradientModeLabel()}</Select.Trigger>
            <Select.Content>
              {GRADIENT_MODE_OPTIONS.map((option) => (
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

        <GradientBar
          colorStops={colorState.colorStops}
          onChange={handleColorStopsChange}
          maxStops={MAX_COLOR_STOPS}
          gradientMode={colorState.gradientMode}
        />
      </SettingsGroup>

      {/* Color Noise Settings */}
      <SettingsGroup title="Color Noise" collapsible={false} header={false}>
        <SettingsField label="Scale" labelDir="row">
          <ScrubInput
            value={colorState.colorNoiseScale}
            min={0}
            max={10}
            step={0.1}
            onChange={handleColorNoiseScaleChange}
          />
        </SettingsField>

        <SettingsField label="Speed" labelDir="row">
          <ScrubInput
            value={colorState.colorNoiseSpeed}
            min={0}
            max={1}
            step={0.01}
            onChange={handleColorNoiseSpeedChange}
          />
        </SettingsField>

        <DirectionControl
          valueX={colorState.gradientShiftX}
          valueY={colorState.gradientShiftY}
          speed={colorState.gradientShiftSpeed}
          minSpeed={0}
          maxSpeed={0.5}
          step={0.01}
          onChangeX={handleGradientShiftXChange}
          onChangeY={handleGradientShiftYChange}
          onChangeSpeed={handleGradientShiftSpeedChange}
        />
      </SettingsGroup>

      {/* Background Settings */}
      <SettingsGroup title="Background" collapsible={false} header={false}>
        <SettingsField label="Transparent">
          <Checkbox
            checked={colorState.transparentBackground}
            onChange={handleTransparentBackgroundChange}
          />
        </SettingsField>
        <SettingsField
          label="Color"
          disabled={colorState.transparentBackground}
        >
          <ColorInput
            value={colorState.backgroundColor}
            onChange={handleBackgroundColorChange}
            debounce={5}
          />
        </SettingsField>
      </SettingsGroup>
    </>
  );
};

export default ColorsPanel;
