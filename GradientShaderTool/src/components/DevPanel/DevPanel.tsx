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
  colors: [
    "gradientMode",
    "color1",
    "color2",
    "color3",
    "color4",
    "backgroundColor",
  ],
  lighting: [
    "lightDirX",
    "lightDirY",
    "lightDirZ",
    "diffuseIntensity",
    "ambientIntensity",
    "rimLightIntensity",
  ],
  visualization: ["showWireframe", "flatShading"],
  animation: ["animationSpeed", "pauseAnimation"],
  export: ["exportTransparentBg", "exportHighQuality"],
};

// Format parameter values for display
const formatValue = (key: string, value: any): string => {
  if (value === undefined || value === null) return "undefined";
  if (typeof value === "number") {
    // Check if it's a color parameter (might be a number format like 0xFFFFFF)
    if (key.toLowerCase().includes("color") && !key.includes("Scale")) {
      if (typeof value === "string" && (value as string).startsWith("#")) {
        return value;
      }
      if (typeof value === "number") {
        const hex = value.toString(16).padStart(6, "0");
        return `#${hex}`;
      }
    }
    // Limit decimal places to 2 for most values
    if (value % 1 !== 0) {
      // If it has a decimal part
      return value.toFixed(2);
    }
    return value.toString();
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
      !key.startsWith("_") &&
      // Include only parameters that are relevant for presets
      (paramCategories.colors.includes(key) ||
        paramCategories.lighting.includes(key) ||
        paramCategories.normalNoise.includes(key) ||
        paramCategories.colorNoise.includes(key) ||
        paramCategories.gradientShift.includes(key) ||
        paramCategories.visualization.includes(key) ||
        key === "geometryType")
  );

  // Create a formatted string of parameters
  return `// Gradient Shader Preset
{
${relevantParams
  .map(([key, value]) => {
    if (typeof value === "string") {
      return `  ${key}: "${value}",`;
    } else if (typeof value === "number") {
      if (key.toLowerCase().includes("color") && !key.includes("Scale")) {
        const hex = value.toString(16).padStart(6, "0");
        return `  ${key}: 0x${hex}, // #${hex}`;
      }
      return `  ${key}: ${value.toFixed(4)},`;
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
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [params, setParams] = useState<ShaderParams | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [drawCallInfo, setDrawCallInfo] = useState<{
    triangles: number;
    drawCalls: number;
    points: number;
    lines: number;
  }>({
    triangles: 0,
    drawCalls: 0,
    points: 0,
    lines: 0,
  });
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [presetCode, setPresetCode] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);

  // Get the facade using the signal
  const facade = useComputed(() => facadeSignal.value);

  // Update parameters periodically
  useEffect(() => {
    if (!facade.value || !facade.value.isInitialized() || !visible) return;

    const interval = setInterval(() => {
      if (facade.value && facade.value.isInitialized()) {
        try {
          const allParams = facade.value.getAllParams();
          setParams({ ...allParams });
          setPresetCode(generatePresetCode(allParams));
        } catch (error) {
          console.error("Error getting params:", error);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [facade, visible]);

  // Performance monitoring
  useEffect(() => {
    if (!facade.value || !facade.value.isInitialized() || !visible) return;

    // Function to calculate FPS and update frame stats
    const countFrames = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;

      if (deltaTime >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / deltaTime));
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;

        // Get renderer stats if facade supports it
        try {
          // Call a method to get renderer info (we'll attempt to access via facade)
          const renderer = (window as any).threeRenderer;
          if (renderer && renderer.info) {
            const info = renderer.info;
            setDrawCallInfo({
              triangles: info.render?.triangles || 0,
              drawCalls: info.render?.calls || 0,
              points: info.render?.points || 0,
              lines: info.render?.lines || 0,
            });

            // Try to estimate memory usage
            if (performance && "memory" in performance) {
              const memory = (performance as any).memory;
              if (memory) {
                setMemoryUsage(
                  Math.round(memory.usedJSHeapSize / (1024 * 1024))
                );
              }
            }
          }
        } catch (error) {
          console.debug("Error getting renderer stats:", error);
        }
      }

      // Continue the loop only if component is visible
      if (visible) {
        requestAnimationFrame(countFrames);
      }
    };

    // Reset and start monitoring
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
    countFrames();

    return () => {
      // Frame monitoring will stop when the condition in countFrames fails
    };
  }, [facade, visible]);

  // Copy preset code to clipboard
  const copyPresetCode = () => {
    navigator.clipboard.writeText(presetCode).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error("Could not copy preset code", err);
        alert("Failed to copy. " + err);
      }
    );
  };

  // Handle category change
  const handleCategoryChange = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    setActiveCategory(select.value);
  };

  // Filter parameters based on selected category
  const filteredParams = params
    ? Object.entries(params).filter(([key, value]) => {
        if (activeCategory === "all") {
          return typeof value !== "object" && typeof value !== "function";
        }

        const categoryParams =
          paramCategories[activeCategory as keyof typeof paramCategories] || [];
        return categoryParams.includes(key);
      })
    : [];

  if (!visible) return null;

  // Debug output
  console.log("DevPanel is rendering with:", {
    hasParams: Boolean(params),
    paramCount: params ? Object.keys(params).length : 0,
    fps,
    drawCallInfo,
    facadeInitialized: facade.value && facade.value.isInitialized(),
    rendererAvailable: Boolean((window as any).threeRenderer),
  });

  return (
    <div className={styles.devPanel}>
      <div className={styles.header}>
        <div className={styles.title}>Dev Panel</div>
        <button className={styles.closeButton} onClick={onToggle}>
          ✕
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.sectionTitle}>Performance Stats</div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>FPS:</span>
            <span className={styles.statValue}>{fps}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Draw Calls:</span>
            <span className={styles.statValue}>{drawCallInfo.drawCalls}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Triangles:</span>
            <span className={styles.statValue}>{drawCallInfo.triangles}</span>
          </div>
          {memoryUsage > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Memory:</span>
              <span className={styles.statValue}>{memoryUsage} MB</span>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Camera Position</div>
          <div className={styles.singleColumnParams}>
            {params &&
              [
                "cameraPosX",
                "cameraPosY",
                "cameraPosZ",
                "cameraTargetX",
                "cameraTargetY",
                "cameraTargetZ",
                "cameraFov",
              ].map((paramKey) => (
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
          <div className={styles.categorySelector}>
            <label>Category:</label>
            <select onChange={handleCategoryChange} value={activeCategory}>
              <option value="all">All Parameters</option>
              <option value="geometry">Geometry</option>
              <option value="colors">Colors</option>
              <option value="lighting">Lighting</option>
              <option value="normalNoise">Normal Noise</option>
              <option value="colorNoise">Color Noise</option>
              <option value="gradientShift">Gradient Shift</option>
              <option value="visualization">Visualization</option>
              <option value="animation">Animation</option>
              <option value="camera">Camera</option>
            </select>
          </div>
          <div
            className={
              activeCategory === "camera"
                ? styles.singleColumnParams
                : styles.paramList
            }
          >
            {filteredParams.length > 0 ? (
              filteredParams.map(([key, value]) => (
                <div key={key} className={styles.param}>
                  <span className={styles.paramName}>{key}</span>
                  <span className={styles.paramValue}>
                    {formatValue(key, value)}
                  </span>
                </div>
              ))
            ) : (
              <div>No parameters in this category</div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Preset Code</div>
          <p className={styles.presetDescription}>
            Copy this code to use as a preset in the codebase:
          </p>
          <button
            className={`${styles.copyButton} ${
              copySuccess ? styles.copySuccess : ""
            }`}
            onClick={copyPresetCode}
          >
            {copySuccess ? "Copied!" : "Copy Code"}
          </button>
          <pre className={styles.presetCode}>{presetCode}</pre>
        </div>
      </div>
    </div>
  );
};

export default DevPanel;
