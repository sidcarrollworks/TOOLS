import { computed } from "@preact/signals";
import { SignalStoreBase } from "./SignalStoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import type { IShaderAppFacade } from "../facade/types";
import {
  getGeometryInitializer,
  getGeometryParameter,
} from "./GeometryInitializer";
import { effect } from "@preact/signals-core";

/**
 * Facade bindings for geometry parameters
 */
export const FACADE_BINDINGS = {
  // Core geometry properties
  geometryType: "geometryType",
  resolution: "resolution",
  wireframe: "showWireframe",
  useAdaptiveResolution: "useAdaptiveResolution",

  // Plane geometry
  planeWidth: "planeWidth",
  planeHeight: "planeHeight",
  planeSegments: "planeSegments",

  // Sphere geometry
  sphereRadius: "sphereRadius",
  sphereWidthSegments: "sphereWidthSegments",
  sphereHeightSegments: "sphereHeightSegments",

  // Cube geometry
  cubeSize: "cubeSize",
  cubeSegments: "cubeSegments",
};

/**
 * Geometry parameter interface
 */
export interface GeometryParameters {
  geometryType?: string;
  planeSegments?: number;
  sphereWidthSegments?: number;
  sphereHeightSegments?: number;
  cubeSegments?: number;
  cubeWidthSegments?: number;
  cubeHeightSegments?: number;
  cubeDepthSegments?: number;
  useAdaptiveResolution?: boolean;
  [key: string]: any;
}

/**
 * Geometry state interface - only contains status properties since parameters are now in signals
 */
export interface GeometryState {
  // Status tracking
  isRebuilding: boolean;
  needsRebuild: boolean;
  rebuildPercentage: number;
  lastRebuildTime: number;
  rebuildDuration: number;

  // Performance metrics
  lastPerformance: {
    vertexCount: number;
    triangleCount: number;
    buildTimeMs: number;
  };
}

/**
 * Default state for geometry
 */
const DEFAULT_GEOMETRY_STATE: GeometryState = {
  // Status tracking
  isRebuilding: false,
  needsRebuild: false,
  rebuildPercentage: 0,
  lastRebuildTime: 0,
  rebuildDuration: 0,

  // Performance metrics
  lastPerformance: {
    vertexCount: 0,
    triangleCount: 0,
    buildTimeMs: 0,
  },
};

/**
 * Store for geometry state management using signals
 */
export class GeometryStore extends SignalStoreBase<GeometryState> {
  /**
   * Minimum resolution value
   */
  private static MIN_RESOLUTION = 4;

  /**
   * Maximum resolution value
   */
  private static MAX_RESOLUTION = 512;

  /**
   * Default resolution value
   */
  private static DEFAULT_RESOLUTION = 128;

  /**
   * Timeout for scheduled rebuilds
   */
  private rebuildTimeout: number | null = null;

  // Computed signals for core parameters
  private readonly _geometryType = getGeometryParameter("geometryType");
  private readonly _resolution = getGeometryParameter("resolution");
  private readonly _wireframe = getGeometryParameter("wireframe");
  private readonly _useAdaptiveResolution = getGeometryParameter(
    "useAdaptiveResolution"
  );

  // Public readonly signals
  public readonly geometryType = this._geometryType;
  public readonly resolution = this._resolution;
  public readonly wireframe = this._wireframe;
  public readonly useAdaptiveResolution = this._useAdaptiveResolution;

  // Computed signal for type-specific segment parameter
  public readonly segmentParameterName = computed(() => {
    const type = this._geometryType.value;

    switch (type) {
      case "plane":
        return "planeSegments";
      case "sphere":
        return "sphereWidthSegments";
      case "cube":
        return "cubeSegments";
      default:
        return "planeSegments";
    }
  });

  constructor() {
    super(DEFAULT_GEOMETRY_STATE, {
      name: "geometry",
      debug: false,
      autoSyncWithFacade: false,
    });

    // Set up facade bindings
    this.setupFacadeBindings();

    // Listen for geometry changes from the facade
    this.setupFacadeListeners();

    console.log("GeometryStore initialized with signals");
  }

  /**
   * Set up facade bindings
   */
  private setupFacadeBindings(): void {
    // Create effects to sync each parameter with the facade
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const geometryType = this._geometryType.value;
      facade.updateParam("geometryType" as any, geometryType);
    });

    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const resolution = this._resolution.value;
      facade.updateParam("resolution" as any, resolution);
    });

    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const wireframe = this._wireframe.value;
      facade.updateParam("showWireframe" as any, wireframe);
    });

    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const useAdaptiveResolution = this._useAdaptiveResolution.value;
      facade.updateParam("useAdaptiveResolution" as any, useAdaptiveResolution);
    });
  }

  /**
   * Set up listeners for facade events
   */
  private setupFacadeListeners(): void {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) return;

    // Listen for geometry change events
    facade.on("geometry-changed", this.handleGeometryChanged.bind(this));
    facade.on(
      "geometry-build-progress" as any,
      this.handleBuildProgress.bind(this)
    );
  }

  /**
   * Handle geometry changed event from facade
   */
  private handleGeometryChanged(data: any): void {
    if (!data) return;

    // Update performance metrics
    this.setState({
      isRebuilding: false,
      needsRebuild: false,
      rebuildPercentage: 100,
      lastRebuildTime: Date.now(),
      rebuildDuration: data.buildTimeMs || 0,
      lastPerformance: {
        vertexCount: data.vertexCount || 0,
        triangleCount: data.triangleCount || 0,
        buildTimeMs: data.buildTimeMs || 0,
      },
    });

    // Show toast with performance info for significant rebuilds
    if (data.buildTimeMs > 100) {
      const uiStore = getUIStore();
      uiStore.showToast(
        `Geometry rebuilt: ${data.vertexCount.toLocaleString()} vertices, ${
          data.buildTimeMs
        }ms`,
        "info"
      );
    }
  }

  /**
   * Handle build progress event from facade
   */
  private handleBuildProgress(data: any): void {
    if (!data || typeof data.percentage !== "number") return;

    this.setState({
      isRebuilding: data.percentage < 100,
      rebuildPercentage: data.percentage,
    });
  }

  /**
   * Rebuild geometry
   */
  public rebuildGeometry(force = false): void {
    const initializer = getGeometryInitializer();
    initializer.recreateGeometry(force);
  }

  /**
   * Force a rebuild of the geometry
   */
  public forceRebuild(): void {
    this.rebuildGeometry(true);
  }

  /**
   * Get the facade instance
   */
  protected getFacade(): IShaderAppFacade | null {
    return facadeSignal.value;
  }

  /**
   * Clean up resources when store is disposed
   */
  public dispose(): void {
    // Reset rebuild timeout
    if (this.rebuildTimeout !== null) {
      window.clearTimeout(this.rebuildTimeout);
      this.rebuildTimeout = null;
    }

    // Remove event listeners from facade
    const facade = this.getFacade();
    if (facade && facade.isInitialized()) {
      facade.off("geometry-changed", this.handleGeometryChanged.bind(this));
      facade.off(
        "geometry-build-progress" as any,
        this.handleBuildProgress.bind(this)
      );
    }

    console.log("GeometryStore: Disposed");
  }

  /**
   * Sync with facade
   */
  public syncWithFacade(): void {
    console.log("GeometryStore: Starting syncWithFacade");

    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn(
        "GeometryStore: Cannot sync with facade - facade not available"
      );
      return;
    }

    this.isSyncing = true;

    try {
      // Use the initializer to sync with the facade
      // This is cleaner than duplicating the sync logic here
      const geometryInitializer = getGeometryInitializer();
      geometryInitializer.syncWithFacade();

      console.log("GeometryStore: Used initializer to sync with facade");
    } finally {
      this.isSyncing = false;
    }

    console.log("GeometryStore: Completed syncWithFacade");
  }
}

// Singleton instance
let geometryStoreInstance: GeometryStore | null = null;

/**
 * Get the geometry store instance
 */
export function getGeometryStore(): GeometryStore {
  if (!geometryStoreInstance) {
    geometryStoreInstance = new GeometryStore();
  }
  return geometryStoreInstance;
}
