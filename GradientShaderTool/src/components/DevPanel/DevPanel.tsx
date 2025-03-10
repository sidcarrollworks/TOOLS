import type { FunctionComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import type { ShaderApp, ShaderParams } from "../../lib/ShaderApp";
import styles from "./DevPanel.module.css";

interface DevPanelProps {
  app: ShaderApp | null;
  visible: boolean;
  onToggle: () => void;
}

// Group parameters by category for better organization
const paramCategories = {
  geometry: ["planeWidth", "planeHeight", "planeSegments"],
  rotation: ["rotationX", "rotationY", "rotationZ"],
  camera: [
    "cameraDistance", "cameraFov", 
    "cameraPosX", "cameraPosY", "cameraPosZ", 
    "cameraTargetX", "cameraTargetY", "cameraTargetZ"
  ],
  normalNoise: [
    "normalNoiseScaleX", "normalNoiseScaleY", "normalNoiseSpeed", 
    "normalNoiseStrength", "normalNoiseShiftX", "normalNoiseShiftY", 
    "normalNoiseShiftSpeed"
  ],
  colorNoise: ["colorNoiseScale", "colorNoiseSpeed"],
  gradientShift: ["gradientShiftX", "gradientShiftY", "gradientShiftSpeed"],
  colors: ["gradientMode", "color1", "color2", "color3", "color4"],
  lighting: [
    "lightDirX", "lightDirY", "lightDirZ", 
    "diffuseIntensity", "ambientIntensity", "rimLightIntensity"
  ],
  visualization: ["backgroundColor", "showWireframe", "flatShading"],
  animation: ["animationSpeed", "pauseAnimation"],
  export: ["exportTransparentBg", "exportHighQuality"]
};

// Helper function to format values for display
const formatValue = (key: string, value: any): string => {
  if (typeof value === "number") {
    // Format numbers with precision
    return value.toFixed(4);
  } else if (typeof value === "boolean") {
    return value ? "true" : "false";
  } else {
    return String(value);
  }
};

// Helper function to generate preset code
const generatePresetCode = (params: ShaderParams): string => {
  return `// Preset: Custom Preset
const customPreset = () => {
  // Geometry
  this.params.planeWidth = ${params.planeWidth};
  this.params.planeHeight = ${params.planeHeight};
  this.params.planeSegments = ${params.planeSegments};

  // Rotation
  this.params.rotationX = ${params.rotationX};
  this.params.rotationY = ${params.rotationY};
  this.params.rotationZ = ${params.rotationZ};

  // Camera
  this.params.cameraDistance = ${params.cameraDistance};
  this.params.cameraFov = ${params.cameraFov};
  this.params.cameraPosX = ${params.cameraPosX};
  this.params.cameraPosY = ${params.cameraPosY};
  this.params.cameraPosZ = ${params.cameraPosZ};
  this.params.cameraTargetX = ${params.cameraTargetX};
  this.params.cameraTargetY = ${params.cameraTargetY};
  this.params.cameraTargetZ = ${params.cameraTargetZ};

  // Normal Noise
  this.params.normalNoiseScaleX = ${params.normalNoiseScaleX};
  this.params.normalNoiseScaleY = ${params.normalNoiseScaleY};
  this.params.normalNoiseSpeed = ${params.normalNoiseSpeed};
  this.params.normalNoiseStrength = ${params.normalNoiseStrength};
  this.params.normalNoiseShiftX = ${params.normalNoiseShiftX};
  this.params.normalNoiseShiftY = ${params.normalNoiseShiftY};
  this.params.normalNoiseShiftSpeed = ${params.normalNoiseShiftSpeed};

  // Color Noise
  this.params.colorNoiseScale = ${params.colorNoiseScale};
  this.params.colorNoiseSpeed = ${params.colorNoiseSpeed};

  // Gradient Shift
  this.params.gradientShiftX = ${params.gradientShiftX};
  this.params.gradientShiftY = ${params.gradientShiftY};
  this.params.gradientShiftSpeed = ${params.gradientShiftSpeed};

  // Colors
  this.params.gradientMode = ${params.gradientMode};
  this.params.color1 = "${params.color1}";
  this.params.color2 = "${params.color2}";
  this.params.color3 = "${params.color3}";
  this.params.color4 = "${params.color4}";

  // Lighting
  this.params.lightDirX = ${params.lightDirX};
  this.params.lightDirY = ${params.lightDirY};
  this.params.lightDirZ = ${params.lightDirZ};
  this.params.diffuseIntensity = ${params.diffuseIntensity};
  this.params.ambientIntensity = ${params.ambientIntensity};
  this.params.rimLightIntensity = ${params.rimLightIntensity};

  // Visualization
  this.params.backgroundColor = "${params.backgroundColor}";
  this.params.showWireframe = ${params.showWireframe};
  this.params.flatShading = ${params.flatShading};

  // Animation
  this.params.animationSpeed = ${params.animationSpeed};
  this.params.pauseAnimation = ${params.pauseAnimation};

  // Apply all changes
  this.recreatePlane();
  this.updateParams(true);
};`;
};

export const DevPanel: FunctionComponent<DevPanelProps> = ({ 
  app, 
  visible, 
  onToggle 
}) => {
  const [params, setParams] = useState<ShaderParams | null>(null);
  const [activeTab, setActiveTab] = useState<string>("params");
  const [fps, setFps] = useState<number>(0);
  const [triangleCount, setTriangleCount] = useState<number>(0);
  const [drawCalls, setDrawCalls] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [presetCode, setPresetCode] = useState<string>("");
  
  const fpsCounterRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Update parameters and stats
  useEffect(() => {
    if (!app) return;

    // Initial update
    setParams({ ...app.params });
    updateStats();

    // Set up interval for stats updates
    const statsInterval = setInterval(updateStats, 1000);

    // Set up animation frame for FPS counting
    const countFrames = () => {
      frameCountRef.current++;
      requestAnimationFrame(countFrames);
    };
    const frameId = requestAnimationFrame(countFrames);

    // Add a method to update the dev panel from the app
    (app as any).updateDevPanel = () => {
      setParams({ ...app.params });
    };

    return () => {
      clearInterval(statsInterval);
      cancelAnimationFrame(frameId);
    };
  }, [app]);

  // Update preset code when params change
  useEffect(() => {
    if (params) {
      setPresetCode(generatePresetCode(params));
    }
  }, [params]);

  // Update stats
  const updateStats = () => {
    if (!app) return;

    // Calculate FPS
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    if (delta > 0) {
      setFps(Math.round((frameCountRef.current * 1000) / delta));
      lastTimeRef.current = now;
      frameCountRef.current = 0;
    }

    // Get triangle count
    if (app.geometry) {
      setTriangleCount(app.geometry.attributes.position.count / 3);
    }

    // Get draw calls (estimate)
    setDrawCalls(app.scene ? app.scene.children.length : 0);

    // Get memory usage (estimate)
    if (app.renderer) {
      const memory = (app.renderer as any).info?.memory;
      if (memory) {
        setMemoryUsage(memory.geometries + memory.textures);
      }
    }
  };

  // Copy preset code to clipboard
  const copyPresetCode = () => {
    navigator.clipboard.writeText(presetCode)
      .then(() => {
        alert("Preset code copied to clipboard!");
      })
      .catch(err => {
        console.error("Failed to copy preset code:", err);
      });
  };

  // If app or params are not available, show nothing
  if (!app || !params) {
    return null;
  }

  return (
    <div className={`${styles.devPanel} ${visible ? "" : styles.hidden}`}>
      <div className={styles.header}>
        <div className={styles.title}>Shader Dev Panel (Ctrl+I)</div>
        <button className={styles.closeButton} onClick={onToggle}>×</button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === "params" ? styles.active : ""}`}
          onClick={() => setActiveTab("params")}
        >
          Parameters
        </button>
        <button 
          className={`${styles.tab} ${activeTab === "stats" ? styles.active : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          Performance
        </button>
        <button 
          className={`${styles.tab} ${activeTab === "preset" ? styles.active : ""}`}
          onClick={() => setActiveTab("preset")}
        >
          Preset Code
        </button>
      </div>

      {/* Parameters Tab */}
      <div className={`${styles.tabContent} ${activeTab === "params" ? styles.active : ""}`}>
        {Object.entries(paramCategories).map(([category, paramKeys]) => (
          <div key={category} className={styles.section}>
            <div className={styles.sectionTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</div>
            <div className={styles.paramList}>
              {paramKeys.map(key => {
                const paramKey = key as keyof ShaderParams;
                const value = params[paramKey];
                const isColor = key.toLowerCase().includes("color");
                
                return (
                  <div key={key} className={styles.param}>
                    <span className={styles.paramName}>{key}:</span>
                    <span className={styles.paramValue}>
                      {isColor && typeof value === "string" && (
                        <span 
                          className={styles.colorValue} 
                          style={{ backgroundColor: value }}
                        />
                      )}
                      {formatValue(key, value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Stats Tab */}
      <div className={`${styles.tabContent} ${activeTab === "stats" ? styles.active : ""}`}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Performance Metrics</div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>FPS:</span>
            <span className={styles.statValue}>{fps}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Triangles:</span>
            <span className={styles.statValue}>{triangleCount}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Draw Calls:</span>
            <span className={styles.statValue}>{drawCalls}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Memory Objects:</span>
            <span className={styles.statValue}>{memoryUsage}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Shader Uniforms:</span>
            <span className={styles.statValue}>
              {app.uniforms ? Object.keys(app.uniforms).length : 0}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Animation Time:</span>
            <span className={styles.statValue}>{app.time.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Preset Code Tab */}
      <div className={`${styles.tabContent} ${activeTab === "preset" ? styles.active : ""}`}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Preset Code</div>
          <div className={styles.presetCode}>{presetCode}</div>
          <button className={styles.copyButton} onClick={copyPresetCode}>
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevPanel; 