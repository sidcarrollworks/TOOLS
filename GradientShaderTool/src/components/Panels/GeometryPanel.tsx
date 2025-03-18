import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";
import "./Panel.css";
import Select from "../UI/Select";
import { FigmaInput } from "../FigmaInput";
import { Checkbox } from "../UI/Checkbox";
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

      setGeometryParams(params);

      // Get wireframe setting
      const wireframeValue = parameterStore.getValue("showWireframe");
      if (wireframeValue !== undefined) {
        setShowWireframe(wireframeValue);
      }
    }
  }, []);

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

    // Trigger geometry rebuild for certain parameters
    // We need to trigger recreation to update the geometry
    const facade = geometryStore.getFacade();
    if (facade) {
      facade.updateParam(paramId as any, value, { recreateGeometry: true });
    }
  };

  // Handle wireframe toggle
  const handleWireframeChange = (checked: boolean) => {
    // Update local state for immediate feedback
    setShowWireframe(checked);

    // Update the parameter
    parameterStore.setValue("showWireframe", checked);
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
    <div className="panel">
      {/* Geometry Type Select */}
      <div className="settingRow">
        <label className="label">Shape Type</label>
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

      {/* Geometry Settings */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Shape Settings</h3>

        {getCurrentGeometrySettings().map((setting) => (
          <FigmaInput
            key={setting.id}
            label={setting.label}
            value={geometryParams[setting.id] || 0}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            onChange={(value) => handleParamChange(setting.id, value)}
          />
        ))}
      </div>

      {/* Wireframe Toggle */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Display</h3>
        <Checkbox
          label="Show Wireframe"
          checked={showWireframe}
          onChange={handleWireframeChange}
        />
      </div>
    </div>
  );
};

export default GeometryPanel;
