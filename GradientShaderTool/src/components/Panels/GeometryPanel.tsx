import type { FunctionComponent } from "preact";
import { useEffect } from "preact/hooks";

import Select from "../UI/Select";
import { ScrubInput, ThrottledScrubInput } from "../ScrubInput";
import { Checkbox } from "../UI/Checkbox";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import { getGeometryInitializer } from "../../lib/stores/GeometryInitializer";
import { getUIStore } from "../../lib/stores/UIStore";
import { getGeometryParameter } from "../../lib/stores/GeometryInitializer";
import { useSignalValue } from "../../lib/hooks/useSignals";
import { facadeSignal } from "../../app";

// Type interfaces
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
  // Get the geometry initializer and store
  const geometryInitializer = getGeometryInitializer();

  // Get UI store for toast messages
  const uiStore = getUIStore();

  // Use signal values directly with custom hooks
  const geometryType = useSignalValue(getGeometryParameter("geometryType"));
  const showWireframe = useSignalValue(getGeometryParameter("wireframe"));

  // Use signal values for geometry parameters
  const planeWidth = useSignalValue(getGeometryParameter("planeWidth"));
  const planeHeight = useSignalValue(getGeometryParameter("planeHeight"));
  const planeSegments = useSignalValue(getGeometryParameter("planeSegments"));

  const sphereRadius = useSignalValue(getGeometryParameter("sphereRadius"));
  const sphereWidthSegments = useSignalValue(
    getGeometryParameter("sphereWidthSegments")
  );
  const sphereHeightSegments = useSignalValue(
    getGeometryParameter("sphereHeightSegments")
  );

  const cubeSize = useSignalValue(getGeometryParameter("cubeSize"));
  const cubeSegments = useSignalValue(getGeometryParameter("cubeSegments"));

  // Handle facade preset events
  useEffect(() => {
    const facade = facadeSignal.value;

    if (facade) {
      const handlePresetApplied = () => {
        // Sync initializer with facade
        geometryInitializer.syncWithFacade();
      };

      facade.on("preset-applied", handlePresetApplied);

      return () => {
        facade.off("preset-applied", handlePresetApplied);
      };
    }
  }, []);

  // Handle geometry type change
  const handleTypeChange = (value: string) => {
    geometryInitializer.updateGeometryType(value);
  };

  // Handle geometry parameter change
  const handleParamChange = (paramId: string, value: number) => {
    geometryInitializer.updateGeometryParameter(paramId as any, value);
  };

  // Handle wireframe toggle
  const handleWireframeChange = (checked: boolean) => {
    geometryInitializer.updateWireframe(checked);
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

  return (
    <>
      {/* Geometry Type Select */}

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

      <SettingsGroup collapsible={false} header={false}>
        {/* Geometry Settings based on type */}
        {geometryType === "plane" && (
          <>
            <SettingsField label="Dimensions" inputDir="row" labelDir="column">
              <ThrottledScrubInput
                value={planeWidth}
                min={0.1}
                max={10}
                step={0.1}
                mode="throttle"
                highPerformanceMode={true}
                delay={150}
                onChange={(value: number) =>
                  handleParamChange("planeWidth", value)
                }
                dragIcon="W"
              />
              <ThrottledScrubInput
                value={planeHeight}
                min={0.1}
                max={10}
                step={0.1}
                mode="throttle"
                highPerformanceMode={true}
                delay={150}
                onChange={(value: number) =>
                  handleParamChange("planeHeight", value)
                }
                dragIcon="H"
              />
            </SettingsField>

            <SettingsField label="Segments" labelDir="column">
              <ThrottledScrubInput
                value={planeSegments}
                min={4}
                max={256}
                step={1}
                delay={300}
                mode="debounce"
                highPerformanceMode={true}
                onChange={(value: number) =>
                  handleParamChange("planeSegments", value)
                }
              />
            </SettingsField>
          </>
        )}

        {geometryType === "sphere" && (
          <>
            <SettingsField label="Radius" labelDir="column">
              <ScrubInput
                value={sphereRadius}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(value: number) =>
                  handleParamChange("sphereRadius", value)
                }
              />
            </SettingsField>

            <SettingsField label="Segments" inputDir="row" labelDir="column">
              <ThrottledScrubInput
                value={sphereWidthSegments}
                min={4}
                max={128}
                step={1}
                delay={250}
                mode="debounce"
                highPerformanceMode={true}
                onChange={(value: number) =>
                  handleParamChange("sphereWidthSegments", value)
                }
                dragIcon="W"
              />
              <ThrottledScrubInput
                value={sphereHeightSegments}
                min={4}
                max={128}
                step={1}
                delay={250}
                mode="debounce"
                highPerformanceMode={true}
                onChange={(value: number) =>
                  handleParamChange("sphereHeightSegments", value)
                }
                dragIcon="H"
              />
            </SettingsField>
          </>
        )}

        {geometryType === "cube" && (
          <>
            <SettingsField label="Size" labelDir="column">
              <ScrubInput
                value={cubeSize}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(value: number) =>
                  handleParamChange("cubeSize", value)
                }
              />
            </SettingsField>

            <SettingsField label="Segments" labelDir="column">
              <ThrottledScrubInput
                value={cubeSegments}
                min={1}
                max={64}
                step={1}
                delay={250}
                mode="debounce"
                highPerformanceMode={true}
                onChange={(value: number) =>
                  handleParamChange("cubeSegments", value)
                }
              />
            </SettingsField>
          </>
        )}
      </SettingsGroup>

      <SettingsField label="Wireframe" style={{ marginBottom: 0 }}>
        <Checkbox checked={showWireframe} onChange={handleWireframeChange} />
      </SettingsField>
    </>
  );
};

export default GeometryPanel;
