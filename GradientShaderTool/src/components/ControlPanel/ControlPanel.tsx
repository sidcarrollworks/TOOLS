import type { FunctionComponent } from "preact";
import type { ShaderParams } from "../../lib/ShaderApp";
import { useEffect, useRef } from "preact/hooks";
import { signal, effect, batch, computed } from "@preact/signals";
import styles from "./ControlPanel.module.css";
import { ShaderApp } from "../../lib/ShaderApp";
import { NumericControl } from "./NumericControl";
import { setPresetApplying } from "../FigmaInput/FigmaInput";
import { Select, Tooltip } from "../UI";
import { DirectionControl } from "../DirectionControl";

// Create a signal for the shader parameters
const paramsSignal = signal<ShaderParams | null>(null);
// Signal for pending geometry updates
const hasPendingUpdatesSignal = signal(false);
// Signal to track initialization status
const isInitializedSignal = signal(false);
// Signal to track the current app instance
const currentAppSignal = signal<ShaderApp | null>(null);

interface ControlPanelProps {
  app: ShaderApp | null;
}

export const ControlPanel: FunctionComponent<ControlPanelProps> = ({ app }) => {
  // Add debounce timer ref
  const debounceTimerRef = useRef<number | null>(null);
  // Add pending geometry updates ref
  const pendingGeometryUpdates = useRef<{
    key: keyof ShaderParams;
    value: number;
  } | null>(null);
  // Track initialization attempts
  const initAttemptRef = useRef(0);

  // Initialize params when app changes or component mounts
  useEffect(() => {
    // Safety check - app should always be provided based on parent component logic
    if (!app) {
      // Don't reset the params if we already have them - this prevents flickering
      // when the component temporarily receives a null app during re-renders
      if (paramsSignal.value) {
        return;
      }
      return;
    }

    // Check if this is the same app instance we already processed
    if (currentAppSignal.value === app && paramsSignal.value) {
      return;
    }

    // Update the current app signal
    currentAppSignal.value = app;

    // Increment initialization attempt counter
    initAttemptRef.current += 1;

    // Set initial params - make a deep copy to ensure we don't have reference issues
    try {
      const paramsClone = JSON.parse(JSON.stringify(app.params));
      batch(() => {
        paramsSignal.value = paramsClone;
        isInitializedSignal.value = true;
      });
    } catch (error) {
      console.error("Error initializing params signal:", error);
    }

    // Set up the updateGUI method on the app
    (app as any).updateGUI = () => {
      // Make a deep copy to ensure we don't have reference issues
      try {
        paramsSignal.value = JSON.parse(JSON.stringify(app.params));
      } catch (error) {
        console.error("Error updating params signal:", error);
      }
    };

    // Call updateGUI once to ensure params are up to date
    (app as any).updateGUI();

    // Set up an effect to sync app params with our signal
    const cleanup = effect(() => {
      if (app && paramsSignal.value) {
        // This effect will run whenever paramsSignal changes
        // We don't need to do anything here as we update the app directly in handleChange
      }
    });

    // Set up a retry mechanism if params aren't loaded correctly
    if (!paramsSignal.value && initAttemptRef.current < 3) {
      const retryTimer = setTimeout(() => {
        if (!paramsSignal.value && app.params) {
          try {
            paramsSignal.value = JSON.parse(JSON.stringify(app.params));
            isInitializedSignal.value = true;
          } catch (error) {
            console.error("Error initializing params on retry:", error);
          }
        }
      }, 500);

      return () => {
        clearTimeout(retryTimer);
        cleanup();

        // Clean up debounce timer
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }
      };
    }

    return () => {
      // Clean up the effect
      cleanup();

      // Clean up debounce timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [app]); // Only re-run when app changes

  // Function to apply debounced geometry updates
  const applyGeometryUpdate = () => {
    if (!app || !pendingGeometryUpdates.current) return;

    // Apply the pending update
    const { key, value } = pendingGeometryUpdates.current;
    app.params[key] = value as never;

    // Recreate the geometry with the new parameters
    app.recreateGeometry();

    // Reset pending updates
    pendingGeometryUpdates.current = null;
    hasPendingUpdatesSignal.value = false;

    // Schedule a final high-quality update after interaction ends
    setTimeout(() => {
      if (app && !pendingGeometryUpdates.current) {
        // Force a high-quality rebuild
        app.recreateGeometryHighQuality();
      }
    }, 500); // Wait 500ms after the last update to ensure user has stopped interacting
  };

  // Handle parameter changes
  const handleChange = (
    key: keyof ShaderParams,
    value: number | string | boolean
  ) => {
    if (!app || !paramsSignal.value) return;

    // Use batch to group multiple signal updates
    batch(() => {
      // Create a new params object with the updated value
      const newParams = { ...paramsSignal.value! };
      newParams[key] = value as never;

      // Update the app parameter directly
      app.params[key] = value as never;

      // Update the signal with the new params
      paramsSignal.value = newParams;
    });

    // Update the dev panel if it's been set up
    if ("updateDevPanel" in app) {
      (app as any).updateDevPanel();
    }

    // Special handling for parameters that require recreation of the geometry
    if (
      [
        "planeWidth",
        "planeHeight",
        "planeSegments",
        "sphereRadius",
        "sphereWidthSegments",
        "sphereHeightSegments",
        "cubeSize",
        "cubeWidthSegments",
        "cubeHeightSegments",
        "cubeDepthSegments",
      ].includes(key)
    ) {
      // Store the pending update
      pendingGeometryUpdates.current = {
        key: key as keyof ShaderParams,
        value: value as number,
      };

      // Set pending updates flag
      hasPendingUpdatesSignal.value = true;

      // Clear any existing timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Set a new timer to apply the update after a delay
      debounceTimerRef.current = window.setTimeout(() => {
        applyGeometryUpdate();
        debounceTimerRef.current = null;
      }, 150); // 150ms debounce delay
    } else if (key === "geometryType") {
      // Geometry type changes are handled directly in the UI component
      // No need for debouncing here
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
      paramsSignal.value = JSON.parse(JSON.stringify(app.params));

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
    decimals: number = 1,
    tooltip?: string
  ) => {
    const params = paramsSignal.value;
    if (!params) return null;

    return (
      <NumericControl
        label={label}
        paramKey={key}
        value={params[key] as number}
        min={min}
        max={max}
        step={step}
        decimals={decimals}
        tooltip={tooltip}
        onChange={handleChange}
      />
    );
  };

  // Show loading state if params aren't loaded yet
  if (!paramsSignal.value) {
    return (
      <div className={styles.controlPanel}>
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div>Loading controls...</div>
          {initAttemptRef.current > 1 && (
            <div
              style={{ marginTop: "10px", fontSize: "0.8em", color: "#888" }}
            >
              Attempt {initAttemptRef.current} - Please wait
            </div>
          )}

          {initAttemptRef.current >= 2 && (
            <div style={{ marginTop: "20px" }}>
              <button
                onClick={() => {
                  console.log("Manual initialization attempt");
                  if (app && app.params) {
                    try {
                      console.log("App params available:", app.params);
                      paramsSignal.value = JSON.parse(
                        JSON.stringify(app.params)
                      );
                      console.log(
                        "Manually set params signal:",
                        paramsSignal.value
                      );
                    } catch (error) {
                      console.error("Error in manual initialization:", error);
                    }
                  } else {
                    console.error(
                      "App or app.params is null in manual initialization"
                    );
                  }
                }}
                style={{
                  padding: "8px 16px",
                  background: "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Debug: Force Initialize
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Get the current params from the signal
  const params = paramsSignal.value;
  const hasPendingUpdates = hasPendingUpdatesSignal.value;

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

      {/* Geometry Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>
          Geometry
          {hasPendingUpdates && (
            <span
              style={{
                marginLeft: "8px",
                fontSize: "0.8em",
                color: "#ff9800",
                fontStyle: "italic",
              }}
            >
              (updating...)
            </span>
          )}
        </div>

        {/* Geometry Type Selector */}
        <div className={styles.controlRow}>
          <Tooltip
            content="Choose the 3D shape to apply the gradient shader to"
            position="top"
          >
            <label className={styles.controlLabel}>Type</label>
          </Tooltip>
          <div style={{ flex: 1 }}>
            <Select.Root
              value={params.geometryType}
              onValueChange={(value) => {
                handleChange("geometryType", value);
                // Force geometry recreation when type changes
                if (app) {
                  app.recreateGeometry();
                }
              }}
            >
              <Select.Trigger>
                {params.geometryType === "plane"
                  ? "Plane"
                  : params.geometryType === "sphere"
                  ? "Sphere"
                  : "Cube"}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="plane">Plane</Select.Item>
                <Select.Item value="sphere">Sphere</Select.Item>
                <Select.Item value="cube">Cube</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        {/* Plane-specific controls */}
        {params.geometryType === "plane" && (
          <>
            {createSlider(
              "Width",
              "planeWidth",
              0.5,
              5,
              0.1,
              1,
              "Width of the plane in 3D space"
            )}
            {createSlider(
              "Height",
              "planeHeight",
              0.5,
              5,
              0.1,
              1,
              "Height of the plane in 3D space"
            )}
            {createSlider(
              "Resolution",
              "planeSegments",
              16,
              256,
              8,
              0,
              "Number of segments in the plane mesh. Higher values create a smoother surface but may impact performance."
            )}
          </>
        )}

        {/* Sphere-specific controls */}
        {params.geometryType === "sphere" && (
          <>
            {createSlider(
              "Radius",
              "sphereRadius",
              0.5,
              3,
              0.1,
              1,
              "Radius of the sphere in 3D space"
            )}
            {createSlider(
              "Width Segments",
              "sphereWidthSegments",
              8,
              128,
              4,
              0,
              "Number of horizontal segments in the sphere mesh. Higher values create a smoother surface but may impact performance."
            )}
            {createSlider(
              "Height Segments",
              "sphereHeightSegments",
              8,
              128,
              4,
              0,
              "Number of vertical segments in the sphere mesh. Higher values create a smoother surface but may impact performance."
            )}
          </>
        )}

        {/* Cube-specific controls */}
        {params.geometryType === "cube" && (
          <>
            {createSlider(
              "Size",
              "cubeSize",
              0.5,
              3,
              0.1,
              1,
              "Size of the cube in 3D space"
            )}
            {createSlider(
              "Width Segments",
              "cubeWidthSegments",
              1,
              32,
              1,
              0,
              "Number of segments along the width of the cube. Higher values create a smoother surface but may impact performance."
            )}
            {createSlider(
              "Height Segments",
              "cubeHeightSegments",
              1,
              32,
              1,
              0,
              "Number of segments along the height of the cube. Higher values create a smoother surface but may impact performance."
            )}
            {createSlider(
              "Depth Segments",
              "cubeDepthSegments",
              1,
              32,
              1,
              0,
              "Number of segments along the depth of the cube. Higher values create a smoother surface but may impact performance."
            )}
          </>
        )}
      </div>

      {/* Normal Noise Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Normal Noise</div>
        {createSlider(
          "Scale X",
          "normalNoiseScaleX",
          0.1,
          10,
          0.1,
          1,
          "Controls the horizontal scale of the noise pattern. Lower values create larger patterns, higher values create more detailed patterns."
        )}
        {createSlider(
          "Scale Y",
          "normalNoiseScaleY",
          0.1,
          10,
          0.1,
          1,
          "Controls the vertical scale of the noise pattern. Lower values create larger patterns, higher values create more detailed patterns."
        )}
        {createSlider(
          "Speed",
          "normalNoiseSpeed",
          0,
          1,
          0.01,
          2,
          "Controls how fast the noise pattern changes over time."
        )}
        {createSlider(
          "Strength",
          "normalNoiseStrength",
          0,
          1,
          0.01,
          2,
          "Controls how much the noise affects the surface normals. Higher values create more pronounced effects."
        )}
        {/* <div className={styles.controlGroupSubtitle}>Direction</div> */}
        <DirectionControl
          valueX={params.normalNoiseShiftX}
          valueY={params.normalNoiseShiftY}
          speed={params.normalNoiseShiftSpeed}
          min={-1}
          max={1}
          minSpeed={0}
          maxSpeed={1}
          step={0.01}
          onChangeX={(value) => handleChange("normalNoiseShiftX", value)}
          onChangeY={(value) => handleChange("normalNoiseShiftY", value)}
          onChangeSpeed={(value) =>
            handleChange("normalNoiseShiftSpeed", value)
          }
        />
      </div>

      {/* Colors Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Colors</div>

        <div className={styles.controlRow}>
          <Tooltip
            content="Choose how colors are interpolated between the color stops"
            position="top"
          >
            <label className={styles.controlLabel}>Gradient Mode</label>
          </Tooltip>
          <div style={{ flex: 1 }}>
            <Select.Root
              value={params.gradientMode.toString()}
              onValueChange={(value) => {
                console.log("Select value changed:", value);
                handleChange("gradientMode", parseInt(value, 10));
              }}
            >
              <Select.Trigger>
                {
                  [
                    "B-Spline",
                    "Linear",
                    "Step",
                    "Smooth Step",
                    "Direct Mapping",
                  ][params.gradientMode]
                }
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="0">B-Spline</Select.Item>
                <Select.Item value="1">Linear</Select.Item>
                <Select.Item value="2">Step</Select.Item>
                <Select.Item value="3">Smooth Step</Select.Item>
                <Select.Item value="4">Direct Mapping</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <div className={styles.controlRow}>
          <Tooltip content="First color in the gradient" position="top">
            <label className={styles.controlLabel}>Color 1</label>
          </Tooltip>
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
          <Tooltip content="Second color in the gradient" position="top">
            <label className={styles.controlLabel}>Color 2</label>
          </Tooltip>
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
          <Tooltip content="Third color in the gradient" position="top">
            <label className={styles.controlLabel}>Color 3</label>
          </Tooltip>
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
          <Tooltip content="Fourth color in the gradient" position="top">
            <label className={styles.controlLabel}>Color 4</label>
          </Tooltip>
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

      {/* Color Noise Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Color Noise</div>
        {createSlider("Scale", "colorNoiseScale", 0.1, 10, 0.1)}
        {createSlider("Speed", "colorNoiseSpeed", 0, 1, 0.01, 2)}
        {/* <div className={styles.controlGroupSubtitle}>Direction</div> */}
        <DirectionControl
          valueX={params.gradientShiftX}
          valueY={params.gradientShiftY}
          speed={params.gradientShiftSpeed}
          min={-1}
          max={1}
          minSpeed={0}
          maxSpeed={0.5}
          step={0.01}
          onChangeX={(value) => handleChange("gradientShiftX", value)}
          onChangeY={(value) => handleChange("gradientShiftY", value)}
          onChangeSpeed={(value) => handleChange("gradientShiftSpeed", value)}
        />
      </div>

      {/* Lighting Controls */}
      <div className={styles.controlGroup}>
        <div className={styles.controlGroupTitle}>Lighting</div>
        {createSlider("X", "lightDirX", -1, 1, 0.01, 2)}
        {createSlider("Y", "lightDirY", -1, 1, 0.01, 2)}
        {createSlider("Z", "lightDirZ", -1, 1, 0.01, 2)}
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
          <button
            className={styles.button}
            onClick={() => app?.saveAsImage()}
            disabled={!app}
          >
            Save as Image
          </button>
        </div>

        <div className={styles.controlRow}>
          <button
            className={styles.button}
            onClick={() => app?.exportCode()}
            disabled={!app}
          >
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
