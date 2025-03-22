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

// Create signals for app state
// ... existing code ...

// Handle facade initialization callback
const handleFacadeInitialized = useCallback((facade: IShaderAppFacade) => {
  console.log("Facade initialized successfully, updating facadeSignal");

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
    console.log("App: Initializing color parameters from facade");
    getColorInitializer().syncWithFacade();
    console.log("App: Color parameters initialized");
    // Initialize our refactored lighting parameters
    console.log("App: Initializing lighting parameters from facade");
    getLightingInitializer().syncWithFacade();
    console.log("App: Lighting parameters initialized");

    console.log("Stores initialized with facade");
    console.log("Stores initialized");

    // Disable adaptive resolution to maintain high quality
    facade.updateParam("useAdaptiveResolution", false);
    // Force recreation of geometry to ensure it's at full resolution
    facade.recreateGeometry(true);
    console.log("Adaptive resolution disabled for higher quality");
  });
}, []);
// ... rest of the code ...
