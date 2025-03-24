import { Signal } from "@preact/signals";
import { InitializerBase } from "./InitializerBase";
import { getHistoryStore } from "./HistoryStore";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";

/**
 * Geometry parameter types
 */
export interface GeometryParameters {
  // Core geometry properties
  geometryType: string;
  wireframe: boolean;
  resolution: number;
  useAdaptiveResolution: boolean;

  // Plane geometry
  planeWidth: number;
  planeHeight: number;
  planeSegments: number;

  // Sphere geometry
  sphereRadius: number;
  sphereWidthSegments: number;
  sphereHeightSegments: number;

  // Cube geometry
  cubeSize: number;
  cubeSegments: number;
}

/**
 * Default geometry parameters
 */
const DEFAULT_GEOMETRY_PARAMETERS: GeometryParameters = {
  // Core geometry properties
  geometryType: "plane",
  wireframe: false,
  resolution: 128,
  useAdaptiveResolution: false,

  // Plane geometry
  planeWidth: 10,
  planeHeight: 10,
  planeSegments: 128,

  // Sphere geometry
  sphereRadius: 5,
  sphereWidthSegments: 128,
  sphereHeightSegments: 128,

  // Cube geometry
  cubeSize: 5,
  cubeSegments: 64,
};

/**
 * Parameter definitions for geometry initializer
 */
export const PARAMETER_DEFINITIONS = {
  geometryType: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.geometryType,
    facadeParam: "geometryType",
  },
  wireframe: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.wireframe,
    facadeParam: "showWireframe",
  },
  resolution: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.resolution,
    facadeParam: "resolution",
  },
  useAdaptiveResolution: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.useAdaptiveResolution,
    facadeParam: "useAdaptiveResolution",
  },
  planeWidth: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.planeWidth,
    facadeParam: "planeWidth",
  },
  planeHeight: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.planeHeight,
    facadeParam: "planeHeight",
  },
  planeSegments: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.planeSegments,
    facadeParam: "planeSegments",
  },
  sphereRadius: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.sphereRadius,
    facadeParam: "sphereRadius",
  },
  sphereWidthSegments: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.sphereWidthSegments,
    facadeParam: "sphereWidthSegments",
  },
  sphereHeightSegments: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.sphereHeightSegments,
    facadeParam: "sphereHeightSegments",
  },
  cubeSize: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.cubeSize,
    facadeParam: "cubeSize",
  },
  cubeSegments: {
    defaultValue: DEFAULT_GEOMETRY_PARAMETERS.cubeSegments,
    facadeParam: "cubeSegments",
  },
};

/**
 * Mapping of geometry types to their segment parameters
 */
const GEOMETRY_TYPE_TO_SEGMENTS: Record<string, string> = {
  plane: "planeSegments",
  sphere: "sphereWidthSegments", // We'll update both width and height segments
  cube: "cubeSegments",
};

/**
 * Minimum resolution value
 */
export const MIN_RESOLUTION = 4;

/**
 * Maximum resolution value
 */
export const MAX_RESOLUTION = 512;

/**
 * Class for initializing and managing geometry parameters
 */
export class GeometryInitializer extends InitializerBase<GeometryParameters> {
  /**
   * Rebuild timeout
   */
  private rebuildTimeout: number | null = null;

  constructor() {
    super(PARAMETER_DEFINITIONS, {
      autoSync: true,
      debug: false,
      updateFacade: true,
    });

    // Listen for facade updates
    this.initFacadeListeners();
  }

  /**
   * Initialize facade listeners
   */
  private initFacadeListeners(): void {
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) return;

    // Listen for geometry changes
    facade.on("geometry-changed", this.handleGeometryChanged.bind(this));
  }

  /**
   * Handle geometry changed event from facade
   */
  private handleGeometryChanged(data: any): void {
    if (!data) return;

    // Show toast with performance info for significant rebuilds
    if (data.buildTimeMs > 100) {
      const uiStore = getUIStore();
      uiStore.showToast(
        `Geometry rebuilt: ${
          data.vertexCount?.toLocaleString() || "0"
        } vertices, ${data.buildTimeMs}ms`,
        "info"
      );
    }
  }

  /**
   * Update a geometry parameter with history tracking and optional geometry recreation
   */
  updateGeometryParameter<K extends keyof GeometryParameters>(
    paramName: K,
    value: GeometryParameters[K],
    recreateGeometry = true
  ): boolean {
    // Get current value for history tracking
    const oldValue = this.getSignal(paramName).value;

    // Update the parameter
    const result = this.updateParameter(paramName, value);

    // Record the change in history
    if (result) {
      const historyStore = getHistoryStore();
      historyStore.recordAction(
        `Updated ${String(paramName)}`,
        { [paramName]: oldValue },
        { [paramName]: value },
        `geometry-update-${String(paramName)}`
      );

      // Recreate geometry if needed
      if (recreateGeometry) {
        this.scheduleGeometryRebuild();
      }
    }

    return result;
  }

  /**
   * Update geometry type
   */
  updateGeometryType(geometryType: string): boolean {
    // Don't update if it's the same type
    if (this.getSignal("geometryType").value === geometryType) {
      return true;
    }

    // Get the current values for history
    const oldType = this.getSignal("geometryType").value;

    // Update the type
    const result = this.updateParameter("geometryType", geometryType);

    // Record the change in history
    if (result) {
      const historyStore = getHistoryStore();
      historyStore.recordAction(
        `Changed geometry type to ${geometryType}`,
        { geometryType: oldType },
        { geometryType },
        "geometry-type-change"
      );

      // Update resolution parameter based on geometry type
      this.updateResolutionForGeometryType(this.getSignal("resolution").value);

      // Recreate geometry
      this.scheduleGeometryRebuild();
    }

    return result;
  }

  /**
   * Update wireframe state
   */
  updateWireframe(wireframe: boolean): boolean {
    // Get current value for history
    const oldValue = this.getSignal("wireframe").value;

    // Update the parameter
    const result = this.updateParameter("wireframe", wireframe);

    // Record the change in history
    if (result) {
      const historyStore = getHistoryStore();
      historyStore.recordAction(
        `${wireframe ? "Enabled" : "Disabled"} wireframe`,
        { wireframe: oldValue },
        { wireframe },
        "geometry-wireframe-change"
      );

      // Force a geometry rebuild to ensure wireframe is applied
      this.scheduleGeometryRebuild();
    }

    return result;
  }

  /**
   * Update the resolution
   */
  updateResolution(resolution: number, recreateGeometry = true): boolean {
    // Get current value for history
    const oldValue = this.getSignal("resolution").value;

    // Update the parameter
    const result = this.updateParameter("resolution", resolution);

    // Update the specific segment parameter for the current geometry type
    if (result) {
      const geometryType = this.getSignal("geometryType").value;
      const segmentParam = GEOMETRY_TYPE_TO_SEGMENTS[geometryType];

      if (segmentParam) {
        this.updateParameter(
          segmentParam as keyof GeometryParameters,
          resolution
        );

        // For sphere, update both width and height segments
        if (geometryType === "sphere") {
          this.updateParameter("sphereHeightSegments", resolution);
        }
      }

      // Record the change in history
      const historyStore = getHistoryStore();
      historyStore.recordAction(
        `Updated resolution to ${resolution}`,
        { resolution: oldValue },
        { resolution },
        "geometry-resolution-change"
      );

      // Recreate geometry if needed
      if (recreateGeometry) {
        this.scheduleGeometryRebuild();
      }
    }

    return result;
  }

  /**
   * Update adaptive resolution setting
   */
  updateAdaptiveResolution(useAdaptive: boolean): boolean {
    // Get current value for history
    const oldValue = this.getSignal("useAdaptiveResolution").value;

    // Update the parameter
    const result = this.updateParameter("useAdaptiveResolution", useAdaptive);

    // Record the change in history
    if (result) {
      const historyStore = getHistoryStore();
      historyStore.recordAction(
        `${useAdaptive ? "Enabled" : "Disabled"} adaptive resolution`,
        { useAdaptiveResolution: oldValue },
        { useAdaptiveResolution: useAdaptive },
        "geometry-adaptive-change"
      );

      // Update UI with a toast
      const uiStore = getUIStore();
      uiStore.showToast(
        `Adaptive resolution ${useAdaptive ? "enabled" : "disabled"}`,
        "info"
      );

      // Recreate geometry
      this.scheduleGeometryRebuild();
    }

    return result;
  }

  /**
   * Update resolution parameter based on geometry type
   */
  private updateResolutionForGeometryType(value: number): void {
    // Clamp resolution value
    const clampedResolution = Math.max(
      MIN_RESOLUTION,
      Math.min(MAX_RESOLUTION, value)
    );

    // Update the appropriate parameter based on geometry type
    const geometryType = this.getSignal("geometryType").value;
    const segmentParam = GEOMETRY_TYPE_TO_SEGMENTS[geometryType];

    if (segmentParam) {
      this.updateParameter(
        segmentParam as keyof GeometryParameters,
        clampedResolution
      );

      // For sphere, update both width and height segments
      if (geometryType === "sphere") {
        this.updateParameter("sphereHeightSegments", clampedResolution);
      }
    }

    // Also update the general resolution parameter
    this.updateParameter("resolution", clampedResolution);
  }

  /**
   * Schedule a geometry rebuild
   */
  public scheduleGeometryRebuild(delay: number = 100): void {
    // Clear any existing timeout
    if (this.rebuildTimeout !== null) {
      window.clearTimeout(this.rebuildTimeout);
      this.rebuildTimeout = null;
    }

    // Set a new timeout
    this.rebuildTimeout = window.setTimeout(() => {
      this.recreateGeometry();
      this.rebuildTimeout = null;
    }, delay);
  }

  /**
   * Recreate geometry in the facade
   */
  public recreateGeometry(force = false): void {
    const facade = facadeSignal.value;
    if (facade) {
      facade.recreateGeometry(force);

      // Show toast for forced rebuilds
      if (force) {
        const uiStore = getUIStore();
        uiStore.showToast("Rebuilding geometry at full resolution", "info");
      }
    }
  }

  /**
   * Reset to default values with history tracking
   */
  reset(): boolean {
    // Save for history
    const historyStore = getHistoryStore();
    historyStore.recordAction(
      "Reset geometry parameters",
      {}, // We're not tracking individual parameter changes here
      {}, // We're not tracking individual parameter changes here
      "geometry-reset"
    );

    // Reset all parameters using parent class implementation
    const result = super.reset();

    // Rebuild geometry with new values
    if (result) {
      this.scheduleGeometryRebuild();
    }

    return result;
  }

  /**
   * Get a parameter signal with explicit return type
   */
  getParameterSignal<K extends keyof GeometryParameters>(
    key: K
  ): Signal<GeometryParameters[K]> {
    return this.getWritableSignal(key);
  }

  /**
   * Get the facade instance
   */
  protected getFacade() {
    return facadeSignal.value;
  }

  /**
   * Sync state from facade to local signals
   */
  public syncWithFacade(): boolean {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn(
        "[GeometryInitializer] Cannot sync - facade not available or not initialized"
      );
      return false;
    }

    // Get current facade values for debugging
    const currentGeometryType = facade.getParam("geometryType");
    const currentWireframe = facade.getParam("showWireframe");

    // Call parent syncWithFacade to handle the standard parameter synchronization
    const result = super.syncWithFacade();
    if (!result) {
      return false;
    }

    // Special handling for wireframe parameter which has a different name in facade
    const wireframeFromFacade = facade.getParam("showWireframe");
    if (wireframeFromFacade !== undefined) {
      // Update the wireframe parameter directly
      this.updateParameter("wireframe", wireframeFromFacade);
    }

    // Ensure we update any dependent parameters based on geometry type
    const geometryType = this.getSignal("geometryType").value;

    // Force a geometry rebuild to ensure UI is consistent
    this.scheduleGeometryRebuild();

    return true;
  }
}

// Singleton instance
let geometryInitializerInstance: GeometryInitializer | null = null;

/**
 * Get the geometry initializer instance
 */
export function getGeometryInitializer(): GeometryInitializer {
  if (!geometryInitializerInstance) {
    geometryInitializerInstance = new GeometryInitializer();
  }
  return geometryInitializerInstance;
}

/**
 * Helper function to get a specific geometry parameter signal
 */
export function getGeometryParameter<K extends keyof GeometryParameters>(
  paramName: K
): Signal<GeometryParameters[K]> {
  return getGeometryInitializer().getParameterSignal(paramName);
}

/**
 * Initialize geometry parameters with defaults and sync with facade
 * This is called during app initialization
 */
export function initializeGeometryParameters(): boolean {
  const initializer = getGeometryInitializer();
  return initializer.syncWithFacade();
}
