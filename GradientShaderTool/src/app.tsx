import type { ComponentType } from "preact";
import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import "./styles/index.css";
import { ShaderApp } from "./lib/ShaderApp";
import ShaderCanvas from "./components/ShaderCanvas/ShaderCanvas";
import ControlPanel from "./components/ControlPanel/ControlPanel";
import Layout from "./components/Layout/Layout";
import Performance from "./components/Performance/Performance";

export const App: ComponentType = () => {
  const [app, setApp] = useState<ShaderApp | null>(null);
  const [showSettings, setShowSettings] = useState(true);

  // Reference to the shader canvas container
  const shaderCanvasRef = useRef<HTMLDivElement | null>(null);

  // Toggle animation handler
  const toggleAnimation = useCallback(() => {
    if (app) {
      app.params.pauseAnimation = !app.params.pauseAnimation;
      // Update the GUI if it's been set up
      if ("updateGUI" in app) {
        (app as any).updateGUI();
      }
    }
  }, [app]);

  // Toggle settings handler
  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space bar to toggle animation
      if (e.code === "Space" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault(); // Prevent space from scrolling the page
        toggleAnimation();
      }

      // 'H' to toggle settings panel
      if (e.key === "h" || e.key === "H") {
        toggleSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleAnimation, toggleSettings]);

  // Handle resize when settings panel is toggled
  useEffect(() => {
    if (app && app.renderer) {
      // Force a resize event to update the renderer
      window.dispatchEvent(new Event("resize"));
    }
  }, [showSettings, app]);

  // Initialize ShaderApp
  useEffect(() => {
    // Get a reference to the shader canvas element
    const shaderCanvasElement = document.getElementById("shader-canvas");
    shaderCanvasRef.current = shaderCanvasElement as HTMLDivElement;

    // Initialize the shader app if it doesn't exist and we have a reference to the canvas
    if (!app && shaderCanvasRef.current) {
      const shaderApp = new ShaderApp();
      shaderApp
        .init(shaderCanvasRef.current.parentElement as HTMLElement)
        .then(() => {
          setApp(shaderApp);
        });
    }

    // Clean up on unmount
    return () => {
      if (app) {
        app.dispose();
      }
    };
  }, [app]);

  // Create component content
  const viewportContent = (
    <div style={{ width: "100%", height: "100%" }}>
      <ShaderCanvas canvasId="shader-canvas" />
    </div>
  );

  const settingsContent = <ControlPanel app={app} />;

  const performanceContent = <Performance statsInstance={app?.stats} />;

  return (
    <Layout
      viewportContent={viewportContent}
      settingsContent={settingsContent}
      performanceContent={performanceContent}
      isPaused={app?.params.pauseAnimation}
      showSettings={showSettings}
      onToggleSettings={toggleSettings}
    />
  );
};

export default App;
