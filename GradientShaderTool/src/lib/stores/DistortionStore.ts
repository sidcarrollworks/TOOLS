/**
 * DistortionStore for managing distortion parameters
 */
import { facadeSignal } from "../../app";
import { StoreBase } from "./StoreBase";
import { getHistoryStore } from "./HistoryStore";

/**
 * Distortion state interface
 */
export interface DistortionState {
  normalNoise: {
    scaleX: number;
    scaleY: number;
    strength: number;
  };
  shift: {
    x: number;
    y: number;
    speed: number;
  };
}

/**
 * Default distortion state
 */
const DEFAULT_DISTORTION_STATE: DistortionState = {
  normalNoise: {
    scaleX: 3.0,
    scaleY: 3.0,
    strength: 0.5,
  },
  shift: {
    x: 0,
    y: 0,
    speed: 0.2,
  },
};

/**
 * DistortionStore class for managing distortion parameters
 */
class DistortionStore extends StoreBase<DistortionState> {
  constructor() {
    // Pass the initialState as first parameter and options object as second parameter
    super(DEFAULT_DISTORTION_STATE, { name: "distortion" });
    console.log("DistortionStore initialized");
  }

  /**
   * Update normal noise scale X
   */
  updateNormalNoiseScaleX(scaleX: number): void {
    this.setState({
      normalNoise: {
        ...this.getState().normalNoise,
        scaleX,
      },
    });

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam("normalNoiseScaleX" as any, scaleX);
    }
  }

  /**
   * Update normal noise scale Y
   */
  updateNormalNoiseScaleY(scaleY: number): void {
    this.setState({
      normalNoise: {
        ...this.getState().normalNoise,
        scaleY,
      },
    });

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam("normalNoiseScaleY" as any, scaleY);
    }
  }

  /**
   * Update normal noise strength
   */
  updateNormalNoiseStrength(strength: number): void {
    this.setState({
      normalNoise: {
        ...this.getState().normalNoise,
        strength,
      },
    });

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam("normalNoiseStrength" as any, strength);
    }
  }

  /**
   * Update noise shift X
   */
  updateNoiseShiftX(x: number): void {
    this.setState({
      shift: {
        ...this.getState().shift,
        x,
      },
    });

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam("normalNoiseShiftX" as any, x);
    }
  }

  /**
   * Update noise shift Y
   */
  updateNoiseShiftY(y: number): void {
    this.setState({
      shift: {
        ...this.getState().shift,
        y,
      },
    });

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam("normalNoiseShiftY" as any, y);
    }
  }

  /**
   * Update noise shift speed
   */
  updateNoiseShiftSpeed(speed: number): void {
    this.setState({
      shift: {
        ...this.getState().shift,
        speed,
      },
    });

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam("normalNoiseShiftSpeed" as any, speed);
    }
  }

  /**
   * Update shift direction and speed together
   */
  updateShiftDirection(x: number, y: number, speed?: number): void {
    const newSpeed = speed !== undefined ? speed : this.getState().shift.speed;

    this.setState({
      shift: {
        x,
        y,
        speed: newSpeed,
      },
    });

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam("normalNoiseShiftX" as any, x);
      facade.updateParam("normalNoiseShiftY" as any, y);
      if (speed !== undefined) {
        facade.updateParam("normalNoiseShiftSpeed" as any, speed);
      }
    }
  }

  /**
   * Reset to default values
   */
  reset(): void {
    // Get current state for history
    const currentState = this.getState();

    // Save for history
    const historyStore = getHistoryStore();
    historyStore.recordAction(
      "Reset distortion parameters",
      {
        normalNoiseScaleX: currentState.normalNoise.scaleX,
        normalNoiseScaleY: currentState.normalNoise.scaleY,
        normalNoiseStrength: currentState.normalNoise.strength,
        normalNoiseShiftX: currentState.shift.x,
        normalNoiseShiftY: currentState.shift.y,
        normalNoiseShiftSpeed: currentState.shift.speed,
      },
      {
        normalNoiseScaleX: DEFAULT_DISTORTION_STATE.normalNoise.scaleX,
        normalNoiseScaleY: DEFAULT_DISTORTION_STATE.normalNoise.scaleY,
        normalNoiseStrength: DEFAULT_DISTORTION_STATE.normalNoise.strength,
        normalNoiseShiftX: DEFAULT_DISTORTION_STATE.shift.x,
        normalNoiseShiftY: DEFAULT_DISTORTION_STATE.shift.y,
        normalNoiseShiftSpeed: DEFAULT_DISTORTION_STATE.shift.speed,
      },
      "distortion-reset"
    );

    // Reset state
    this.setState(DEFAULT_DISTORTION_STATE);

    // Update facade parameters
    const facade = facadeSignal.value;
    if (facade) {
      // Use as any to bypass type checking for shader parameter names
      facade.updateParam(
        "normalNoiseScaleX" as any,
        DEFAULT_DISTORTION_STATE.normalNoise.scaleX
      );
      facade.updateParam(
        "normalNoiseScaleY" as any,
        DEFAULT_DISTORTION_STATE.normalNoise.scaleY
      );
      facade.updateParam(
        "normalNoiseStrength" as any,
        DEFAULT_DISTORTION_STATE.normalNoise.strength
      );
      facade.updateParam(
        "normalNoiseShiftX" as any,
        DEFAULT_DISTORTION_STATE.shift.x
      );
      facade.updateParam(
        "normalNoiseShiftY" as any,
        DEFAULT_DISTORTION_STATE.shift.y
      );
      facade.updateParam(
        "normalNoiseShiftSpeed" as any,
        DEFAULT_DISTORTION_STATE.shift.speed
      );
    }
  }

  /**
   * Sync with facade parameters
   */
  syncWithFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) {
      console.warn("Cannot sync DistortionStore: Facade not available");
      return;
    }

    // Log the raw values for debugging
    console.log("Syncing DistortionStore with facade parameters");

    try {
      // Use as any to bypass type checking for shader parameter names
      // Also handle null, undefined, and NaN values by using nullish coalescing
      const rawScaleX = facade.getParam("normalNoiseScaleX" as any);
      const rawScaleY = facade.getParam("normalNoiseScaleY" as any);
      const rawStrength = facade.getParam("normalNoiseStrength" as any);
      const rawShiftX = facade.getParam("normalNoiseShiftX" as any);
      const rawShiftY = facade.getParam("normalNoiseShiftY" as any);
      const rawShiftSpeed = facade.getParam("normalNoiseShiftSpeed" as any);

      // Log raw values
      console.log("Raw facade values:", {
        rawScaleX,
        rawScaleY,
        rawStrength,
        rawShiftX,
        rawShiftY,
        rawShiftSpeed,
      });

      // Clean and validate values
      const scaleX =
        typeof rawScaleX === "number" && !isNaN(rawScaleX)
          ? rawScaleX
          : DEFAULT_DISTORTION_STATE.normalNoise.scaleX;

      const scaleY =
        typeof rawScaleY === "number" && !isNaN(rawScaleY)
          ? rawScaleY
          : DEFAULT_DISTORTION_STATE.normalNoise.scaleY;

      const strength =
        typeof rawStrength === "number" && !isNaN(rawStrength)
          ? rawStrength
          : DEFAULT_DISTORTION_STATE.normalNoise.strength;

      const shiftX =
        typeof rawShiftX === "number" && !isNaN(rawShiftX)
          ? rawShiftX
          : DEFAULT_DISTORTION_STATE.shift.x;

      const shiftY =
        typeof rawShiftY === "number" && !isNaN(rawShiftY)
          ? rawShiftY
          : DEFAULT_DISTORTION_STATE.shift.y;

      const shiftSpeed =
        typeof rawShiftSpeed === "number" && !isNaN(rawShiftSpeed)
          ? rawShiftSpeed
          : DEFAULT_DISTORTION_STATE.shift.speed;

      // Log processed values
      console.log("Processed values for state update:", {
        scaleX,
        scaleY,
        strength,
        shiftX,
        shiftY,
        shiftSpeed,
      });

      // Update state without triggering facade updates
      this.stateSignal.value = {
        normalNoise: {
          scaleX,
          scaleY,
          strength,
        },
        shift: {
          x: shiftX,
          y: shiftY,
          speed: shiftSpeed,
        },
      };

      // If values were undefined in facade, update them with our defaults
      if (
        rawScaleX === undefined ||
        rawScaleY === undefined ||
        rawStrength === undefined ||
        rawShiftX === undefined ||
        rawShiftY === undefined ||
        rawShiftSpeed === undefined
      ) {
        console.log(
          "Some distortion parameters were undefined in facade, updating them with defaults"
        );
        // Update facade with our values to ensure consistency
        facade.updateParam("normalNoiseScaleX" as any, scaleX);
        facade.updateParam("normalNoiseScaleY" as any, scaleY);
        facade.updateParam("normalNoiseStrength" as any, strength);
        facade.updateParam("normalNoiseShiftX" as any, shiftX);
        facade.updateParam("normalNoiseShiftY" as any, shiftY);
        facade.updateParam("normalNoiseShiftSpeed" as any, shiftSpeed);
      }

      console.log("DistortionStore synced with facade");
    } catch (error) {
      console.error("Error syncing DistortionStore with facade:", error);
      // Fallback to default values
      this.stateSignal.value = DEFAULT_DISTORTION_STATE;
    }
  }

  /**
   * Get the store ID
   */
  getId(): string {
    return "distortion";
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Clean up any event listeners or resources
    console.log("DistortionStore disposed");
  }
}

// Singleton instance
let distortionStore: DistortionStore | null = null;

/**
 * Get the distortion store instance
 */
export function getDistortionStore(): DistortionStore {
  if (!distortionStore) {
    distortionStore = new DistortionStore();
  }
  return distortionStore;
}
