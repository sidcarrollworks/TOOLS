import type { ComponentType } from "preact";
import { useEffect, useRef, useCallback } from "preact/hooks";
import { signal, computed, batch } from "@preact/signals";
import "./styles/index.css";
import { ShaderApp } from "./lib/ShaderApp";
import ShaderCanvas from "./components/ShaderCanvas/ShaderCanvas";
import Layout from "./components/Layout/Layout";
import { DevPanel } from "./components/DevPanel";
import { sidePanelVisibleSignal } from "./components/SidebarPanel";
// Import settings system
import {
  initializeSettingsSystem,
  connectSettingsToShaderApp,
  initializeSettingsFromShaderApp,
} from "./lib/settings/initApp";

// Create signals for app state
export const appSignal = signal<ShaderApp | null>(null);
const showSettingsSignal = signal(true);
const showStatsSignal = signal(false);
const showDevPanelSignal = signal(false);
const isFullscreenSignal = signal(false);
const appInitializedSignal = signal(false);
const initializationErrorSignal = signal<string | null>(null);
// Add a signal to track initialization attempts
const initAttemptSignal = signal(0);
// Add a signal to control when to trigger initialization
const triggerInitSignal = signal(0);

// Computed value for whether animation is paused
const isPausedSignal = computed(() => {
  return appSignal.value?.params.pauseAnimation ?? false;
});

// Initialize the settings system
initializeSettingsSystem();

// Add a useEffect hook to initialize our settings system
export const App: ComponentType = () => {
  // Reference to the shader canvas container
  const shaderCanvasRef = useRef<HTMLDivElement | null>(null);
  const isInitializingRef = useRef(false);
  const cleanupInProgressRef = useRef(false);

  // Toggle animation handler
  const toggleAnimation = useCallback(() => {
    const app = appSignal.value;
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
  }, []);

  // Toggle settings handler
  const toggleSettings = useCallback(() => {
    const newShowSettings = !showSettingsSignal.value;
    // console.log("Toggling settings:", {
    //   newShowSettings,
    //   appExists: !!appSignal.value,
    // });
    showSettingsSignal.value = newShowSettings;

    // If we're hiding the UI, always hide the stats
    if (!newShowSettings) {
      showStatsSignal.value = false;

      // Hide stats element if it exists
      const app = appSignal.value;
      if (app && app.stats) {
        const statsElement = app.stats.dom;
        if (statsElement) {
          statsElement.style.display = "none";
        }
      }
    }
  }, []);

  // Toggle stats handler
  const toggleStats = useCallback(() => {
    // Toggle the state
    const newShowStats = !showStatsSignal.value;
    showStatsSignal.value = newShowStats;

    // Update the DOM element visibility to match the state
    const app = appSignal.value;
    if (app && app.stats) {
      const statsElement = app.stats.dom;
      if (statsElement) {
        statsElement.style.display = newShowStats ? "block" : "none";
      }
    }
  }, []);

  // Toggle dev panel handler
  const toggleDevPanel = useCallback(() => {
    showDevPanelSignal.value = !showDevPanelSignal.value;
  }, []);

  // Toggle fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement
        .requestFullscreen()
        .then(() => {
          isFullscreenSignal.value = true;
        })
        .catch((err) => {
          console.error(
            `Error attempting to enable fullscreen: ${err.message}`
          );
        });
    } else {
      // Exit fullscreen
      document
        .exitFullscreen()
        .then(() => {
          isFullscreenSignal.value = false;
        })
        .catch((err) => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`);
        });
    }
  }, []);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space bar to toggle animation
      if (e.code === "Space" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault(); // Prevent space from scrolling the page
        toggleAnimation();
      }

      // 'H' to toggle settings panel and sidepanel
      if (e.key === "h" || e.key === "H") {
        e.preventDefault(); // Prevent default behavior
        toggleSettings();
        // Toggle sidepanel visibility
        sidePanelVisibleSignal.value = !sidePanelVisibleSignal.value;
      }

      // 'S' to toggle stats visibility - ONLY when UI is visible
      if ((e.key === "s" || e.key === "S") && showSettingsSignal.value) {
        e.preventDefault(); // Prevent default behavior
        toggleStats();
      }

      // 'Ctrl+I' to toggle dev panel
      if ((e.key === "d" || e.key === "D") && e.ctrlKey) {
        e.preventDefault(); // Prevent default behavior
        toggleDevPanel();
      }

      // 'F' to toggle fullscreen
      if (e.key === "f" || e.key === "F") {
        e.preventDefault(); // Prevent default behavior
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    toggleAnimation,
    toggleSettings,
    toggleStats,
    toggleDevPanel,
    toggleFullscreen,
  ]);

  // Handle resize when settings panel is toggled
  useEffect(() => {
    const app = appSignal.value;
    if (app && app.renderer) {
      // Force a resize event to update the renderer
      window.dispatchEvent(new Event("resize"));
    }
  }, [showSettingsSignal.value]);

  // Initialize ShaderApp
  useEffect(() => {
    // Prevent multiple simultaneous initialization attempts
    if (isInitializingRef.current) {
      // console.log("Initialization already in progress, skipping");
      return;
    }

    // Don't re-initialize if we already have an app
    if (appSignal.value) {
      // console.log("App already initialized, skipping");
      return;
    }

    // Get a reference to the shader canvas element
    const shaderCanvasElement = document.getElementById("shader-canvas");
    shaderCanvasRef.current = shaderCanvasElement as HTMLDivElement;

    // Initialize the shader app if it doesn't exist and we have a reference to the canvas
    if (!appSignal.value && shaderCanvasRef.current) {
      isInitializingRef.current = true;
      initAttemptSignal.value += 1;
      // console.log(
      //   `Initializing ShaderApp (attempt ${initAttemptSignal.value})`
      // );

      const shaderApp = new ShaderApp();

      try {
        shaderApp
          .init(shaderCanvasRef.current.parentElement as HTMLElement)
          .then(() => {
            // console.log("ShaderApp initialized successfully");
            // Batch the signal updates together to prevent intermediate renders with inconsistent state
            batch(() => {
              appSignal.value = shaderApp;
              appInitializedSignal.value = true;
              initializationErrorSignal.value = null;

              // Initialize settings from the shader app
              initializeSettingsFromShaderApp(shaderApp);

              // Connect settings to the shader app
              connectSettingsToShaderApp(shaderApp);
            });

            // Set initial stats visibility to match showStats state (should be false by default)
            if (shaderApp.stats) {
              const statsElement = shaderApp.stats.dom;
              if (statsElement) {
                statsElement.style.display = "none";
              }
            }

            // Reset the initializing flag
            isInitializingRef.current = false;
          })
          .catch((error) => {
            console.error("Failed to initialize ShaderApp:", error);
            initializationErrorSignal.value =
              error.message || "Initialization failed";

            // Reset the initializing flag
            isInitializingRef.current = false;

            // Retry initialization if we haven't tried too many times
            if (initAttemptSignal.value < 3) {
              // console.log("Scheduling retry...");
              setTimeout(() => {
                // Increment the trigger signal to force a re-initialization
                triggerInitSignal.value += 1;
              }, 1000);
            }
          });
      } catch (error) {
        console.error("Error during ShaderApp initialization:", error);
        initializationErrorSignal.value =
          error instanceof Error ? error.message : "Unknown error";

        // Reset the initializing flag
        isInitializingRef.current = false;
      }
    }

    // Clean up on unmount
    return () => {
      // Prevent multiple cleanup operations
      if (cleanupInProgressRef.current) {
        // console.log("Cleanup already in progress, skipping");
        return;
      }

      const app = appSignal.value;
      if (app) {
        // console.log("Cleaning up ShaderApp resources");
        cleanupInProgressRef.current = true;

        try {
          // Unsubscribe from settings if there's a subscription
          if ((app as any).settingsUnsubscribe) {
            (app as any).settingsUnsubscribe();
          }

          app.dispose();
          console.log("ShaderApp resources cleaned up successfully");
        } catch (error) {
          console.error("Error during ShaderApp cleanup:", error);
        } finally {
          // Reset the app signal
          appSignal.value = null;
          cleanupInProgressRef.current = false;
        }
      }
    };
  }, [triggerInitSignal.value]); // Only re-run when triggerInitSignal changes

  // Initialize settings system
  useEffect(() => {
    // Initialize settings system
    initializeSettingsSystem();
    console.log("Settings system initialized");
  }, []);

  // Create component content
  const viewportContent = (
    <div style={{ width: "100%", height: "100%" }}>
      <ShaderCanvas canvasId="shader-canvas" />
      {initializationErrorSignal.value && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(255,0,0,0.1)",
            padding: "20px",
            borderRadius: "8px",
            color: "red",
            textAlign: "center",
          }}
        >
          Error: {initializationErrorSignal.value}
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => {
                appInitializedSignal.value = false;
                initializationErrorSignal.value = null;
              }}
              style={{
                padding: "8px 16px",
                background: "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Only render ControlPanel when app is available and initialized
  const settingsContent = appInitializedSignal.value ? (
    // Temporarily disable the ControlPanel
    // <ControlPanel app={appSignal.value} key="control-panel" />
    <div style={{ padding: "20px" }}>
      <div>Control Panel Disabled</div>
    </div>
  ) : (
    <div style={{ padding: "20px" }}>
      <div>Loading app...</div>
      {initAttemptSignal.value > 1 && (
        <div style={{ marginTop: "10px", fontSize: "0.8em", color: "#888" }}>
          Attempt {initAttemptSignal.value}
        </div>
      )}

      {initAttemptSignal.value >= 2 && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => {
              console.log("Manual app initialization attempt");
              // Force a re-initialization by incrementing the trigger signal
              triggerInitSignal.value += 1;
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
            Debug: Reinitialize App
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Layout
        viewportContent={viewportContent}
        settingsContent={settingsContent}
        isPaused={isPausedSignal.value}
        showSettings={showSettingsSignal.value}
        onToggleSettings={toggleSettings}
        onToggleStats={toggleStats}
        showStats={showStatsSignal.value}
        isFullscreen={isFullscreenSignal.value}
      />
      <DevPanel
        app={appSignal.value}
        visible={showDevPanelSignal.value}
        onToggle={toggleDevPanel}
      />
    </>
  );
};

export default App;
