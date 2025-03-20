import type { FunctionComponent } from "preact";
import { useComputed, computed } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";
import "./Panel.css";
import Select from "../UI/Select";
import { FigmaInput } from "../FigmaInput";
import { Checkbox } from "../UI/Checkbox";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import { getGeometryStore } from "../../lib/stores/GeometryStore";
import { getParameterStore } from "../../lib/stores/ParameterStore";

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
      {
        id: "cubeWidthSegments",
        label: "Width Segments",
        min: 1,
        max: 64,
        step: 1,
      },
      {
        id: "cubeHeightSegments",
        label: "Height Segments",
        min: 1,
        max: 64,
        step: 1,
      },
      {
        id: "cubeDepthSegments",
        label: "Depth Segments",
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

    // Get all current parameter values using the facade for accurate values
    const facade = geometryStore.getFacade();
    if (facade && facade.isInitialized()) {
      const params: Record<string, number> = {};

      // Get values for all possible geometry parameters
      for (const type in GEOMETRY_SETTINGS) {
        GEOMETRY_SETTINGS[type].settings.forEach((setting) => {
          const value = facade.getParam(setting.id as any);
          if (value !== undefined) {
            params[setting.id] = value;
          }
        });
      }

      // Special handling for cube - initialize unified segments
      if (currentGeometryType === "cube") {
        // Use width segments as the base for unified segments
        const segments = facade.getParam("cubeWidthSegments");
        if (segments !== undefined) {
          params.cubeSegments = segments;
        }

        // Initialize cube size if not set
        const cubeSize = facade.getParam("cubeSize");
        if (cubeSize === undefined) {
          // Default cube size is 1
          const defaultSize = 1.0;
          params.cubeSize = defaultSize;
          facade.updateParam("cubeSize", defaultSize);
          parameterStore.setValue("cubeSize", defaultSize);
        }
      }

      setGeometryParams(params);

      // Get wireframe setting
      const wireframeValue = facade.getParam("showWireframe");
      if (wireframeValue !== undefined) {
        setShowWireframe(wireframeValue);
      }
    } else {
      // Fallback to parameter store if facade isn't available
      const params: Record<string, number> = {};

      // Get values for all possible geometry parameters
      for (const type in GEOMETRY_SETTINGS) {
        GEOMETRY_SETTINGS[type].settings.forEach((setting) => {
          const value = parameterStore.getValue(setting.id);
          if (value !== undefined) {
            params[setting.id] = value;
          }
        });
      }

      // Special handling for cube - initialize unified segments
      if (currentGeometryType === "cube") {
        // Use width segments as the base for unified segments
        const segments = parameterStore.getValue("cubeWidthSegments");
        if (segments !== undefined) {
          params.cubeSegments = segments;
        }

        // Initialize cube size if not set
        const cubeSize = parameterStore.getValue("cubeSize");
        if (cubeSize === undefined) {
          // Default cube size is 1
          params.cubeSize = 1.0;
          parameterStore.setValue("cubeSize", 1.0);
        }
      }

      setGeometryParams(params);

      // Get wireframe setting
      const wireframeValue = parameterStore.getValue("showWireframe");
      if (wireframeValue !== undefined) {
        setShowWireframe(wireframeValue);
      }
    }
  }, []);

  // Add effect to keep wireframe in sync with parameter store
  useEffect(() => {
    // Use the store's signal to monitor state changes
    const stateSignal = parameterStore.getSignal();

    // Set up an effect to watch the signal
    const effect = computed(() => {
      const wireframeValue = parameterStore.getValue("showWireframe");
      if (wireframeValue !== undefined && wireframeValue !== showWireframe) {
        setShowWireframe(wireframeValue);
      }
      // Return the value to ensure proper tracking
      return wireframeValue;
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

    // Update the store (which updates the facade)
    geometryStore.setGeometryType(value);
  };

  // Handle geometry parameter change
  const handleParamChange = (paramId: string, value: number) => {
    // Update local state for immediate feedback
    setGeometryParams((prev) => ({
      ...prev,
      [paramId]: value,
    }));

    // Update the parameter store
    parameterStore.setValue(paramId, value);

    // Special handling for cube segments
    if (paramId === "cubeSegments") {
      // Update all segment parameters to the same value for consistency
      setGeometryParams((prev) => ({
        ...prev,
        cubeWidthSegments: value,
        cubeHeightSegments: value,
        cubeDepthSegments: value,
      }));

      // Update all individual segment parameters
      parameterStore.setValue("cubeWidthSegments", value);
      parameterStore.setValue("cubeHeightSegments", value);
      parameterStore.setValue("cubeDepthSegments", value);

      // Update the facade for all segment parameters
      const facade = geometryStore.getFacade();
      if (facade) {
        facade.updateParam("cubeWidthSegments", value, {
          recreateGeometry: true,
        });
        facade.updateParam("cubeHeightSegments", value, {
          recreateGeometry: false,
        });
        facade.updateParam("cubeDepthSegments", value, {
          recreateGeometry: false,
        });
      }
    } else if (paramId === "cubeSize") {
      // Simply update the size in the facade
      const facade = geometryStore.getFacade();
      if (facade) {
        facade.updateParam("cubeSize", value, { recreateGeometry: true });
      }
    } else {
      // Trigger geometry rebuild for other parameters
      const facade = geometryStore.getFacade();
      if (facade) {
        facade.updateParam(paramId as any, value, { recreateGeometry: true });
      }
    }
  };

  // Handle wireframe toggle
  const handleWireframeChange = (checked: boolean) => {
    // Update local state for immediate feedback
    setShowWireframe(checked);

    // Update the parameter store
    parameterStore.setValue("showWireframe", checked);

    // Ensure the change is applied to the facade directly as well
    const facade = geometryStore.getFacade();
    if (facade && facade.isInitialized()) {
      facade.updateParam("showWireframe", checked);
    }
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
    <SettingsGroup title="Geometry Settings" collapsible={false} header={false}>
      {/* Geometry Type Select */}
      <div className="settingRow">
        <label className="label">Type</label>
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
      </div>

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
          <SettingsField label="Resolution">
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

      {/* Wireframe Toggle */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Display</h3>
        <Checkbox
          label="Show Wireframe"
          checked={showWireframe}
          onChange={handleWireframeChange}
        />
      </div>
    </SettingsGroup>
  );
};

export default GeometryPanel;
