import type { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";

import { FigmaInput } from "../FigmaInput";
import { DirectionControl } from "../DirectionControl";
import { getDistortionStore } from "../../lib/stores/DistortionStore";
import { getUIStore } from "../../lib/stores/UIStore";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";

import { facadeSignal } from "../../app";

interface DistortionPanelProps {
  // No props needed for now
}

export const DistortionPanel: FunctionComponent<DistortionPanelProps> = () => {
  // Get the distortion store
  const distortionStore = getDistortionStore();
  const uiStore = getUIStore();

  // Local state for distortion values
  const [noiseScaleX, setNoiseScaleX] = useState(3.0);
  const [noiseScaleY, setNoiseScaleY] = useState(3.0);
  const [noiseStrength, setNoiseStrength] = useState(0.5);
  const [shiftX, setShiftX] = useState(0);
  const [shiftY, setShiftY] = useState(0);
  const [shiftSpeed, setShiftSpeed] = useState(0.2);

  // Force update counter for direction control
  const [updateCounter, setUpdateCounter] = useState(0);

  // Sync state with store using proper subscription
  useEffect(() => {
    // Sync function to update local state from store
    const syncWithStore = () => {
      const storeState = distortionStore.getState();
      setNoiseScaleX(storeState.normalNoise.scaleX);
      setNoiseScaleY(storeState.normalNoise.scaleY);
      setNoiseStrength(storeState.normalNoise.strength);
      setShiftX(storeState.shift.x);
      setShiftY(storeState.shift.y);
      setShiftSpeed(storeState.shift.speed);

      // We no longer need to force update with counter
      // Direction control will update based on prop changes
    };

    // Get values from facade first
    const facade = facadeSignal.value;
    if (facade) {
      console.log("DistortionPanel: Syncing store with facade on mount");
      distortionStore.syncWithFacade();
    }

    // Initial sync
    syncWithStore();

    // Get the store signal and create an effect to watch it
    const storeSignal = distortionStore.getSignal();

    // Setup subscription
    const unsubscribe = storeSignal.subscribe(syncWithStore);

    // Setup event listeners for facade
    if (facade) {
      const handlePresetApplied = () => {
        // Ensure store is in sync with facade before we sync with store
        distortionStore.syncWithFacade();
        // Then sync our local state with the store
        syncWithStore();
        // We don't need to force direction control updates via key changes
      };

      facade.on("preset-applied", handlePresetApplied);

      return () => {
        unsubscribe();
        facade.off("preset-applied", handlePresetApplied);
      };
    }

    return unsubscribe;
  }, []);

  // Handle noise scale X changes
  const handleNoiseScaleXChange = (value: number) => {
    // Update local state first
    setNoiseScaleX(value);
    // Then update the store
    distortionStore.updateNormalNoiseScaleX(value);
  };

  // Handle noise scale Y changes
  const handleNoiseScaleYChange = (value: number) => {
    setNoiseScaleY(value);
    distortionStore.updateNormalNoiseScaleY(value);
  };

  // Handle noise strength changes
  const handleNoiseStrengthChange = (value: number) => {
    setNoiseStrength(value);
    distortionStore.updateNormalNoiseStrength(value);
  };

  // Handle flow direction X changes
  const handleShiftXChange = (value: number) => {
    setShiftX(value);
    distortionStore.updateNoiseShiftX(value);
  };

  // Handle flow direction Y changes
  const handleShiftYChange = (value: number) => {
    setShiftY(value);
    distortionStore.updateNoiseShiftY(value);
  };

  // Handle flow speed changes
  const handleShiftSpeedChange = (value: number) => {
    setShiftSpeed(value);
    distortionStore.updateNoiseShiftSpeed(value);
  };

  // Handle reset button click
  const handleReset = () => {
    distortionStore.reset();

    // No need to manually sync with store after reset
    // The subscription will handle that automatically

    uiStore.showToast("Distortion settings reset to defaults", "success");
  };

  return (
    <>
      <SettingsGroup collapsible={false} header={false}>
        <SettingsField label="Scale" inputDir="row" labelDir="column">
          <FigmaInput
            value={noiseScaleX}
            min={1}
            max={10}
            step={0.1}
            onChange={handleNoiseScaleXChange}
            dragIcon="X"
          />

          <FigmaInput
            value={noiseScaleY}
            min={1}
            max={10}
            step={0.1}
            onChange={handleNoiseScaleYChange}
            dragIcon="Y"
          />
        </SettingsField>

        <SettingsField label="Strength" labelDir="column">
          <FigmaInput
            value={noiseStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={handleNoiseStrengthChange}
          />
        </SettingsField>
      </SettingsGroup>

      {/* Don't use a key that changes with every update */}
      <DirectionControl
        valueX={shiftX}
        valueY={shiftY}
        speed={shiftSpeed}
        min={-1}
        max={1}
        minSpeed={0}
        maxSpeed={1}
        step={0.01}
        onChangeX={handleShiftXChange}
        onChangeY={handleShiftYChange}
        onChangeSpeed={handleShiftSpeedChange}
      />
    </>
  );
};

export default DistortionPanel;
