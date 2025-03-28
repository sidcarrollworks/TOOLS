/**
 * CameraInitializer for managing camera parameters
 */
import { Signal } from "@preact/signals";
import { InitializerBase, type ParameterDefinition } from "./InitializerBase";
import { getHistoryStore } from "./HistoryStore";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";

/**
 * Camera parameter types
 */
export interface CameraParameters {
  // Position parameters
  cameraPositionX: number;
  cameraPositionY: number;
  cameraPositionZ: number;

  // Target parameters
  cameraTargetX: number;
  cameraTargetY: number;
  cameraTargetZ: number;

  // FOV parameter
  cameraFov: number;
  
  // Grain effect parameters
  enableGrain: boolean;
  grainIntensity: number;
  grainScale: number;
  grainDensity: number;
  grainSpeed: number;
  grainThreshold: number;
}

/**
 * Default camera parameters
 */
export const DEFAULT_CAMERA_PARAMETERS: CameraParameters = {
  // Default position
  cameraPositionX: 0,
  cameraPositionY: 0,
  cameraPositionZ: 5,

  // Default target (looking at origin)
  cameraTargetX: 0,
  cameraTargetY: 0,
  cameraTargetZ: 0,

  // Default FOV
  cameraFov: 75,
  
  // Default grain effect
  enableGrain: false,
  grainIntensity: 0.5,
  grainScale: 1.0,
  grainDensity: 0.5,
  grainSpeed: 1.0,
  grainThreshold: 0.1,
};

/**
 * Parameter definitions for camera initializer
 */
const PARAMETER_DEFINITIONS: Record<
  keyof CameraParameters,
  ParameterDefinition<number | boolean>
> = {
  cameraPositionX: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.cameraPositionX,
    facadeParam: "cameraPosX",
  },
  cameraPositionY: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.cameraPositionY,
    facadeParam: "cameraPosY",
  },
  cameraPositionZ: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.cameraPositionZ,
    facadeParam: "cameraPosZ",
  },
  cameraTargetX: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.cameraTargetX,
    facadeParam: "cameraTargetX",
  },
  cameraTargetY: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.cameraTargetY,
    facadeParam: "cameraTargetY",
  },
  cameraTargetZ: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.cameraTargetZ,
    facadeParam: "cameraTargetZ",
  },
  cameraFov: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.cameraFov,
    facadeParam: "cameraFov",
  },
  enableGrain: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.enableGrain,
    facadeParam: "enableGrain",
  },
  grainIntensity: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.grainIntensity,
    facadeParam: "grainIntensity",
  },
  grainScale: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.grainScale,
    facadeParam: "grainScale",
  },
  grainDensity: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.grainDensity,
    facadeParam: "grainDensity",
  },
  grainSpeed: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.grainSpeed,
    facadeParam: "grainSpeed",
  },
  grainThreshold: {
    defaultValue: DEFAULT_CAMERA_PARAMETERS.grainThreshold,
    facadeParam: "grainThreshold",
  },
};

/**
 * CameraInitializer class for managing camera parameters
 */
export class CameraInitializer extends InitializerBase<CameraParameters> {
  // Cache signals for direct access
  public readonly cameraPositionX: Signal<number>;
  public readonly cameraPositionY: Signal<number>;
  public readonly cameraPositionZ: Signal<number>;

  public readonly cameraTargetX: Signal<number>;
  public readonly cameraTargetY: Signal<number>;
  public readonly cameraTargetZ: Signal<number>;

  public readonly cameraFov: Signal<number>;
  
  public readonly enableGrain: Signal<boolean>;
  public readonly grainIntensity: Signal<number>;
  public readonly grainScale: Signal<number>;
  public readonly grainDensity: Signal<number>;
  public readonly grainSpeed: Signal<number>;
  public readonly grainThreshold: Signal<number>;

  // Singleton instance
  private static _instance: CameraInitializer | null = null;

  /**
   * Get the singleton instance
   */
  public static getInstance(): CameraInitializer {
    if (!CameraInitializer._instance) {
      CameraInitializer._instance = new CameraInitializer();
    }
    return CameraInitializer._instance;
  }

  constructor() {
    super(PARAMETER_DEFINITIONS, {
      debug: false,
      autoSync: true,
      updateFacade: true,
    });

    // Initialize signals
    this.cameraPositionX = this.getWritableSignal("cameraPositionX");
    this.cameraPositionY = this.getWritableSignal("cameraPositionY");
    this.cameraPositionZ = this.getWritableSignal("cameraPositionZ");

    this.cameraTargetX = this.getWritableSignal("cameraTargetX");
    this.cameraTargetY = this.getWritableSignal("cameraTargetY");
    this.cameraTargetZ = this.getWritableSignal("cameraTargetZ");

    this.cameraFov = this.getWritableSignal("cameraFov");
    
    this.enableGrain = this.getWritableSignal("enableGrain");
    this.grainIntensity = this.getWritableSignal("grainIntensity");
    this.grainScale = this.getWritableSignal("grainScale");
    this.grainDensity = this.getWritableSignal("grainDensity");
    this.grainSpeed = this.getWritableSignal("grainSpeed");
    this.grainThreshold = this.getWritableSignal("grainThreshold");

    // Ensure grain effect is disabled on initialization
    this.enableGrain.value = false;

    // Sync with facade
    this.syncWithFacade();
  }

  /**
   * Update camera position
   */
  public updatePosition(x: number, y: number, z: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update camera position: Facade not available");
      return;
    }

    // Get current values for history
    const prevX = this.cameraPositionX.value;
    const prevY = this.cameraPositionY.value;
    const prevZ = this.cameraPositionZ.value;

    // Update signals
    this.cameraPositionX.value = x;
    this.cameraPositionY.value = y;
    this.cameraPositionZ.value = z;

    // Update facade
    try {
      facade.setCameraPosition(x, y, z);

      // Record history
      this.recordPositionHistory({ x: prevX, y: prevY, z: prevZ }, { x, y, z });
    } catch (error) {
      console.error("Failed to update camera position:", error);
      getUIStore().showToast("Failed to update camera position", "error");
    }
  }

  /**
   * Update camera position for a single axis
   */
  public updatePositionAxis(axis: "x" | "y" | "z", value: number): void {
    const position = {
      x: this.cameraPositionX.value,
      y: this.cameraPositionY.value,
      z: this.cameraPositionZ.value,
    };

    position[axis] = value;
    this.updatePosition(position.x, position.y, position.z);
  }

  /**
   * Update camera target
   */
  public updateTarget(x: number, y: number, z: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update camera target: Facade not available");
      return;
    }

    // Get current values for history
    const prevX = this.cameraTargetX.value;
    const prevY = this.cameraTargetY.value;
    const prevZ = this.cameraTargetZ.value;

    // Update signals
    this.cameraTargetX.value = x;
    this.cameraTargetY.value = y;
    this.cameraTargetZ.value = z;

    // Update facade
    try {
      facade.setCameraTarget(x, y, z);

      // Record history
      this.recordTargetHistory({ x: prevX, y: prevY, z: prevZ }, { x, y, z });
    } catch (error) {
      console.error("Failed to update camera target:", error);
      getUIStore().showToast("Failed to update camera target", "error");
    }
  }

  /**
   * Update camera target for a single axis
   */
  public updateTargetAxis(axis: "x" | "y" | "z", value: number): void {
    const target = {
      x: this.cameraTargetX.value,
      y: this.cameraTargetY.value,
      z: this.cameraTargetZ.value,
    };

    target[axis] = value;
    this.updateTarget(target.x, target.y, target.z);
  }

  /**
   * Update camera FOV
   */
  public updateFov(value: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update camera FOV: Facade not available");
      return;
    }

    // Get current value for history
    const prevFov = this.cameraFov.value;

    // Update signal directly for immediate UI feedback
    this.cameraFov.value = value;

    // Update facade
    try {
      // Update the facade parameter directly with resetCamera: true
      // This ensures the camera projection matrix is updated
      facade.updateParam("cameraFov", value, {
        skipValidation: false,
        deferUpdate: false,
        source: "user",
        resetCamera: true, // This is crucial to update the actual camera
      });

      // Record history
      this.recordFovHistory(prevFov, value);
    } catch (error) {
      console.error("Failed to update camera FOV:", error);
      getUIStore().showToast("Failed to update camera FOV", "error");
    }
  }

  /**
   * Update grain effect
   */
  public updateGrain(value: boolean): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update grain effect: Facade not available");
      return;
    }

    // Get current value for history
    const prevGrain = this.enableGrain.value;

    // Update signal directly for immediate UI feedback
    this.enableGrain.value = value;

    // Update facade
    try {
      facade.updateParam("enableGrain", value, {
        skipValidation: false,
        deferUpdate: false,
        source: "user",
      });

      // Record history
      this.recordGrainHistory(prevGrain, value);
    } catch (error) {
      console.error("Failed to update grain effect:", error);
      getUIStore().showToast("Failed to update grain effect", "error");
    }
  }

  /**
   * Update grain intensity
   */
  public updateGrainIntensity(value: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update grain intensity: Facade not available");
      return;
    }

    // Get current value for history
    const prevIntensity = this.grainIntensity.value;

    // Update signal directly for immediate UI feedback
    this.grainIntensity.value = value;

    // Update facade
    try {
      facade.updateParam("grainIntensity", value, {
        skipValidation: false,
        deferUpdate: false,
        source: "user",
      });

      // Record history
      this.recordGrainIntensityHistory(prevIntensity, value);
    } catch (error) {
      console.error("Failed to update grain intensity:", error);
      getUIStore().showToast("Failed to update grain intensity", "error");
    }
  }

  /**
   * Update grain scale
   */
  public updateGrainScale(value: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update grain scale: Facade not available");
      return;
    }

    // Get current value for history
    const prevScale = this.grainScale.value;

    // Update signal directly for immediate UI feedback
    this.grainScale.value = value;

    // Update facade
    try {
      facade.updateParam("grainScale", value, {
        skipValidation: false,
        deferUpdate: false,
        source: "user",
      });

      // Record history
      this.recordGrainScaleHistory(prevScale, value);
    } catch (error) {
      console.error("Failed to update grain scale:", error);
      getUIStore().showToast("Failed to update grain scale", "error");
    }
  }

  /**
   * Update grain density
   */
  public updateGrainDensity(value: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update grain density: Facade not available");
      return;
    }

    // Get current value for history
    const prevDensity = this.grainDensity.value;

    // Update signal directly for immediate UI feedback
    this.grainDensity.value = value;

    // Update facade
    try {
      facade.updateParam("grainDensity", value, {
        skipValidation: false,
        deferUpdate: false,
        source: "user",
      });

      // Record history
      this.recordGrainDensityHistory(prevDensity, value);
    } catch (error) {
      console.error("Failed to update grain density:", error);
      getUIStore().showToast("Failed to update grain density", "error");
    }
  }

  /**
   * Update grain speed
   */
  public updateGrainSpeed(value: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update grain speed: Facade not available");
      return;
    }

    // Get current value for history
    const prevSpeed = this.grainSpeed.value;

    // Update signal directly for immediate UI feedback
    this.grainSpeed.value = value;

    // Update facade
    try {
      facade.updateParam("grainSpeed", value, {
        skipValidation: false,
        deferUpdate: false,
        source: "user",
      });

      // Record history
      this.recordGrainSpeedHistory(prevSpeed, value);
    } catch (error) {
      console.error("Failed to update grain speed:", error);
      getUIStore().showToast("Failed to update grain speed", "error");
    }
  }

  /**
   * Update grain threshold
   */
  public updateGrainThreshold(value: number): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot update grain threshold: Facade not available");
      return;
    }

    // Get current value for history
    const prevThreshold = this.grainThreshold.value;

    // Update signal directly for immediate UI feedback
    this.grainThreshold.value = value;

    // Update facade
    try {
      facade.updateParam("grainThreshold", value, {
        skipValidation: false,
        deferUpdate: false,
        source: "user",
      });

      // Record history
      this.recordGrainThresholdHistory(prevThreshold, value);
    } catch (error) {
      console.error("Failed to update grain threshold:", error);
      getUIStore().showToast("Failed to update grain threshold", "error");
    }
  }

  /**
   * Reset camera to default values
   */
  public resetCamera(): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.error("Cannot reset camera: Facade not available");
      return;
    }

    // Get current values for history
    const prevPosition = {
      x: this.cameraPositionX.value,
      y: this.cameraPositionY.value,
      z: this.cameraPositionZ.value,
    };

    const prevTarget = {
      x: this.cameraTargetX.value,
      y: this.cameraTargetY.value,
      z: this.cameraTargetZ.value,
    };

    const prevFov = this.cameraFov.value;
    const prevGrain = this.enableGrain.value;
    const prevIntensity = this.grainIntensity.value;
    const prevScale = this.grainScale.value;
    const prevDensity = this.grainDensity.value;
    const prevSpeed = this.grainSpeed.value;
    const prevThreshold = this.grainThreshold.value;

    try {
      // Reset in facade
      facade.updateParam("cameraPosX", DEFAULT_CAMERA_PARAMETERS.cameraPositionX, {
        skipValidation: false,
        deferUpdate: true,
        source: "user",
      });

      facade.updateParam("cameraPosY", DEFAULT_CAMERA_PARAMETERS.cameraPositionY, {
        skipValidation: false,
        deferUpdate: true,
        source: "user",
      });

      facade.updateParam("cameraPosZ", DEFAULT_CAMERA_PARAMETERS.cameraPositionZ, {
        skipValidation: false,
        deferUpdate: true,
        source: "user",
      });

      facade.updateParam("cameraTargetX", DEFAULT_CAMERA_PARAMETERS.cameraTargetX, {
        skipValidation: false,
        deferUpdate: true,
        source: "user",
      });

      facade.updateParam("cameraTargetY", DEFAULT_CAMERA_PARAMETERS.cameraTargetY, {
        skipValidation: false,
        deferUpdate: true,
        source: "user",
      });

      facade.updateParam("cameraTargetZ", DEFAULT_CAMERA_PARAMETERS.cameraTargetZ, {
        skipValidation: false,
        deferUpdate: false, // Last camera param, trigger update
        source: "user",
      });

      // Reset position signals
      this.updateParameter(
        "cameraPositionX",
        DEFAULT_CAMERA_PARAMETERS.cameraPositionX
      );
      this.updateParameter(
        "cameraPositionY",
        DEFAULT_CAMERA_PARAMETERS.cameraPositionY
      );
      this.updateParameter(
        "cameraPositionZ",
        DEFAULT_CAMERA_PARAMETERS.cameraPositionZ
      );

      // Reset target signals
      this.updateParameter("cameraTargetX", DEFAULT_CAMERA_PARAMETERS.cameraTargetX);
      this.updateParameter("cameraTargetY", DEFAULT_CAMERA_PARAMETERS.cameraTargetY);
      this.updateParameter("cameraTargetZ", DEFAULT_CAMERA_PARAMETERS.cameraTargetZ);

      // Reset FOV signal
      this.updateParameter("cameraFov", DEFAULT_CAMERA_PARAMETERS.cameraFov);

      // Reset grain signals
      this.updateParameter("enableGrain", DEFAULT_CAMERA_PARAMETERS.enableGrain);
      this.updateParameter("grainIntensity", DEFAULT_CAMERA_PARAMETERS.grainIntensity);
      this.updateParameter("grainScale", DEFAULT_CAMERA_PARAMETERS.grainScale);
      this.updateParameter("grainDensity", DEFAULT_CAMERA_PARAMETERS.grainDensity);
      this.updateParameter("grainSpeed", DEFAULT_CAMERA_PARAMETERS.grainSpeed);
      this.updateParameter("grainThreshold", DEFAULT_CAMERA_PARAMETERS.grainThreshold);

      // Record history
      this.recordResetHistory(prevPosition, prevTarget, prevFov, prevGrain, prevIntensity, prevScale, prevDensity, prevSpeed, prevThreshold);

      getUIStore().showToast("Camera reset to default", "info");
    } catch (error) {
      console.error("Failed to reset camera:", error);
      getUIStore().showToast("Failed to reset camera", "error");
    }
  }

  /**
   * Update from facade (typically when orbit controls are used)
   */
  public updateFromFacade(
    posX: number,
    posY: number,
    posZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    fovValue?: number,
    grainValue?: boolean,
    grainIntensityValue?: number,
    grainScaleValue?: number,
    grainDensityValue?: number,
    grainSpeedValue?: number,
    grainThresholdValue?: number
  ): void {
    // Get current values for history
    const prevPosition = {
      x: this.cameraPositionX.value,
      y: this.cameraPositionY.value,
      z: this.cameraPositionZ.value,
    };

    const prevTarget = {
      x: this.cameraTargetX.value,
      y: this.cameraTargetY.value,
      z: this.cameraTargetZ.value,
    };

    // Track if anything changed
    let changed = false;

    // Check if position or target changed
    const positionChanged =
      Math.abs(prevPosition.x - posX) > 0.0001 ||
      Math.abs(prevPosition.y - posY) > 0.0001 ||
      Math.abs(prevPosition.z - posZ) > 0.0001;

    const targetChanged =
      Math.abs(prevTarget.x - targetX) > 0.0001 ||
      Math.abs(prevTarget.y - targetY) > 0.0001 ||
      Math.abs(prevTarget.z - targetZ) > 0.0001;

    // Update position and target signals silently to avoid facade updates
    this.isSyncing = true;
    try {
      if (positionChanged) {
        this.cameraPositionX.value = posX;
        this.cameraPositionY.value = posY;
        this.cameraPositionZ.value = posZ;
        changed = true;
      }

      if (targetChanged) {
        this.cameraTargetX.value = targetX;
        this.cameraTargetY.value = targetY;
        this.cameraTargetZ.value = targetZ;
        changed = true;
      }

      // Update FOV if provided
      if (fovValue !== undefined) {
        const prevFov = this.cameraFov.value;
        if (Math.abs(prevFov - fovValue) > 0.0001) {
          this.cameraFov.value = fovValue;
          changed = true;
        }
      }

      // Update grain if provided
      if (grainValue !== undefined) {
        const prevGrain = this.enableGrain.value;
        if (prevGrain !== grainValue) {
          this.enableGrain.value = grainValue;
          changed = true;
        }
      }

      // Update grain intensity if provided
      if (grainIntensityValue !== undefined) {
        const prevIntensity = this.grainIntensity.value;
        if (Math.abs(prevIntensity - grainIntensityValue) > 0.0001) {
          this.grainIntensity.value = grainIntensityValue;
          changed = true;
        }
      }

      // Update grain scale if provided
      if (grainScaleValue !== undefined) {
        const prevScale = this.grainScale.value;
        if (Math.abs(prevScale - grainScaleValue) > 0.0001) {
          this.grainScale.value = grainScaleValue;
          changed = true;
        }
      }

      // Update grain density if provided
      if (grainDensityValue !== undefined) {
        const prevDensity = this.grainDensity.value;
        if (Math.abs(prevDensity - grainDensityValue) > 0.0001) {
          this.grainDensity.value = grainDensityValue;
          changed = true;
        }
      }

      // Update grain speed if provided
      if (grainSpeedValue !== undefined) {
        const prevSpeed = this.grainSpeed.value;
        if (Math.abs(prevSpeed - grainSpeedValue) > 0.0001) {
          this.grainSpeed.value = grainSpeedValue;
          changed = true;
        }
      }

      // Update grain threshold if provided
      if (grainThresholdValue !== undefined) {
        const prevThreshold = this.grainThreshold.value;
        if (Math.abs(prevThreshold - grainThresholdValue) > 0.0001) {
          this.grainThreshold.value = grainThresholdValue;
          changed = true;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    // Record history if anything changed
    if (changed) {
      this.recordOrbitHistory(
        prevPosition,
        prevTarget,
        { x: posX, y: posY, z: posZ },
        { x: targetX, y: targetY, z: targetZ }
      );
    }
  }

  /**
   * Record position history
   */
  private recordPositionHistory(
    prevPosition: { x: number; y: number; z: number },
    newPosition: { x: number; y: number; z: number }
  ): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed camera position",
        { cameraPosition: prevPosition },
        { cameraPosition: newPosition },
        "camera-change"
      );
    }
  }

  /**
   * Record target history
   */
  private recordTargetHistory(
    prevTarget: { x: number; y: number; z: number },
    newTarget: { x: number; y: number; z: number }
  ): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed camera target",
        { cameraTarget: prevTarget },
        { cameraTarget: newTarget },
        "camera-change"
      );
    }
  }

  /**
   * Record FOV history
   */
  private recordFovHistory(prevFov: number, newFov: number): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed camera FOV",
        { cameraFov: prevFov },
        { cameraFov: newFov },
        "camera-change"
      );
    }
  }

  /**
   * Record grain history
   */
  private recordGrainHistory(prevGrain: boolean, newGrain: boolean): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed grain effect",
        { enableGrain: prevGrain },
        { enableGrain: newGrain },
        "camera-change"
      );
    }
  }

  /**
   * Record grain intensity history
   */
  private recordGrainIntensityHistory(prevIntensity: number, newIntensity: number): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed grain intensity",
        { grainIntensity: prevIntensity },
        { grainIntensity: newIntensity },
        "camera-change"
      );
    }
  }

  /**
   * Record grain scale history
   */
  private recordGrainScaleHistory(prevScale: number, newScale: number): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed grain scale",
        { grainScale: prevScale },
        { grainScale: newScale },
        "camera-change"
      );
    }
  }

  /**
   * Record grain density history
   */
  private recordGrainDensityHistory(prevDensity: number, newDensity: number): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed grain density",
        { grainDensity: prevDensity },
        { grainDensity: newDensity },
        "camera-change"
      );
    }
  }

  /**
   * Record grain speed history
   */
  private recordGrainSpeedHistory(prevSpeed: number, newSpeed: number): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed grain speed",
        { grainSpeed: prevSpeed },
        { grainSpeed: newSpeed },
        "camera-change"
      );
    }
  }

  /**
   * Record grain threshold history
   */
  private recordGrainThresholdHistory(prevThreshold: number, newThreshold: number): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Changed grain threshold",
        { grainThreshold: prevThreshold },
        { grainThreshold: newThreshold },
        "camera-change"
      );
    }
  }

  /**
   * Record reset history
   */
  private recordResetHistory(
    prevPosition: { x: number; y: number; z: number },
    prevTarget: { x: number; y: number; z: number },
    prevFov: number,
    prevGrain: boolean,
    prevIntensity: number,
    prevScale: number,
    prevDensity: number,
    prevSpeed: number,
    prevThreshold: number
  ): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Reset camera",
        {
          cameraPosition: prevPosition,
          cameraTarget: prevTarget,
          cameraFov: prevFov,
          enableGrain: prevGrain,
          grainIntensity: prevIntensity,
          grainScale: prevScale,
          grainDensity: prevDensity,
          grainSpeed: prevSpeed,
          grainThreshold: prevThreshold,
        },
        {
          cameraPosition: {
            x: DEFAULT_CAMERA_PARAMETERS.cameraPositionX,
            y: DEFAULT_CAMERA_PARAMETERS.cameraPositionY,
            z: DEFAULT_CAMERA_PARAMETERS.cameraPositionZ,
          },
          cameraTarget: {
            x: DEFAULT_CAMERA_PARAMETERS.cameraTargetX,
            y: DEFAULT_CAMERA_PARAMETERS.cameraTargetY,
            z: DEFAULT_CAMERA_PARAMETERS.cameraTargetZ,
          },
          cameraFov: DEFAULT_CAMERA_PARAMETERS.cameraFov,
          enableGrain: DEFAULT_CAMERA_PARAMETERS.enableGrain,
          grainIntensity: DEFAULT_CAMERA_PARAMETERS.grainIntensity,
          grainScale: DEFAULT_CAMERA_PARAMETERS.grainScale,
          grainDensity: DEFAULT_CAMERA_PARAMETERS.grainDensity,
          grainSpeed: DEFAULT_CAMERA_PARAMETERS.grainSpeed,
          grainThreshold: DEFAULT_CAMERA_PARAMETERS.grainThreshold,
        },
        "camera-reset"
      );
    }
  }

  /**
   * Record orbit history
   */
  private recordOrbitHistory(
    prevPosition: { x: number; y: number; z: number },
    prevTarget: { x: number; y: number; z: number },
    newPosition: { x: number; y: number; z: number },
    newTarget: { x: number; y: number; z: number }
  ): void {
    const historyStore = getHistoryStore();
    if (historyStore) {
      historyStore.recordAction(
        "Camera updated from 3D view",
        {
          cameraPosition: prevPosition,
          cameraTarget: prevTarget,
        },
        {
          cameraPosition: newPosition,
          cameraTarget: newTarget,
        },
        "camera-change"
      );
    }
  }

  /**
   * Get the facade instance
   */
  protected getFacade() {
    return facadeSignal.value;
  }

  /**
   * Get a parameter signal
   */
  public getParameterSignal<K extends keyof CameraParameters>(
    key: K
  ): Signal<CameraParameters[K]> {
    return this.getWritableSignal(key);
  }
}

/**
 * Get the camera initializer singleton
 */
export function getCameraInitializer(): CameraInitializer {
  return CameraInitializer.getInstance();
}

/**
 * Get a camera parameter signal
 */
export function getCameraParameter<K extends keyof CameraParameters>(
  key: K
): Signal<CameraParameters[K]> {
  return getCameraInitializer().getParameterSignal(key);
}
