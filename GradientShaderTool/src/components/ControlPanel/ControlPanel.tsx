import type { FunctionComponent } from "preact";
import type { ShaderParams } from "../../lib/ShaderApp";
import { useState, useEffect, useRef } from "preact/hooks";
import styles from "./ControlPanel.module.css";
import { ShaderApp } from "../../lib/ShaderApp";
import { NumericControl } from "./NumericControl";
import { setPresetApplying } from "../FigmaInput/FigmaInput";

interface ControlPanelProps {
  app: ShaderApp | null;
}

export const ControlPanel: FunctionComponent<ControlPanelProps> = ({ app }) => {
  const [params, setParams] = useState<ShaderParams | null>(null);
  // Add debounce timer ref
  const debounceTimerRef = useRef<number | null>(null);
  // Add pending geometry updates ref
  const pendingGeometryUpdates = useRef<{
    key: keyof ShaderParams;
    value: number;
  } | null>(null);
  // Add state for pending updates
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);

  useEffect(() => {
    if (app) {
      // Initialize params from app
      setParams({ ...app.params });

      // Add a method to update the GUI from the app
      (app as any).updateGUI = () => {
        setParams({ ...app.params });
      };
    }
  }, [app]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!app || !params) {
    return <div className={styles.controlPanel}>Loading controls...</div>;
  }

  // Function to apply debounced geometry updates
  const applyGeometryUpdate = () => {
    if (!app || !pendingGeometryUpdates.current) return;
    
    // Apply the pending update
    const { key, value } = pendingGeometryUpdates.current;
    app.params[key] = value as never;
    
    // Recreate the plane with the new geometry
    app.recreatePlane();
    
    // Reset pending updates
    pendingGeometryUpdates.current = null;
    setHasPendingUpdates(false);
    
    // Schedule a final high-quality update after interaction ends
    setTimeout(() => {
      if (app && !pendingGeometryUpdates.current) {
        // Force a high-quality rebuild
        app.recreatePlaneHighQuality();
      }
    }, 500); // Wait 500ms after the last update to ensure user has stopped interacting
  };

  // Handle parameter changes
  const handleChange = (
    key: keyof ShaderParams,
    value: number | string | boolean
  ) => {
    if (!app) return;

    // Update the app parameter
    app.params[key] = value as never; // Type assertion needed due to complex type constraints

    // Update local state
    setParams({ ...app.params });

    // Update the dev panel if it's been set up
    if ("updateDevPanel" in app) {
      (app as any).updateDevPanel();
    }

    // Special handling for parameters that require recreation of the plane
    if (["planeWidth", "planeHeight", "planeSegments"].includes(key)) {
      // Store the pending update
      pendingGeometryUpdates.current = {
        key: key as keyof ShaderParams,
        value: value as number
      };
      
      // Set pending updates flag
      setHasPendingUpdates(true);
      
      // Clear any existing timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      
      // Set a new timer to apply the update after a delay
      debounceTimerRef.current = window.setTimeout(() => {
        applyGeometryUpdate();
        debounceTimerRef.current = null;
      }, 150); // 150ms debounce delay
    } else {
      // Update other parameters immediately
      app.updateParams(key.toString().startsWith("camera"));
    }
  };

  // Handle preset selection
  const applyPreset = (presetName: string) => {
    if (!app || !app.presets[presetName]) return;

    // Set the preset application state to true before applying the preset
    setPresetApplying(true);

    // Use setTimeout to ensure the transition property is applied before values change
    setTimeout(() => {
      // Apply the preset
      app.presets[presetName]();

      // Update local state
      setParams({ ...app.params });

      // Update the dev panel if it's been set up
      if ("updateDevPanel" in app) {
        (app as any).updateDevPanel();
      }

      // Set the preset application state back to false after a delay
      setTimeout(() => {
        setPresetApplying(false);
      }, 600); // Slightly longer than the transition duration to ensure it completes
    }, 50); // Small delay to ensure transition property is applied first
  };

  // Helper function to create a slider control (kept for backward compatibility)
  const createSlider = (
    label: string,
    key: keyof ShaderParams,
    min: number,
    max: number,
    step: number,
    decimals: number = 1
  ) => (
    <NumericControl
      label={label}
      paramKey={key}
      value={params[key] as number}
      min={min}
      max={max}
      step={step}
      decimals={decimals}
      onChange={handleChange}
    />
  );

  return (
    <div className={styles.controlPanel}>
      {/* Presets */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Presets</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          <button
            className={styles.presetButton}
            onClick={() => applyPreset("Default")}
          >
            Default
          </button>
          <button
            className={styles.presetButton}
            onClick={() => applyPreset("Ocean Waves")}
          >
            Ocean Waves
          </button>
          <button
            className={styles.presetButton}
            onClick={() => applyPreset("Lava Flow")}
          >
            Lava Flow
          </button>
          <button
            className={styles.presetButton}
            onClick={() => applyPreset("Abstract Art")}
          >
            Abstract Art
          </button>
        </div>
      </div>

      {/* Plane Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>
          Geometry
          {hasPendingUpdates && (
            <span style={{ 
              marginLeft: "8px", 
              fontSize: "0.8em", 
              color: "#ff9800",
              fontStyle: "italic"
            }}>
              (updating...)
            </span>
          )}
        </div>
        {createSlider("Width", "planeWidth", 0.5, 5, 0.1)}
        {createSlider("Height", "planeHeight", 0.5, 5, 0.1)}
        {createSlider("Resolution", "planeSegments", 16, 256, 8, 0)}
      </div>

      {/* Normal Noise Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Normal Noise</div>
        {createSlider("Scale X", "normalNoiseScaleX", 0.1, 10, 0.1)}
        {createSlider("Scale Y", "normalNoiseScaleY", 0.1, 10, 0.1)}
        {createSlider("Speed", "normalNoiseSpeed", 0, 1, 0.01, 2)}
        {createSlider("Strength", "normalNoiseStrength", 0, 1, 0.01, 2)}
        <div className={styles.controlGroupSubtitle}>Shift</div>
        {createSlider("X", "normalNoiseShiftX", -1, 1, 0.01, 2)}
        {createSlider("Y", "normalNoiseShiftY", -1, 1, 0.01, 2)}
        {createSlider("Speed", "normalNoiseShiftSpeed", 0, 1, 0.01, 2)}
      </div>

      {/* Color Noise Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Color Noise</div>
        {createSlider("Scale", "colorNoiseScale", 0.1, 10, 0.1)}
        {createSlider("Speed", "colorNoiseSpeed", 0, 1, 0.01, 2)}
        <div className={styles.controlGroupSubtitle}>Shift</div>

        {createSlider("Shift X", "gradientShiftX", -1, 1, 0.01, 2)}
        {createSlider("Shift Y", "gradientShiftY", -1, 1, 0.01, 2)}
        {createSlider("Shift Speed", "gradientShiftSpeed", 0, 0.5, 0.01, 2)}
      </div>

      {/* Colors Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Colors</div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Gradient Mode</label>
          <select
            value={params.gradientMode}
            onChange={(e) =>
              handleChange(
                "gradientMode",
                parseInt((e.target as HTMLSelectElement).value, 10)
              )
            }
            className={styles.select}
          >
            <option value={0}>B-Spline</option>
            <option value={1}>Linear</option>
            <option value={2}>Step</option>
            <option value={3}>Smooth Step</option>
            <option value={4}>Direct Mapping</option>
          </select>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Color 1</label>
          <input
            type="color"
            className={styles.colorPicker}
            value={params.color1}
            onChange={(e) =>
              handleChange("color1", (e.target as HTMLInputElement).value)
            }
          />
          <span className={styles.valueDisplay}>{params.color1}</span>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Color 2</label>
          <input
            type="color"
            className={styles.colorPicker}
            value={params.color2}
            onChange={(e) =>
              handleChange("color2", (e.target as HTMLInputElement).value)
            }
          />
          <span className={styles.valueDisplay}>{params.color2}</span>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Color 3</label>
          <input
            type="color"
            className={styles.colorPicker}
            value={params.color3}
            onChange={(e) =>
              handleChange("color3", (e.target as HTMLInputElement).value)
            }
          />
          <span className={styles.valueDisplay}>{params.color3}</span>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Color 4</label>
          <input
            type="color"
            className={styles.colorPicker}
            value={params.color4}
            onChange={(e) =>
              handleChange("color4", (e.target as HTMLInputElement).value)
            }
          />
          <span className={styles.valueDisplay}>{params.color4}</span>
        </div>
      </div>

      {/* Lighting Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Lighting</div>
        {createSlider("Light Dir X", "lightDirX", -1, 1, 0.01, 2)}
        {createSlider("Light Dir Y", "lightDirY", -1, 1, 0.01, 2)}
        {createSlider("Light Dir Z", "lightDirZ", -1, 1, 0.01, 2)}
        {createSlider("Diffuse", "diffuseIntensity", 0, 1, 0.01, 2)}
        {createSlider("Ambient", "ambientIntensity", 0, 1, 0.01, 2)}
        {createSlider("Rim Light", "rimLightIntensity", 0, 1, 0.01, 2)}
      </div>

      {/* Visualization Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Visualization</div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Transparent Background</label>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={params.exportTransparentBg}
            onChange={(e) =>
              handleChange(
                "exportTransparentBg",
                (e.target as HTMLInputElement).checked
              )
            }
          />
        </div>

        <div className={styles.controlRow}>
          <label
            className={`${styles.controlLabel} ${
              params.exportTransparentBg ? styles.disabled : ""
            }`}
          >
            Background
          </label>
          <input
            type="color"
            className={styles.colorPicker}
            value={params.backgroundColor}
            onChange={(e) =>
              handleChange(
                "backgroundColor",
                (e.target as HTMLInputElement).value
              )
            }
            disabled={params.exportTransparentBg}
          />
          <span
            className={`${styles.valueDisplay} ${
              params.exportTransparentBg ? styles.disabled : ""
            }`}
          >
            {params.backgroundColor}
          </span>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Show Wireframe</label>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={params.showWireframe}
            onChange={(e) =>
              handleChange(
                "showWireframe",
                (e.target as HTMLInputElement).checked
              )
            }
          />
        </div>

        
      </div>

      {/* Camera Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Camera</div>
        {createSlider("Distance", "cameraDistance", 0.5, 10, 0.1)}
        {createSlider("FOV", "cameraFov", 1, 120, 1, 0)}
      </div>

      {/* Animation Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Animation</div>
        {createSlider("Speed", "animationSpeed", 0, 0.05, 0.001, 3)}

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>Pause</label>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={params.pauseAnimation}
            onChange={(e) =>
              handleChange(
                "pauseAnimation",
                (e.target as HTMLInputElement).checked
              )
            }
          />
        </div>
      </div>

      {/* Export Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Export</div>

        <div className={styles.controlRow}>
          <button className={styles.button} onClick={() => app.saveAsImage()}>
            Save as Image
          </button>
        </div>

        <div className={styles.controlRow}>
          <button className={styles.button} onClick={() => app.exportCode()}>
            Export Code
          </button>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>High Quality</label>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={params.exportHighQuality}
            onChange={(e) =>
              handleChange(
                "exportHighQuality",
                (e.target as HTMLInputElement).checked
              )
            }
          />
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
