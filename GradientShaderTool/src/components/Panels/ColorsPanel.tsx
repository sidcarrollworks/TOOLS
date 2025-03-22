import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";

import Select from "../UI/Select";
import { FigmaInput } from "../FigmaInput";
import { DirectionControl } from "../DirectionControl";
import { Checkbox, ColorInput } from "../UI";
import { SettingsField, SettingsGroup } from "../UI/SettingsGroup";
import { getUIStore } from "../../lib/stores/UIStore";
import { getExportStore } from "../../lib/stores/ExportStore";
import {
  getColorInitializer,
  getColorParameter,
} from "../../lib/stores/ColorInitializer";
import { useSignalValue } from "../../lib/hooks/useSignals";
import { facadeSignal } from "../../app";
import { getColorStore, type ColorState } from "../../lib/stores/ColorStore";

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
  // Get the stores and initializer
  const colorStore = getColorStore();
  const colorInitializer = getColorInitializer();
  const uiStore = getUIStore();
  const exportStore = getExportStore();

  // Local state for immediate UI updates
  const [colorState, setColorState] = useState<ColorState>({
    gradientMode: 0,
    gradientShiftX: 0,
    gradientShiftY: 0,
    gradientShiftSpeed: 0,

    color1: "#ffffff",
    color2: "#ffffff",
    color3: "#ffffff",
    color4: "#ffffff",

    colorNoiseScale: 1.0,
    colorNoiseSpeed: 0.1,

    backgroundColor: "#000000",
    transparentBackground: false,
  });

  // Synchronize local state with store on initialization and when panel is opened
  useEffect(() => {
    console.log("ColorsPanel: Initializing panel");

    // Force ColorInitializer to sync with facade
    colorInitializer.syncWithFacade();

    // First, try to get colors directly from facade for immediate accurate values
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      console.log("ColorsPanel: Loading values directly from facade");

      // Get all needed parameters directly from facade
      try {
        const updatedState: ColorState = {
          gradientMode: facade.getParam("gradientMode"),
          gradientShiftX: facade.getParam("gradientShiftX"),
          gradientShiftY: facade.getParam("gradientShiftY"),
          gradientShiftSpeed: facade.getParam("gradientShiftSpeed"),

          color1: facade.getParam("color1"),
          color2: facade.getParam("color2"),
          color3: facade.getParam("color3"),
          color4: facade.getParam("color4"),

          colorNoiseScale: facade.getParam("colorNoiseScale"),
          colorNoiseSpeed: facade.getParam("colorNoiseSpeed"),

          backgroundColor: facade.getParam("backgroundColor"),
          transparentBackground: facade.getParam("exportTransparentBg"),
        };

        // Set color state directly from facade
        setColorState(updatedState);
        console.log("ColorsPanel: Loaded facade values:", updatedState);
      } catch (error) {
        console.error("ColorsPanel: Error loading from facade:", error);
      }
    }

    // Also sync with store as a fallback
    syncWithStore();

    // Set up polling interval to keep UI updated with any external changes
    // (similar to CameraPanel approach)
    const intervalId = setInterval(() => {
      syncWithStore();
    }, 500);

    // Set up facade event listener for preset changes
    if (facade) {
      const handlePresetApplied = () => {
        console.log("ColorsPanel: Preset applied event detected");

        // Log current values in facade for debugging
        const currentFacadeValues = {
          color1: facade.getParam("color1"),
          color2: facade.getParam("color2"),
          color3: facade.getParam("color3"),
          color4: facade.getParam("color4"),
          gradientMode: facade.getParam("gradientMode"),
          gradientShiftX: facade.getParam("gradientShiftX"),
          gradientShiftY: facade.getParam("gradientShiftY"),
          gradientShiftSpeed: facade.getParam("gradientShiftSpeed"),
        };

        console.log(
          "ColorsPanel: Facade values before sync:",
          currentFacadeValues
        );

        // Force sync with facade
        colorInitializer.syncWithFacade();

        // Get current color parameter values directly from signals for debugging
        const signalValues = {
          color1: colorStore.color1.value,
          color2: colorStore.color2.value,
          color3: colorStore.color3.value,
          color4: colorStore.color4.value,
          gradientMode: colorStore.gradientMode.value,
        };

        console.log("ColorsPanel: Signal values after sync:", signalValues);

        // Direct update from facade
        const updatedState: ColorState = {
          gradientMode: facade.getParam("gradientMode"),
          gradientShiftX: facade.getParam("gradientShiftX"),
          gradientShiftY: facade.getParam("gradientShiftY"),
          gradientShiftSpeed: facade.getParam("gradientShiftSpeed"),

          color1: facade.getParam("color1"),
          color2: facade.getParam("color2"),
          color3: facade.getParam("color3"),
          color4: facade.getParam("color4"),

          colorNoiseScale: facade.getParam("colorNoiseScale"),
          colorNoiseSpeed: facade.getParam("colorNoiseSpeed"),

          backgroundColor: facade.getParam("backgroundColor"),
          transparentBackground: facade.getParam("exportTransparentBg"),
        };

        // Force update local state with facade values
        setColorState(updatedState);

        console.log(
          "ColorsPanel: Forced direct update from facade:",
          updatedState
        );
      };

      facade.on("preset-applied", handlePresetApplied);
      console.log("ColorsPanel: Registered preset-applied event listener");

      return () => {
        clearInterval(intervalId);
        facade.off("preset-applied", handlePresetApplied);
        console.log("ColorsPanel: Removed preset-applied event listener");
      };
    }

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Function to sync local state from the store
  const syncWithStore = () => {
    const storeState = colorStore.getColorState();

    // Debug for sync
    const oldColor1 = colorState.color1;
    const newColor1 = storeState.color1;

    if (oldColor1 !== newColor1) {
      console.log(
        `ColorPanel: Syncing color1 changed from ${oldColor1} to ${newColor1}`
      );
    }

    setColorState(storeState);
  };

  // Handle gradient mode change
  const handleGradientModeChange = (value: string) => {
    const numericValue = parseInt(value, 10);

    // Update local state immediately for UI responsiveness
    setColorState((prev) => ({
      ...prev,
      gradientMode: numericValue,
    }));

    // Update store/initializer
    colorStore.setColorParameter("gradientMode", numericValue);
  };

  // Handle color changes
  const handleColor1Change = (value: string) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      color1: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("color1", value);
  };

  const handleColor2Change = (value: string) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      color2: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("color2", value);
  };

  const handleColor3Change = (value: string) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      color3: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("color3", value);
  };

  const handleColor4Change = (value: string) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      color4: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("color4", value);
  };

  // Handle color noise changes
  const handleColorNoiseScaleChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      colorNoiseScale: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("colorNoiseScale", value);
  };

  const handleColorNoiseSpeedChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      colorNoiseSpeed: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("colorNoiseSpeed", value);
  };

  // Handle gradient shift changes
  const handleGradientShiftXChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      gradientShiftX: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("gradientShiftX", value);
  };

  const handleGradientShiftYChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      gradientShiftY: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("gradientShiftY", value);
  };

  const handleGradientShiftSpeedChange = (value: number) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      gradientShiftSpeed: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("gradientShiftSpeed", value);
  };

  // Handle background color change
  const handleBackgroundColorChange = (value: string) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      backgroundColor: value,
    }));

    // Update store/initializer
    colorStore.setColorParameter("backgroundColor", value);
  };

  // Handle transparent background toggle with cross-component sync
  const handleTransparentBackgroundChange = (checked: boolean) => {
    // Update local state immediately
    setColorState((prev) => ({
      ...prev,
      transparentBackground: checked,
    }));

    // Use initializer's specialized method for cross-component sync
    colorInitializer.updateTransparentBackground(checked);
  };

  // Handle reset button click
  const handleReset = () => {
    colorInitializer.reset();
    // Sync local state after reset
    syncWithStore();
    uiStore.showToast("Color settings reset to defaults", "success");
  };

  // Get the label for the current gradient mode
  const getGradientModeLabel = () => {
    const option = GRADIENT_MODE_OPTIONS.find(
      (opt) => opt.value === colorState.gradientMode
    );
    return option ? option.label : "Select mode";
  };

  return (
    <>
      {/* Gradient Mode Select */}
      <SettingsGroup title="Gradient" collapsible={false} header={false}>
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
      </SettingsGroup>

      {/* Colors */}
      <SettingsGroup title="Colors" collapsible={false} header={false}>
        <SettingsField label="Color 1">
          <ColorInput
            value={colorState.color1}
            onChange={handleColor1Change}
            debounce={5}
          />
        </SettingsField>

        <SettingsField label="Color 2">
          <ColorInput
            value={colorState.color2}
            onChange={handleColor2Change}
            debounce={5}
          />
        </SettingsField>

        <SettingsField label="Color 3">
          <ColorInput
            value={colorState.color3}
            onChange={handleColor3Change}
            debounce={5}
          />
        </SettingsField>

        <SettingsField label="Color 4">
          <ColorInput
            value={colorState.color4}
            onChange={handleColor4Change}
            debounce={5}
          />
        </SettingsField>
      </SettingsGroup>

      {/* Color Noise Settings */}
      <SettingsGroup title="Color Noise" collapsible={false} header={false}>
        <SettingsField label="Scale" labelDir="row">
          <FigmaInput
            value={colorState.colorNoiseScale}
            min={0}
            max={10}
            step={0.1}
            onChange={handleColorNoiseScaleChange}
          />
        </SettingsField>

        <SettingsField label="Speed" labelDir="row">
          <FigmaInput
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
          min={-1}
          max={1}
          minSpeed={0}
          maxSpeed={1}
          step={0.01}
          onChangeX={handleGradientShiftXChange}
          onChangeY={handleGradientShiftYChange}
          onChangeSpeed={handleGradientShiftSpeedChange}
        />
      </SettingsGroup>

      {/* Background Settings */}
      <SettingsGroup title="Background" collapsible={false} header={false}>
        <SettingsField label="Color">
          <ColorInput
            value={colorState.backgroundColor}
            onChange={handleBackgroundColorChange}
            debounce={5}
          />
        </SettingsField>

        <SettingsField label="Transparent Background">
          <Checkbox
            checked={colorState.transparentBackground}
            onChange={handleTransparentBackgroundChange}
          />
        </SettingsField>
      </SettingsGroup>
    </>
  );
};

export default ColorsPanel;
