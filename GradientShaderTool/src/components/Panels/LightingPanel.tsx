import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";
import "./Panel.css";
import { FigmaInput } from "../FigmaInput";
import { getLightingStore } from "../../lib/stores/LightingStore";
import { Button } from "../UI/Button";

interface LightingPanelProps {
  // No props needed for now
}

const LightingPanel: FunctionComponent<LightingPanelProps> = () => {
  // Use the lighting store
  const lightingStore = getLightingStore();

  // Local state for lighting values
  const [direction, setDirection] = useState({ x: 0.5, y: 0.5, z: 0.5 });
  const [intensities, setIntensities] = useState({
    diffuse: 0.8,
    ambient: 0.2,
    rimLight: 0.5,
  });

  // Sync local state with store
  useEffect(() => {
    // Initial sync
    setDirection(lightingStore.get("direction"));
    setIntensities(lightingStore.get("intensities"));

    // No need for interval here as lighting doesn't have any external updates like camera does
  }, []);

  // Handle light direction changes from UI
  const handleDirectionChange = (axis: "x" | "y" | "z", value: number) => {
    // Update local state for immediate feedback
    setDirection((prev) => ({
      ...prev,
      [axis]: value,
    }));

    // Update the store (which updates the facade)
    lightingStore.setDirectionAxis(axis, value);
  };

  // Handle light intensity changes from UI
  const handleIntensityChange = (
    type: "diffuse" | "ambient" | "rimLight",
    value: number
  ) => {
    // Update local state for immediate feedback
    setIntensities((prev) => ({
      ...prev,
      [type]: value,
    }));

    // Update the store (which updates the facade)
    lightingStore.setIntensity(type, value);
  };

  // Handle reset lighting button
  const handleResetLighting = () => {
    lightingStore.reset();

    // Update local state
    setDirection({ x: 0.5, y: 0.5, z: 0.5 });
    setIntensities({ diffuse: 0.8, ambient: 0.2, rimLight: 0.5 });
  };

  return (
    <div className="panel">
      {/* Lighting Position */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Position</h3>
        <FigmaInput
          label="X"
          value={direction.x}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleDirectionChange("x", value)}
        />
        <FigmaInput
          label="Y"
          value={direction.y}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleDirectionChange("y", value)}
        />
        <FigmaInput
          label="Z"
          value={direction.z}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handleDirectionChange("z", value)}
        />
      </div>

      {/* Lighting Intensity */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Intensity</h3>
        <FigmaInput
          label="Diffuse"
          value={intensities.diffuse}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleIntensityChange("diffuse", value)}
        />
        <FigmaInput
          label="Ambient"
          value={intensities.ambient}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleIntensityChange("ambient", value)}
        />
        <FigmaInput
          label="Rim"
          value={intensities.rimLight}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleIntensityChange("rimLight", value)}
        />
      </div>

      <div className="settingsGroup">
        <Button variant="primary" size="small" onClick={handleResetLighting}>
          Reset Lighting
        </Button>
      </div>
    </div>
  );
};

export default LightingPanel;
