import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { SignalStoreBase } from "./SignalStoreBase";
import {
  getCameraInitializer,
  DEFAULT_CAMERA_PARAMETERS,
} from "./CameraInitializer";

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

  /**
   * Flag indicating if camera needs update
   */
  needsCameraUpdate: boolean;

  /**
   * Flag indicating if camera needs orbit update
   */
  needsOrbitUpdate: boolean;
}

/**
 * Store for managing camera state
 */
class CameraStoreClass extends SignalStoreBase<CameraState> {
  /**
   * Timeout for debouncing camera updates
   */
  private updateTimeout: number | null = null;

  /**
   * Create a new camera store
   */
  constructor() {
    // Initialize the camera initializer
    const initializer = getCameraInitializer();

    // Create initial state object
    const initialState: CameraState = {
      position: {
        x: initializer.cameraPositionX.value,
        y: initializer.cameraPositionY.value,
        z: initializer.cameraPositionZ.value,
      },
      target: {
        x: initializer.cameraTargetX.value,
        y: initializer.cameraTargetY.value,
        z: initializer.cameraTargetZ.value,
      },
      defaultPosition: {
        x: DEFAULT_CAMERA_PARAMETERS.cameraPositionX,
        y: DEFAULT_CAMERA_PARAMETERS.cameraPositionY,
        z: DEFAULT_CAMERA_PARAMETERS.cameraPositionZ,
      },
      defaultTarget: {
        x: DEFAULT_CAMERA_PARAMETERS.cameraTargetX,
        y: DEFAULT_CAMERA_PARAMETERS.cameraTargetY,
        z: DEFAULT_CAMERA_PARAMETERS.cameraTargetZ,
      },
      isUpdating: false,
      errorMessage: null,
      updatingFromUI: false,
      status: "Initialized",
      needsCameraUpdate: false,
      needsOrbitUpdate: false,
    };

    // Call parent constructor with initial state
    super(initialState, {
      name: "camera",
      debug: false,
      autoSyncWithFacade: false,
    });

    // Subscribe to initializer signals
    this.setupSubscriptions();

    // Initialize camera in facade
    const facade = facadeSignal.value;
    if (facade) {
      // If facade doesn't have initializeCamera method, we can just skip this step
      try {
        if (typeof facade.resetCamera === "function") {
          facade.resetCamera();
        }
      } catch (error) {
        console.error("Error initializing camera:", error);
      }
    }

    console.log("CameraStore initialized with signals");
  }

  private setupSubscriptions() {
    const initializer = getCameraInitializer();

    // Position change subscriptions
    initializer.cameraPositionX.subscribe((x) => {
      this.setState({
        position: { ...this.getState().position, x },
        needsCameraUpdate: true,
        status: `Position X updated: ${x.toFixed(2)}`,
      });
    });

    initializer.cameraPositionY.subscribe((y) => {
      this.setState({
        position: { ...this.getState().position, y },
        needsCameraUpdate: true,
        status: `Position Y updated: ${y.toFixed(2)}`,
      });
    });

    initializer.cameraPositionZ.subscribe((z) => {
      this.setState({
        position: { ...this.getState().position, z },
        needsCameraUpdate: true,
        status: `Position Z updated: ${z.toFixed(2)}`,
      });
    });

    // Target change subscriptions
    initializer.cameraTargetX.subscribe((x) => {
      this.setState({
        target: { ...this.getState().target, x },
        needsCameraUpdate: true,
        status: `Target X updated: ${x.toFixed(2)}`,
      });
    });

    initializer.cameraTargetY.subscribe((y) => {
      this.setState({
        target: { ...this.getState().target, y },
        needsCameraUpdate: true,
        status: `Target Y updated: ${y.toFixed(2)}`,
      });
    });

    initializer.cameraTargetZ.subscribe((z) => {
      this.setState({
        target: { ...this.getState().target, z },
        needsCameraUpdate: true,
        status: `Target Z updated: ${z.toFixed(2)}`,
      });
    });

    // FOV subscription is handled by the facade directly
  }

  /**
   * Set the camera position
   */
  setPosition(position: { x: number; y: number; z: number }) {
    const initializer = getCameraInitializer();
    initializer.updatePosition(position.x, position.y, position.z);
  }

  /**
   * Set a single axis of the camera position
   */
  setPositionAxis(axis: "x" | "y" | "z", value: number) {
    const initializer = getCameraInitializer();
    initializer.updatePositionAxis(axis, value);
  }

  /**
   * Set the camera target (look-at point)
   */
  setTarget(target: { x: number; y: number; z: number }) {
    const initializer = getCameraInitializer();
    initializer.updateTarget(target.x, target.y, target.z);
  }

  /**
   * Set a single axis of the camera target
   */
  setTargetAxis(axis: "x" | "y" | "z", value: number) {
    const initializer = getCameraInitializer();
    initializer.updateTargetAxis(axis, value);
  }

  /**
   * Reset the camera to default position and target
   */
  resetCamera() {
    const initializer = getCameraInitializer();
    initializer.resetCamera();
  }

  /**
   * Flag that camera needs orbit controls update
   */
  markOrbitsDirty() {
    this.setState({
      needsOrbitUpdate: true,
    });
  }

  /**
   * Clear the needsOrbitUpdate flag
   */
  clearOrbitsDirty() {
    this.setState({
      needsOrbitUpdate: false,
    });
  }

  /**
   * Clear the needsCameraUpdate flag
   */
  clearCameraDirty() {
    this.setState({
      needsCameraUpdate: false,
    });
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
    if (this.getState().updatingFromUI) {
      console.log(
        "CameraStore: Skipping updateFromFacade due to updatingFromUI flag"
      );
      return;
    }

    // Get current values for comparison
    const currentPosition = this.getState().position;
    const currentTarget = this.getState().target;

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

    // Update status and position/target
    this.setState({
      status: `Updated from facade at ${new Date().toLocaleTimeString()}`,
      position: { x: posX, y: posY, z: posZ },
      target: { x: targetX, y: targetY, z: targetZ },
    });

    // Record in history if needed
    if (
      recordHistory &&
      getCameraInitializer() &&
      (positionChanged || targetChanged)
    ) {
      const initializer = getCameraInitializer();
      initializer.updateFromFacade(posX, posY, posZ, targetX, targetY, targetZ);
    }
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
let cameraStore: CameraStoreClass | null = null;

/**
 * Get the camera store instance
 */
export function getCameraStore(): CameraStoreClass {
  if (!cameraStore) {
    cameraStore = new CameraStoreClass();
  }
  return cameraStore;
}
