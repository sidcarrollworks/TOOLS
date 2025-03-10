import type { ComponentType } from "preact";
import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import "./styles/index.css";
import { ShaderApp } from "./lib/ShaderApp";
import ShaderCanvas from "./components/ShaderCanvas/ShaderCanvas";
import ControlPanel from "./components/ControlPanel/ControlPanel";
import Layout from "./components/Layout/Layout";
import { DevPanel } from "./components/DevPanel";

export const App: ComponentType = () => {
  const [app, setApp] = useState<ShaderApp | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

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
      // Update the dev panel if it's been set up
      if ("updateDevPanel" in app) {
        (app as any).updateDevPanel();
      }
    }
  }, [app]);

  // Toggle settings handler
  const toggleSettings = useCallback(() => {
    const newShowSettings = !showSettings;
    setShowSettings(newShowSettings);

    // If we're hiding the UI, always hide the stats
    if (!newShowSettings) {
      setShowStats(false);

      // Hide stats element if it exists
      if (app && app.stats) {
        const statsElement = app.stats.dom;
        if (statsElement) {
          statsElement.style.display = "none";
        }
      }
    }
  }, [showSettings, app]);

  // Toggle stats handler
  const toggleStats = useCallback(() => {
    // Toggle the state
    const newShowStats = !showStats;
    setShowStats(newShowStats);

    // Update the DOM element visibility to match the state
    if (app && app.stats) {
      const statsElement = app.stats.dom;
      if (statsElement) {
        statsElement.style.display = newShowStats ? "block" : "none";
      }
    }
  }, [app, showStats]);

  // Toggle dev panel handler
  const toggleDevPanel = useCallback(() => {
    setShowDevPanel(!showDevPanel);
  }, [showDevPanel]);

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
        e.preventDefault(); // Prevent default behavior
        toggleSettings();
      }

      // 'S' to toggle stats visibility - ONLY when UI is visible
      if ((e.key === "s" || e.key === "S") && showSettings) {
        e.preventDefault(); // Prevent default behavior
        toggleStats();
      }

      // 'Ctrl+I' to toggle dev panel
      if ((e.key === "i" || e.key === "I") && e.ctrlKey) {
        e.preventDefault(); // Prevent default behavior
        toggleDevPanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleAnimation, toggleSettings, toggleStats, toggleDevPanel, showSettings]);

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

          // Set initial stats visibility to match showStats state (should be false by default)
          if (shaderApp.stats) {
            const statsElement = shaderApp.stats.dom;
            if (statsElement) {
              statsElement.style.display = "none";
            }
          }
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

  return (
    <>
      <Layout
        viewportContent={viewportContent}
        settingsContent={settingsContent}
        isPaused={app?.params.pauseAnimation}
        showSettings={showSettings}
        onToggleSettings={toggleSettings}
        onToggleStats={toggleStats}
        showStats={showStats}
      />
      <DevPanel 
        app={app} 
        visible={showDevPanel} 
        onToggle={toggleDevPanel} 
      />
    </>
  );
};

export default App;
