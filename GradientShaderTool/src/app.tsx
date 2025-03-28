import type { ComponentType } from "preact";
import { useEffect, useRef, useCallback } from "preact/hooks";
import { signal, computed, batch } from "@preact/signals";
import "./styles/index.css";
import ShaderCanvas from "./components/ShaderCanvas/ShaderCanvas";
import { DevPanel } from "./components/DevPanel";
import {
  SidePanel,
  sidePanelVisibleSignal,
} from "./components/SidebarPanel/SidePanel";
// Import splash screen component
import { SplashScreen } from "./components/SplashScreen";
// Import settings system
import {
  initializeSettingsSystem,
  connectSettingsToShaderApp,
  initializeSettingsFromShaderApp,
} from "./lib/settings/initApp";
// Import facade components
import {
  FacadeProvider,
  FacadeErrorBoundary,
} from "./lib/facade/FacadeContext";
import type { IShaderAppFacade } from "./lib/facade/types";
import { KeyboardHintsContainer } from "./components/KeyboardHints/KeyboardHintsContainer";
// Import store initialization
import { initializeStores, initializeStoresWithFacade } from "./lib/stores";
import { OrbitControlsSync } from "./components/ShaderCanvas/OrbitControlsSync";
import { initializePresetStore } from "./lib/stores/presetInitializer";
import { initializeGeometryParameters } from "./lib/stores/GeometryInitializer";
import { getDistortionInitializer } from "./lib/stores/DistortionInitializer";
import { getColorInitializer } from "./lib/stores/ColorInitializer";
import { getLightingInitializer } from "./lib/stores/LightingInitializer";
import { getExportInitializer } from "./lib/stores/ExportInitializer";

// Enable debug mode for diagnostics
if (typeof window !== "undefined") {
  // Set global debug flag for diagnostic logging
  (window as any).__SHADER_DEBUG__ = true;

  // Monitor for the specific error we're troubleshooting
  const originalConsoleError = console.error;
  console.error = function (...args) {
    // Call original console.error
    originalConsoleError.apply(console, args);

    // Look for our specific error message
    const errorMessage = args[0]?.message || args[0] || "";
    if (
      typeof errorMessage === "string" &&
      errorMessage.includes(
        "message channel closed before a response was received"
      )
    ) {
      console.warn("[DIAGNOSTIC] Message channel closed error detected:", {
        timestamp: new Date().toISOString(),
        stack: new Error().stack,
        context: {
          // Capture information about the current state that might help debug
          activeElement: document.activeElement?.tagName,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          documentState: document.readyState,
          visibilityState: document.visibilityState,
        },
      });
    }
  };
}

// Create signals for app state
export const facadeSignal = signal<IShaderAppFacade | null>(null);
const showSettingsSignal = signal(true);
const showStatsSignal = signal(false);
const showDevPanelSignal = signal(false);
const isFullscreenSignal = signal(false);
const appInitializedSignal = signal(false);
const initializationErrorSignal = signal<string | null>(null);
// Add splash screen visibility signal
export const splashScreenVisibleSignal = signal(true);
// Add a signal to track initialization attempts
const initAttemptSignal = signal(0);
// Add a signal to control when to trigger initialization
const triggerInitSignal = signal(0);

// Initialize the splash screen visibility from localStorage
if (typeof window !== "undefined") {
  const hasSeenSplashScreen = localStorage.getItem("hasSeenSplashScreen");
  if (hasSeenSplashScreen === "true") {
    splashScreenVisibleSignal.value = false;
  }
}

// Computed value for whether animation is paused
const isPausedSignal = computed(() => {
  const facade = facadeSignal.value;
  if (!facade || !facade.isInitialized()) return false;

  // Get the pauseAnimation parameter from the facade
  return facade.getParam("pauseAnimation");
});

// Initialize the settings system
initializeSettingsSystem();

// Initialize the stores
initializeStores();

// Add a useEffect hook to initialize our settings system
export const App: ComponentType = () => {
  // Reference to the shader canvas container
  const shaderCanvasRef = useRef<HTMLDivElement | null>(null);
  const isInitializingRef = useRef(false);
  const cleanupInProgressRef = useRef(false);

  // Toggle animation handler
  const toggleAnimation = useCallback(() => {
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      // Toggle the animation state using the facade
      const currentPaused = facade.getParam("pauseAnimation");
      facade.updateParam("pauseAnimation", !currentPaused);
    }
  }, []);

  // Toggle settings handler
  const toggleSettings = useCallback(() => {
    const newShowSettings = !showSettingsSignal.value;
    showSettingsSignal.value = newShowSettings;

    // If we're hiding the UI, always hide the stats
    if (!newShowSettings) {
      showStatsSignal.value = false;

      // Hide stats element if it exists
      const facade = facadeSignal.value;
      if (facade && facade.isInitialized()) {
        // The facade handles stats visibility internally
        // We just need to update our local state
      }
    }
  }, []);

  // Toggle stats handler
  const toggleStats = useCallback(() => {
    // Toggle the state
    const newShowStats = !showStatsSignal.value;
    showStatsSignal.value = newShowStats;

    // Try to update the facade configuration for stats if possible
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      try {
        // @ts-ignore - Some implementations might have this parameter
        facade.updateParam("showStats", newShowStats);
      } catch (e) {
        // Ignore if parameter doesn't exist
      }
    }

    // Look for a Stats.js panel in the DOM
    // Stats.js typically creates a container with position:absolute at top:0, left:0
    // Try various querySelector approaches to find it
    let statsElement = document.querySelector(
      '[class^="stats"]'
    ) as HTMLElement;

    if (!statsElement) {
      // Try to find it by common attributes
      const elements = document.querySelectorAll("div");
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        try {
          if (
            el.style.position === "absolute" &&
            el.style.top === "0px" &&
            el.style.left === "0px" &&
            el.children.length > 0
          ) {
            statsElement = el;
            break;
          }
        } catch (err) {
          // Ignore errors from accessing style properties
          continue;
        }
      }
    }

    // If we found an element that looks like a Stats.js panel, toggle its visibility
    if (statsElement) {
      try {
        statsElement.style.display = newShowStats ? "block" : "none";
      } catch (err) {
        console.error("Error toggling stats visibility:", err);
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
    // Force a resize event to update the renderer
    window.dispatchEvent(new Event("resize"));
  }, [showSettingsSignal.value]);

  // Handle facade initialization callback
  const handleFacadeInitialized = useCallback((facade: IShaderAppFacade) => {
    batch(() => {
      facadeSignal.value = facade;
      appInitializedSignal.value = true;
      initializationErrorSignal.value = null;

      // Initialize settings from the facade
      initializeSettingsFromShaderApp(facade);

      // Connect settings to the facade
      connectSettingsToShaderApp(facade);

      // Initialize stores
      initializeStores();
      // Initialize stores with facade
      initializeStoresWithFacade();
      // Initialize preset store with our predefined presets
      initializePresetStore();
      // Initialize geometry parameters
      initializeGeometryParameters();

      // Initialize our refactored distortion parameters
      getDistortionInitializer().syncWithFacade();
      // Initialize our refactored color parameters
      getColorInitializer().syncWithFacade();
      // Initialize our refactored lighting parameters
      getLightingInitializer().syncWithFacade();
      // Initialize our refactored export parameters
      getExportInitializer().syncWithFacade();

      // Disable adaptive resolution for higher quality
      facade.updateParam("useAdaptiveResolution", false);
    });

    // Reset the initializing flag
    isInitializingRef.current = false;
  }, []);

  // Handle facade initialization error
  const handleFacadeError = useCallback((error: Error) => {
    console.error("Failed to initialize ShaderAppFacade:", error);

    batch(() => {
      initializationErrorSignal.value = error.message;
      appInitializedSignal.value = false;
    });

    // Reset the initializing flag
    isInitializingRef.current = false;
  }, []);

  // Effect to clean up canvas on unmount
  useEffect(() => {
    return () => {
      if (facadeSignal.value) {
        facadeSignal.value.dispose();
      }
    };
  }, []);

  // Render the application
  return (
    <div
      className={`app-container ${
        isFullscreenSignal.value ? "fullscreen" : ""
      }`}
    >
      <FacadeErrorBoundary
        fallback={(error) => (
          <div className="error-container">
            <h1>Shader App Error</h1>
            <p>{error.message}</p>
            <button onClick={() => triggerInitSignal.value++}>Retry</button>
          </div>
        )}
        onError={(error) => {
          initializationErrorSignal.value = error.message;
        }}
      >
        <FacadeProvider
          containerRef={shaderCanvasRef}
          onInitialized={handleFacadeInitialized}
          onError={handleFacadeError}
        >
          <div className="main-container">
            {/* ShaderCanvas is wrapped with a container for proper positioning */}
            <ShaderCanvas ref={shaderCanvasRef} />

            {/* Only show UI components if the app is initialized and facade is available */}
            {appInitializedSignal.value && facadeSignal.value && (
              <>
                <OrbitControlsSync />
                {sidePanelVisibleSignal.value && <SidePanel visible={true} />}
                <KeyboardHintsContainer
                  showSettings={showSettingsSignal.value}
                  isFullscreen={isFullscreenSignal.value}
                />

                {showDevPanelSignal.value && (
                  <DevPanel
                    visible={showDevPanelSignal.value}
                    onToggle={toggleDevPanel}
                  />
                )}
              </>
            )}

            {/* Splash screen */}
            <SplashScreen
              visible={splashScreenVisibleSignal.value}
              onClose={() => (splashScreenVisibleSignal.value = false)}
            />
          </div>
        </FacadeProvider>
      </FacadeErrorBoundary>
    </div>
  );
};

export default App;
