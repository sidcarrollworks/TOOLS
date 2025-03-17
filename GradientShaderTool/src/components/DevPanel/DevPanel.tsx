import type { FunctionComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useComputed } from "@preact/signals";
import type { ShaderParams } from "../../lib/ShaderApp";
import type { IShaderAppFacade } from "../../lib/facade/types";
import { facadeSignal } from "../../app";
import styles from "./DevPanel.module.css";

interface DevPanelProps {
  visible: boolean;
  onToggle: () => void;
}

// Group parameters by category for better organization
const paramCategories = {
  geometry: [
    "geometryType",
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
  ],
  rotation: ["rotationX", "rotationY", "rotationZ"],
  camera: [
    "cameraDistance",
    "cameraFov",
    "cameraPosX",
    "cameraPosY",
    "cameraPosZ",
    "cameraTargetX",
    "cameraTargetY",
    "cameraTargetZ",
  ],
  normalNoise: [
    "normalNoiseScaleX",
    "normalNoiseScaleY",
    "normalNoiseSpeed",
    "normalNoiseStrength",
    "normalNoiseShiftX",
    "normalNoiseShiftY",
    "normalNoiseShiftSpeed",
  ],
  colorNoise: ["colorNoiseScale", "colorNoiseSpeed"],
  gradientShift: ["gradientShiftX", "gradientShiftY", "gradientShiftSpeed"],
  colors: ["gradientMode", "color1", "color2", "color3", "color4"],
  lighting: [
    "lightDirX",
    "lightDirY",
    "lightDirZ",
    "diffuseIntensity",
    "ambientIntensity",
    "rimLightIntensity",
  ],
  visualization: ["backgroundColor", "showWireframe", "flatShading"],
  animation: ["animationSpeed", "pauseAnimation"],
  export: ["exportTransparentBg", "exportHighQuality"],
};

// Format parameter values for display
const formatValue = (key: string, value: any): string => {
  if (value === undefined || value === null) return "undefined";
  if (typeof value === "number") {
    // Check if it's a color parameter (might be a number format like 0xFFFFFF)
    if (key.toLowerCase().includes("color") && !key.includes("Scale")) {
      const hex = value.toString(16).padStart(6, "0");
      return `#${hex}`;
    }
    return value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    // Truncate long strings
    return value.length > 20 ? value.substring(0, 20) + "..." : value;
  }
  return String(value);
};

// Generate code for a preset
const generatePresetCode = (params: ShaderParams): string => {
  // Filter out parameters we don't want in presets
  const relevantParams = Object.entries(params).filter(
    ([key, value]) =>
      // Filter out complex objects, functions, and specific params we don't want to include
      typeof value !== "object" &&
      typeof value !== "function" &&
      !key.includes("camera") && // Exclude camera params
      !key.startsWith("_")
  );

  // Create a formatted string of parameters
  return `// Gradient Shader Preset
{
${relevantParams
  .map(([key, value]) => {
    if (typeof value === "string") {
      return `  ${key}: "${value}",`;
    } else if (typeof value === "number") {
      return `  ${key}: ${value.toFixed(2)},`;
    } else {
      return `  ${key}: ${value},`;
    }
  })
  .join("\n")}
}`;
};

export const DevPanel: FunctionComponent<DevPanelProps> = ({
  visible,
  onToggle,
}) => {
  const [params, setParams] = useState<ShaderParams | null>(null);
  // Only use legacy tab now since facade is disabled
  const [activeTab, setActiveTab] = useState<"legacy">("legacy");
  const [fps, setFps] = useState<number>(0);
  const [triangleCount, setTriangleCount] = useState<number>(0);
  const [drawCalls, setDrawCalls] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [presetCode, setPresetCode] = useState<string>("");
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);

  // Get the facade using the hook
  const facade = useComputed(() => facadeSignal.value);

  useEffect(() => {
    if (!facade.value || !facade.value.isInitialized()) return;

    const interval = setInterval(() => {
      if (facade.value && facade.value.isInitialized()) {
        const allParams = facade.value.getAllParams();
        setParams({ ...allParams });
        setPresetCode(generatePresetCode(allParams));
      }

      frameCountRef.current = 0;
      frameTimesRef.current = [];
    }, 1000);

    return () => clearInterval(interval);
  }, [facade]);

  useEffect(() => {
    if (!facade.value || !facade.value.isInitialized()) return;

    // Update the metrics in the animation loop
    const countFrames = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      frameCountRef.current++;
      frameTimesRef.current.push(deltaTime);

      // Keep only last 10 frames for the moving average
      if (frameTimesRef.current.length > 10) {
        frameTimesRef.current.shift();
      }

      // Calculate FPS
      if (frameTimesRef.current.length > 0) {
        const avgFrameTime =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;
        setFps(Math.round(1000 / avgFrameTime));
      }

      // Request next frame
      requestAnimationFrame(countFrames);
    };

    // Start monitoring frames
    countFrames();

    return () => {
      // Frame monitoring is automatically stopped when component unmounts
      // since we stop requesting animation frames
    };
  }, [facade]);

  // Function to update additional stats
  const updateStats = () => {
    if (!facade.value || !facade.value.isInitialized()) return;

    // TODO: Add facade support for renderer stats when available
    // For now, we can't directly access renderer stats through the facade
    setTriangleCount(0);
    setDrawCalls(0);
    setMemoryUsage(0);
  };

  // Update stats periodically
  useEffect(() => {
    if (!facade.value || !facade.value.isInitialized()) return;

    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [facade]);

  // Copy preset code to clipboard
  const copyPresetCode = () => {
    navigator.clipboard.writeText(presetCode).then(
      () => {
        // Show visual feedback (you could add a toast notification here)
        console.log("Preset code copied to clipboard");
      },
      (err) => {
        console.error("Could not copy preset code", err);
      }
    );
  };

  // Calculate current FPS and frame time
  const frameCount = frameCountRef.current;
  const renderTime =
    frameTimesRef.current.length > 0
      ? frameTimesRef.current.reduce((a, b) => a + b, 0) /
        frameTimesRef.current.length
      : 0;

  if (!visible) return null;

  return (
    <div className={`${styles.devPanel} ${!visible ? styles.hidden : ""}`}>
      <div className={styles.header}>
        <div className={styles.title}>Dev Panel</div>
        <button className={styles.closeButton} onClick={onToggle}>
          ✕
        </button>
      </div>

      {/* Legacy panel content - now without tab wrapping */}
      <div className={styles.tabContent}>
        {/* Keep all the existing content here */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>FPS:</span>
            <span className={styles.statValue}>{fps}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Frame Render Time:</span>
            <span className={styles.statValue}>{renderTime.toFixed(2)} ms</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Frame Count:</span>
            <span className={styles.statValue}>{frameCount}</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Camera Position</div>
          <div className={styles.paramList}>
            {params &&
              ["cameraPosX", "cameraPosY", "cameraPosZ"].map((paramKey) => (
                <div key={paramKey} className={styles.param}>
                  <span className={styles.paramName}>{paramKey}</span>
                  <span className={styles.paramValue}>
                    {typeof params[paramKey as keyof ShaderParams] === "number"
                      ? (
                          params[paramKey as keyof ShaderParams] as number
                        ).toFixed(2)
                      : params[paramKey as keyof ShaderParams]}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Current Parameters</div>
          <div className={styles.paramList}>
            {params &&
              Object.entries(params)
                // Filter out complex objects and functions
                .filter(
                  ([key, value]) =>
                    typeof value !== "object" && typeof value !== "function"
                )
                .map(([key, value]) => (
                  <div key={key} className={styles.param}>
                    <span className={styles.paramName}>{key}</span>
                    <span className={styles.paramValue}>
                      {formatValue(key, value)}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Preset Code</div>
          <button className={styles.copyButton} onClick={copyPresetCode}>
            Copy Code
          </button>
          <div className={styles.presetCode}>{presetCode}</div>
        </div>
      </div>
    </div>
  );
};

export default DevPanel;
