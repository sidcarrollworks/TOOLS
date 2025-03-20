import type { FunctionComponent } from "preact";
import { useComputed, computed } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";

import Select from "../UI/Select";
import { FigmaInput } from "../FigmaInput";
import { Checkbox } from "../UI/Checkbox";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import { getGeometryStore } from "../../lib/stores/GeometryStore";
import { getParameterStore } from "../../lib/stores/ParameterStore";
import {
  initializeGeometryParameters,
  syncGeometryParameters,
  syncWireframeState,
  updateGeometryParameter,
  updateWireframeState,
  updateGeometryType,
} from "../../lib/stores/GeometryInitializer";

interface GeometryPanelProps {
  // No props needed for now
}

// Type for different geometry settings
interface GeometrySettings {
  [key: string]: {
    label: string;
    settings: Array<{
      id: string;
      label: string;
      min: number;
      max: number;
      step: number;
    }>;
  };
}

// Define settings for each geometry type
const GEOMETRY_SETTINGS: GeometrySettings = {
  plane: {
    label: "Plane",
    settings: [
      {
        id: "planeWidth",
        label: "Width",
        min: 0.1,
        max: 10,
        step: 0.1,
      },
      {
        id: "planeHeight",
        label: "Height",
        min: 0.1,
        max: 10,
        step: 0.1,
      },
      {
        id: "planeSegments",
        label: "Segments",
        min: 4,
        max: 512,
        step: 1,
      },
    ],
  },
  sphere: {
    label: "Sphere",
    settings: [
      {
        id: "sphereRadius",
        label: "Radius",
        min: 0.1,
        max: 5,
        step: 0.1,
      },
      {
        id: "sphereWidthSegments",
        label: "Width Segments",
        min: 4,
        max: 128,
        step: 1,
      },
      {
        id: "sphereHeightSegments",
        label: "Height Segments",
        min: 4,
        max: 128,
        step: 1,
      },
    ],
  },
  cube: {
    label: "Cube",
    settings: [
      {
        id: "cubeSize",
        label: "Size",
        min: 0.1,
        max: 10,
        step: 0.1,
      },
      {
        id: "cubeSegments",
        label: "Segments",
        min: 1,
        max: 64,
        step: 1,
      },
    ],
  },
};

export const GeometryPanel: FunctionComponent<GeometryPanelProps> = () => {
  // Use the geometry store
  const geometryStore = getGeometryStore();
  const parameterStore = getParameterStore();

  // Local state for geometry values
  const [geometryType, setGeometryType] = useState("plane");
  const [geometryParams, setGeometryParams] = useState<Record<string, number>>(
    {}
  );
  const [showWireframe, setShowWireframe] = useState(false);

  // Sync local state with store
  useEffect(() => {
    // Initial sync for geometry type
    const currentGeometryType = geometryStore.get("geometryType");
    setGeometryType(currentGeometryType);

    // Initialize geometry parameters if needed
    initializeGeometryParameters();

    // Sync all geometry parameters to local state
    const params: Record<string, number> = {};
    const updatedParams = syncGeometryParameters(params, currentGeometryType);
    setGeometryParams(updatedParams);

    // Get wireframe state
    setShowWireframe(syncWireframeState());
  }, []);

  // Add effect to keep wireframe in sync with parameter store
  useEffect(() => {
    // Use the store's signal to monitor state changes
    const stateSignal = parameterStore.getSignal();

    // Set up an effect to watch the signal
    const effect = computed(() => {
      // Get current wireframe state from parameter store
      const currentWireframeState = syncWireframeState();

      // Update local state if it's different
      if (currentWireframeState !== showWireframe) {
        setShowWireframe(currentWireframeState);
      }

      // Return the value to ensure proper tracking
      return currentWireframeState;
    });

    // Return cleanup function
    return () => {
      effect.value; // Access the value to prevent immediate garbage collection
    };
  }, [showWireframe, parameterStore]);

  // Handle geometry type change
  const handleTypeChange = (value: string) => {
    console.log("Changing geometry type to:", value);

    // Update local state for immediate feedback
    setGeometryType(value);

    // Update geometry type in store and facade
    updateGeometryType(value);
  };

  // Handle geometry parameter change
  const handleParamChange = (paramId: string, value: number) => {
    // Update local state for immediate feedback
    setGeometryParams((prev) => ({
      ...prev,
      [paramId]: value,
    }));

    // Update the parameter in store and facade
    updateGeometryParameter(paramId, value);
  };

  // Handle wireframe toggle
  const handleWireframeChange = (checked: boolean) => {
    // Update local state for immediate feedback
    setShowWireframe(checked);

    // Update wireframe state in store and facade
    updateWireframeState(checked);
  };

  // Get geometry type options
  const getGeometryTypeOptions = () => {
    return Object.keys(GEOMETRY_SETTINGS).map((type) => ({
      value: type,
      label: GEOMETRY_SETTINGS[type].label,
    }));
  };

  // Get label for current geometry type
  const getGeometryTypeLabel = () => {
    return GEOMETRY_SETTINGS[geometryType]?.label || "Select type";
  };

  // Get current geometry settings
  const getCurrentGeometrySettings = () => {
    return GEOMETRY_SETTINGS[geometryType]?.settings || [];
  };

  return (
    <>
      {/* Geometry Type Select */}
      <SettingsGroup collapsible={false} header={false}>
        <SettingsField label="Type">
          <Select.Root value={geometryType} onValueChange={handleTypeChange}>
            <Select.Trigger>{getGeometryTypeLabel()}</Select.Trigger>
            <Select.Content>
              {getGeometryTypeOptions().map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup collapsible={false} header={false}>
        {/* Geometry Settings - Restructured to have separate SettingsField components */}
        {geometryType === "plane" && (
          <>
            <SettingsField label="Dimensions" inputDir="row" labelDir="column">
              <FigmaInput
                key="planeWidth"
                value={geometryParams.planeWidth || 0}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(value) => handleParamChange("planeWidth", value)}
                dragIcon="W"
              />
              <FigmaInput
                key="planeHeight"
                value={geometryParams.planeHeight || 0}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(value) => handleParamChange("planeHeight", value)}
                dragIcon="H"
              />
            </SettingsField>
            <SettingsField label="Resolution" labelDir="column">
              <FigmaInput
                key="planeSegments"
                value={geometryParams.planeSegments || 0}
                min={4}
                max={512}
                step={1}
                onChange={(value) => handleParamChange("planeSegments", value)}
              />
            </SettingsField>
          </>
        )}

        {geometryType === "sphere" && (
          <>
            <SettingsField label="Radius">
              <FigmaInput
                key="sphereRadius"
                value={geometryParams.sphereRadius || 0}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(value) => handleParamChange("sphereRadius", value)}
                dragIcon="R"
              />
            </SettingsField>
            <SettingsField label="Resolution">
              <FigmaInput
                key="sphereWidthSegments"
                value={geometryParams.sphereWidthSegments || 0}
                min={4}
                max={128}
                step={1}
                onChange={(value) =>
                  handleParamChange("sphereWidthSegments", value)
                }
                dragIcon="W"
              />
              <FigmaInput
                key="sphereHeightSegments"
                value={geometryParams.sphereHeightSegments || 0}
                min={4}
                max={128}
                step={1}
                onChange={(value) =>
                  handleParamChange("sphereHeightSegments", value)
                }
                dragIcon="H"
              />
            </SettingsField>
          </>
        )}

        {geometryType === "cube" && (
          <>
            <SettingsField label="Size">
              <FigmaInput
                key="cubeSize"
                value={geometryParams.cubeSize || 0}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(value) => handleParamChange("cubeSize", value)}
              />
            </SettingsField>
            <SettingsField label="Resolution">
              <FigmaInput
                key="cubeSegments"
                value={geometryParams.cubeSegments || 0}
                min={1}
                max={64}
                step={1}
                onChange={(value) => handleParamChange("cubeSegments", value)}
              />
            </SettingsField>
          </>
        )}
      </SettingsGroup>

      {/* Wireframe Toggle */}
      <SettingsGroup title="Display" collapsible={false} header={false}>
        <SettingsField label="Wireframe">
          <Checkbox checked={showWireframe} onChange={handleWireframeChange} />
        </SettingsField>
      </SettingsGroup>
    </>
  );
};

export default GeometryPanel;
