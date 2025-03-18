import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import type { IShaderAppFacade } from "../facade/types";

/**
 * Geometry parameter interface
 */
export interface GeometryParameters {
  geometryType?: string;
  planeSegments?: number;
  sphereWidthSegments?: number;
  sphereHeightSegments?: number;
  cubeWidthSegments?: number;
  cubeHeightSegments?: number;
  cubeDepthSegments?: number;
  useAdaptiveResolution?: boolean;
  [key: string]: any;
}

/**
 * Geometry state interface
 */
export interface GeometryState {
  // Core geometry properties
  geometryType: string;
  resolution: number; // We'll map this to the appropriate segments property based on geometry type
  useAdaptiveResolution: boolean;

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
 * Store for geometry state management
 */
export class GeometryStore extends StoreBase<GeometryState> {
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
   * Rebuild request timeout
   */
  private rebuildTimeout: number | null = null;

  /**
   * Create a new geometry store
   */
  constructor() {
    super(
      {
        // Initial geometry state
        geometryType: "plane",
        resolution: GeometryStore.DEFAULT_RESOLUTION,
        useAdaptiveResolution: false,

        // Initial status
        isRebuilding: false,
        needsRebuild: false,
        rebuildPercentage: 0,
        lastRebuildTime: 0,
        rebuildDuration: 0,

        // Initial performance metrics
        lastPerformance: {
          vertexCount: 0,
          triangleCount: 0,
          buildTimeMs: 0,
        },
      },
      { name: "GeometryStore", debug: false }
    );

    // Initialize from facade when available
    this.initFromFacade();
  }

  /**
   * Initialize store state from facade
   */
  private initFromFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) return;

    try {
      // Get current geometry parameters
      const params = facade.getAllParams();

      // Determine resolution based on geometry type
      let resolution = this.get("resolution");
      switch (params.geometryType) {
        case "plane":
          resolution = params.planeSegments || resolution;
          break;
        case "sphere":
          resolution = params.sphereWidthSegments || resolution;
          break;
        case "cube":
          resolution = params.cubeWidthSegments || resolution;
          break;
      }

      // Update store state with relevant params
      this.setState({
        geometryType:
          typeof params.geometryType === "string"
            ? params.geometryType
            : this.get("geometryType"),
        resolution: resolution,
        useAdaptiveResolution:
          typeof params.useAdaptiveResolution === "boolean"
            ? params.useAdaptiveResolution
            : this.get("useAdaptiveResolution"),
      });
    } catch (error) {
      console.error("Failed to initialize GeometryStore from facade:", error);
      getUIStore().showToast("Failed to initialize geometry settings", "error");
    }
  }

  /**
   * Get the appropriate segment parameter name based on geometry type
   */
  private getSegmentParameterName(): string {
    switch (this.get("geometryType")) {
      case "plane":
        return "planeSegments";
      case "sphere":
        return "sphereWidthSegments"; // Using width for simplicity
      case "cube":
        return "cubeWidthSegments"; // Using width for simplicity
      default:
        return "planeSegments";
    }
  }

  /**
   * Set geometry type
   */
  public setGeometryType(type: string): void {
    if (type === this.get("geometryType")) return;

    this.set("geometryType", type);
    this.set("needsRebuild", true);

    // Update the facade directly
    const facade = facadeSignal.value;
    if (facade) {
      try {
        facade.setGeometryType(type);
      } catch (error) {
        console.error("Failed to set geometry type:", error);
      }
    } else {
      this.scheduleRebuild();
    }
  }

  /**
   * Set resolution value
   */
  public setResolution(resolution: number): void {
    // Clamp resolution to valid range
    const clampedResolution = Math.max(
      GeometryStore.MIN_RESOLUTION,
      Math.min(GeometryStore.MAX_RESOLUTION, resolution)
    );

    if (clampedResolution === this.get("resolution")) return;

    this.set("resolution", clampedResolution);
    this.set("needsRebuild", true);

    // Update the facade with the appropriate segment parameter
    const facade = facadeSignal.value;
    if (facade) {
      const segmentParam = this.getSegmentParameterName();
      facade.updateParam(segmentParam as any, clampedResolution, {
        deferUpdate: true,
      });
      this.scheduleRebuild();
    }
  }

  /**
   * Set adaptive resolution flag
   */
  public setUseAdaptiveResolution(useAdaptive: boolean): void {
    if (useAdaptive === this.get("useAdaptiveResolution")) return;

    this.set("useAdaptiveResolution", useAdaptive);

    // Apply to facade immediately
    const facade = facadeSignal.value;
    if (facade) {
      try {
        facade.updateParam("useAdaptiveResolution", useAdaptive, {
          deferUpdate: false,
        });

        // Show feedback to user
        getUIStore().showToast(
          useAdaptive
            ? "Adaptive resolution enabled"
            : "Adaptive resolution disabled",
          "info"
        );

        // If disabling adaptive, we should rebuild at full resolution
        if (!useAdaptive) {
          this.set("needsRebuild", true);
          this.scheduleRebuild();
        }
      } catch (error) {
        console.error("Failed to set adaptive resolution:", error);
        getUIStore().showToast(
          "Failed to update adaptive resolution setting",
          "error"
        );
      }
    }
  }

  /**
   * Schedule a geometry rebuild
   */
  private scheduleRebuild(delay = 50): void {
    // Clear any existing timeout
    if (this.rebuildTimeout !== null) {
      window.clearTimeout(this.rebuildTimeout);
    }

    // Set a new timeout
    this.rebuildTimeout = window.setTimeout(() => {
      this.rebuildGeometry();
      this.rebuildTimeout = null;
    }, delay);
  }

  /**
   * Rebuild geometry using current parameters
   */
  public rebuildGeometry(): void {
    // Check if rebuild is needed and not already in progress
    if (!this.get("needsRebuild") || this.get("isRebuilding")) {
      return;
    }

    const facade = facadeSignal.value;
    if (!facade) {
      this.set("needsRebuild", false);
      return;
    }

    // Mark as rebuilding
    this.setState({
      isRebuilding: true,
      rebuildPercentage: 0,
    });

    const startTime = performance.now();

    // Prepare parameters for recreation
    // Set all relevant parameters first
    facade.updateParam("geometryType", this.get("geometryType"), {
      deferUpdate: true,
    });

    // Update the appropriate segment parameter based on geometry type
    const segmentParam = this.getSegmentParameterName();
    facade.updateParam(segmentParam as any, this.get("resolution"), {
      deferUpdate: true,
    });

    // Set adaptive resolution
    facade.updateParam(
      "useAdaptiveResolution",
      this.get("useAdaptiveResolution"),
      { deferUpdate: true }
    );

    // Start rebuild - using recreateGeometry from the facade
    try {
      // Use high quality if adaptive resolution is disabled
      const highQuality = !this.get("useAdaptiveResolution");

      // Listen for geometry-changed event to know when it's done
      const onGeometryChanged = (data: any) => {
        if (data.recreated) {
          const endTime = performance.now();
          const duration = endTime - startTime;

          // Update performance metrics
          this.setState({
            isRebuilding: false,
            needsRebuild: false,
            rebuildPercentage: 100,
            lastRebuildTime: Date.now(),
            rebuildDuration: duration,
            lastPerformance: {
              vertexCount: 0, // We don't have this info from the event
              triangleCount: 0, // We don't have this info from the event
              buildTimeMs: duration,
            },
          });

          // Show success toast for significant rebuilds
          if (duration > 500) {
            getUIStore().showToast(
              `Geometry rebuilt in ${duration.toFixed(0)}ms`,
              "success"
            );
          }

          // Remove event listener
          facade.off("geometry-changed", onGeometryChanged);
        }
      };

      // Register for geometry changed event
      facade.on("geometry-changed", onGeometryChanged);

      // Recreate geometry
      facade.recreateGeometry(highQuality);

      // Update progress - this is a bit tricky since we don't have direct progress info
      // Just set to 50% to indicate something is happening
      this.set("rebuildPercentage", 50);
    } catch (error) {
      console.error("Error initiating geometry rebuild:", error);

      // Reset rebuild state
      this.setState({
        isRebuilding: false,
        needsRebuild: true,
        rebuildPercentage: 0,
      });

      // Show error toast
      getUIStore().showToast("Failed to rebuild geometry", "error");
    }
  }

  /**
   * Force geometry rebuild
   */
  public forceRebuild(): void {
    this.set("needsRebuild", true);
    this.rebuildGeometry();
  }

  /**
   * Get the facade instance
   */
  public getFacade(): IShaderAppFacade | null {
    return facadeSignal.value;
  }

  /**
   * Dispose the store
   */
  public dispose(): void {
    // Clear rebuild timeout
    if (this.rebuildTimeout !== null) {
      window.clearTimeout(this.rebuildTimeout);
      this.rebuildTimeout = null;
    }
  }
}

// Singleton instance
let geometryStore: GeometryStore | null = null;

/**
 * Get the geometry store instance
 */
export function getGeometryStore(): GeometryStore {
  if (!geometryStore) {
    geometryStore = new GeometryStore();
  }
  return geometryStore;
}
