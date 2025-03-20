import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import { getHistoryStore } from "./HistoryStore";

/**
 * Camera state interface
 */
export interface CameraState {
  /**
   * Camera position (x, y, z)
   */
  position: {
    x: number;
    y: number;
    z: number;
  };

  /**
   * Camera target/look-at point (x, y, z)
   */
  target: {
    x: number;
    y: number;
    z: number;
  };

  /**
   * Default camera position (for reset)
   */
  defaultPosition: {
    x: number;
    y: number;
    z: number;
  };

  /**
   * Default camera target (for reset)
   */
  defaultTarget: {
    x: number;
    y: number;
    z: number;
  };

  /**
   * Flag indicating if camera update is in progress
   */
  isUpdating: boolean;

  /**
   * Error message if any
   */
  errorMessage: string | null;

  /**
   * Flag indicating if values are being updated from the UI
   */
  updatingFromUI: boolean;

  /**
   * Status message for debugging
   */
  status: string;
}

/**
 * Store for managing camera state
 */
export class CameraStore extends StoreBase<CameraState> {
  /**
   * Timeout for debouncing camera updates
   */
  private updateTimeout: number | null = null;

  /**
   * Create a new camera store
   */
  constructor() {
    super(
      {
        position: { x: 0, y: 0, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        defaultPosition: { x: 0, y: 0, z: 5 },
        defaultTarget: { x: 0, y: 0, z: 0 },
        isUpdating: false,
        errorMessage: null,
        updatingFromUI: false,
        status: "",
      },
      { name: "CameraStore", debug: false }
    );

    // Initialize from facade when available
    this.initFromFacade();
  }

  /**
   * Initialize camera state from facade
   */
  private initFromFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) return;

    // Set up polling to sync camera position from the facade
    const syncIntervalId = window.setInterval(() => {
      if (!facade || !facade.isInitialized()) return;

      try {
        // Skip if we're currently updating from UI
        if (this.get("updatingFromUI") || this.get("isUpdating")) {
          return;
        }

        // Get camera values from facade
        const cameraPosX = facade.getParam("cameraPosX");
        const cameraPosY = facade.getParam("cameraPosY");
        const cameraPosZ = facade.getParam("cameraPosZ");
        const cameraTargetX = facade.getParam("cameraTargetX");
        const cameraTargetY = facade.getParam("cameraTargetY");
        const cameraTargetZ = facade.getParam("cameraTargetZ");

        // Update store with current values
        this.updateFromFacade(
          cameraPosX,
          cameraPosY,
          cameraPosZ,
          cameraTargetX,
          cameraTargetY,
          cameraTargetZ
        );
      } catch (error) {
        console.error("Error syncing camera from facade:", error);
      }
    }, 250); // Poll every 250ms

    // Store the interval ID for cleanup
    this.updateTimeout = syncIntervalId;
  }

  /**
   * Update camera position
   */
  public setPosition(
    x: number,
    y: number,
    z: number,
    recordHistory: boolean = true
  ): boolean {
    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Cannot update camera: Application not ready");
      getUIStore().showToast(
        "Cannot update camera: Application not ready",
        "error"
      );
      return false;
    }

    // Set updating flag
    this.set("isUpdating", true);

    // Mark as updating from UI to prevent feedback loops
    this.set("updatingFromUI", true);

    // Update status
    this.set(
      "status",
      `Position updated from UI at ${new Date().toLocaleTimeString()}`
    );

    try {
      // Get current position for history
      const prevPosition = { ...this.get("position") };

      // Update local state
      this.set("position", { x, y, z });

      // Apply to facade
      facade.setCameraPosition(x, y, z);

      // Record in history if needed
      if (recordHistory && getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          "Changed camera position",
          { cameraPosition: prevPosition },
          { cameraPosition: { x, y, z } },
          "camera-change"
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to update camera position:", error);
      this.set("errorMessage", "Failed to update camera position");
      getUIStore().showToast("Failed to update camera position", "error");
      return false;
    } finally {
      // Clear updating flags
      this.set("isUpdating", false);
      this.set("updatingFromUI", false);
    }
  }

  /**
   * Update camera target
   */
  public setTarget(
    x: number,
    y: number,
    z: number,
    recordHistory: boolean = true
  ): boolean {
    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Cannot update camera: Application not ready");
      getUIStore().showToast(
        "Cannot update camera: Application not ready",
        "error"
      );
      return false;
    }

    // Set updating flag
    this.set("isUpdating", true);

    // Mark as updating from UI to prevent feedback loops
    this.set("updatingFromUI", true);

    try {
      // Get current target for history
      const prevTarget = { ...this.get("target") };

      // Update local state
      this.set("target", { x, y, z });

      // Apply to facade
      facade.setCameraTarget(x, y, z);

      // Record in history if needed
      if (recordHistory && getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          "Changed camera target",
          { cameraTarget: prevTarget },
          { cameraTarget: { x, y, z } },
          "camera-change"
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to update camera target:", error);
      this.set("errorMessage", "Failed to update camera target");
      getUIStore().showToast("Failed to update camera target", "error");
      return false;
    } finally {
      // Clear updating flags
      this.set("isUpdating", false);
      this.set("updatingFromUI", false);
    }
  }

  /**
   * Reset camera to default position and target
   */
  public resetCamera(): boolean {
    const facade = facadeSignal.value;
    if (!facade) {
      this.set("errorMessage", "Cannot reset camera: Application not ready");
      getUIStore().showToast(
        "Cannot reset camera: Application not ready",
        "error"
      );
      return false;
    }

    try {
      // Get current values for history
      const prevPosition = { ...this.get("position") };
      const prevTarget = { ...this.get("target") };

      // Get default values
      const defaultPosition = this.get("defaultPosition");
      const defaultTarget = this.get("defaultTarget");

      // Set updating flag
      this.set("isUpdating", true);

      // Use facade's reset camera method
      facade.resetCamera();

      // Update local state
      this.set("position", { ...defaultPosition });
      this.set("target", { ...defaultTarget });

      // Record in history
      if (getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          "Reset camera",
          {
            cameraPosition: prevPosition,
            cameraTarget: prevTarget,
          },
          {
            cameraPosition: defaultPosition,
            cameraTarget: defaultTarget,
          },
          "camera-reset"
        );
      }

      getUIStore().showToast("Camera reset to default", "info");
      return true;
    } catch (error) {
      console.error("Failed to reset camera:", error);
      this.set("errorMessage", "Failed to reset camera");
      getUIStore().showToast("Failed to reset camera", "error");
      return false;
    } finally {
      // Clear updating flag
      this.set("isUpdating", false);
    }
  }

  /**
   * Update a specific position axis
   */
  public setPositionAxis(axis: "x" | "y" | "z", value: number): boolean {
    const position = { ...this.get("position") };
    position[axis] = value;
    return this.setPosition(position.x, position.y, position.z);
  }

  /**
   * Update a specific target axis
   */
  public setTargetAxis(axis: "x" | "y" | "z", value: number): boolean {
    const target = { ...this.get("target") };
    target[axis] = value;
    return this.setTarget(target.x, target.y, target.z);
  }

  /**
   * Update camera store from facade values
   * This is called when the facade parameters change (e.g., from orbit controls)
   */
  public updateFromFacade(
    posX: number,
    posY: number,
    posZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    recordHistory: boolean = false
  ): void {
    // Skip if updating from UI to prevent loops
    if (this.get("updatingFromUI")) {
      console.log(
        "CameraStore: Skipping updateFromFacade due to updatingFromUI flag"
      );
      return;
    }

    // Get current values for comparison
    const currentPosition = this.get("position");
    const currentTarget = this.get("target");

    // Only update if values have actually changed
    const positionChanged =
      Math.abs(currentPosition.x - posX) > 0.001 ||
      Math.abs(currentPosition.y - posY) > 0.001 ||
      Math.abs(currentPosition.z - posZ) > 0.001;

    const targetChanged =
      Math.abs(currentTarget.x - targetX) > 0.001 ||
      Math.abs(currentTarget.y - targetY) > 0.001 ||
      Math.abs(currentTarget.z - targetZ) > 0.001;

    if (!positionChanged && !targetChanged) {
      return;
    }

    // console.log("CameraStore: Updating from facade", {
    //   from: {
    //     position: currentPosition,
    //     target: currentTarget,
    //   },
    //   to: {
    //     position: { x: posX, y: posY, z: posZ },
    //     target: { x: targetX, y: targetY, z: targetZ },
    //   },
    // });

    // Update status
    this.set(
      "status",
      `Updated from facade at ${new Date().toLocaleTimeString()}`
    );

    // Record in history if needed
    if (
      recordHistory &&
      getHistoryStore &&
      (positionChanged || targetChanged)
    ) {
      const historyStore = getHistoryStore();
      historyStore.recordAction(
        "Camera updated from 3D view",
        {
          cameraPosition: { ...currentPosition },
          cameraTarget: { ...currentTarget },
        },
        {
          cameraPosition: { x: posX, y: posY, z: posZ },
          cameraTarget: { x: targetX, y: targetY, z: targetZ },
        },
        "camera-change"
      );
    }

    // Update local state with individual updates
    this.set("position", { x: posX, y: posY, z: posZ });
    this.set("target", { x: targetX, y: targetY, z: targetZ });
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clear any running intervals
    if (this.updateTimeout !== null) {
      window.clearInterval(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
}

// Singleton instance
let cameraStore: CameraStore | null = null;

/**
 * Get the camera store instance
 */
export function getCameraStore(): CameraStore {
  if (!cameraStore) {
    cameraStore = new CameraStore();
  }
  return cameraStore;
}
