/**
 * DistortionStore for managing distortion parameters
 */
import { computed, effect } from "@preact/signals";
import { facadeSignal } from "../../app";
import { SignalStoreBase, type SignalFacadeBinding } from "./SignalStoreBase";
import { getHistoryStore } from "./HistoryStore";

/**
 * Distortion state interface
 */
export interface DistortionState {
  normalNoise: {
    scaleX: number;
    scaleY: number;
    strength: number;
    speed: number;
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
    speed: 0.2,
  },
  shift: {
    x: 0,
    y: 0,
    speed: 0.2,
  },
};

/**
 * Mapping of store properties to facade parameters
 */
const FACADE_BINDINGS: Record<string, string> = {
  "normalNoise.scaleX": "normalNoiseScaleX",
  "normalNoise.scaleY": "normalNoiseScaleY",
  "normalNoise.strength": "normalNoiseStrength",
  "normalNoise.speed": "normalNoiseSpeed",
  "shift.x": "normalNoiseShiftX",
  "shift.y": "normalNoiseShiftY",
  "shift.speed": "normalNoiseShiftSpeed",
};

/**
 * DistortionStore class for managing distortion parameters
 */
class DistortionStore extends SignalStoreBase<DistortionState> {
  /**
   * Signal for normal noise scale X
   */
  private readonly _noiseScaleXSignal = this.createComputedSignal(
    ["normalNoise"],
    (values) => values.normalNoise.scaleX
  );

  /**
   * Signal for normal noise scale Y
   */
  private readonly _noiseScaleYSignal = this.createComputedSignal(
    ["normalNoise"],
    (values) => values.normalNoise.scaleY
  );

  /**
   * Signal for normal noise strength
   */
  private readonly _noiseStrengthSignal = this.createComputedSignal(
    ["normalNoise"],
    (values) => values.normalNoise.strength
  );

  /**
   * Signal for normal noise speed
   */
  private readonly _noiseSpeedSignal = this.createComputedSignal(
    ["normalNoise"],
    (values) => values.normalNoise.speed
  );

  /**
   * Signal for shift X
   */
  private readonly _shiftXSignal = this.createComputedSignal(
    ["shift"],
    (values) => values.shift.x
  );

  /**
   * Signal for shift Y
   */
  private readonly _shiftYSignal = this.createComputedSignal(
    ["shift"],
    (values) => values.shift.y
  );

  /**
   * Signal for shift speed
   */
  private readonly _shiftSpeedSignal = this.createComputedSignal(
    ["shift"],
    (values) => values.shift.speed
  );

  constructor() {
    // Pass the initialState as first parameter and options object as second parameter
    super(DEFAULT_DISTORTION_STATE, {
      name: "distortion",
      debug: false,
      autoSyncWithFacade: false,
    });

    // Set up facade bindings for deep properties
    this.setupFacadeBindings();

    console.log("DistortionStore initialized with signals");
  }

  /**
   * Set up facade bindings for nested properties
   */
  private setupFacadeBindings(): void {
    // We can't directly bind nested properties, so we set up custom bindings

    // Create custom binding for normal noise scale X
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const value = this._noiseScaleXSignal.value;
      facade.updateParam("normalNoiseScaleX" as any, value);
    });

    // Create custom binding for normal noise scale Y
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const value = this._noiseScaleYSignal.value;
      facade.updateParam("normalNoiseScaleY" as any, value);
    });

    // Create custom binding for normal noise strength
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const value = this._noiseStrengthSignal.value;
      facade.updateParam("normalNoiseStrength" as any, value);
    });

    // Create custom binding for normal noise speed
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const value = this._noiseSpeedSignal.value;
      facade.updateParam("normalNoiseSpeed" as any, value);
    });

    // Create custom binding for shift X
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const value = this._shiftXSignal.value;
      facade.updateParam("normalNoiseShiftX" as any, value);
    });

    // Create custom binding for shift Y
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const value = this._shiftYSignal.value;
      facade.updateParam("normalNoiseShiftY" as any, value);
    });

    // Create custom binding for shift speed
    effect(() => {
      const facade = this.getFacade();
      if (!facade || !facade.isInitialized() || this.isSyncing) return;

      const value = this._shiftSpeedSignal.value;
      facade.updateParam("normalNoiseShiftSpeed" as any, value);
    });
  }

  /**
   * Get the facade instance
   */
  protected getFacade() {
    return facadeSignal.value;
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
  }

  /**
   * Update normal noise speed
   */
  updateNormalNoiseSpeed(speed: number): void {
    this.setState({
      normalNoise: {
        ...this.getState().normalNoise,
        speed,
      },
    });
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
        normalNoiseSpeed: currentState.normalNoise.speed,
        normalNoiseShiftX: currentState.shift.x,
        normalNoiseShiftY: currentState.shift.y,
        normalNoiseShiftSpeed: currentState.shift.speed,
      },
      {
        normalNoiseScaleX: DEFAULT_DISTORTION_STATE.normalNoise.scaleX,
        normalNoiseScaleY: DEFAULT_DISTORTION_STATE.normalNoise.scaleY,
        normalNoiseStrength: DEFAULT_DISTORTION_STATE.normalNoise.strength,
        normalNoiseSpeed: DEFAULT_DISTORTION_STATE.normalNoise.speed,
        normalNoiseShiftX: DEFAULT_DISTORTION_STATE.shift.x,
        normalNoiseShiftY: DEFAULT_DISTORTION_STATE.shift.y,
        normalNoiseShiftSpeed: DEFAULT_DISTORTION_STATE.shift.speed,
      },
      "distortion-reset"
    );

    // Reset state (parent class will handle signal updates)
    super.reset(DEFAULT_DISTORTION_STATE);
  }

  /**
   * Sync state from facade to local signals
   */
  syncWithFacade(): void {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) return;

    try {
      this.isSyncing = true;

      // Get values from facade
      const scaleX = facade.getParam("normalNoiseScaleX" as any) as number;
      const scaleY = facade.getParam("normalNoiseScaleY" as any) as number;
      const strength = facade.getParam("normalNoiseStrength" as any) as number;
      const speed = facade.getParam("normalNoiseSpeed" as any) as number;
      const shiftX = facade.getParam("normalNoiseShiftX" as any) as number;
      const shiftY = facade.getParam("normalNoiseShiftY" as any) as number;
      const shiftSpeed = facade.getParam(
        "normalNoiseShiftSpeed" as any
      ) as number;

      // Update state with values from facade
      this.setState({
        normalNoise: {
          scaleX:
            scaleX !== undefined
              ? scaleX
              : DEFAULT_DISTORTION_STATE.normalNoise.scaleX,
          scaleY:
            scaleY !== undefined
              ? scaleY
              : DEFAULT_DISTORTION_STATE.normalNoise.scaleY,
          strength:
            strength !== undefined
              ? strength
              : DEFAULT_DISTORTION_STATE.normalNoise.strength,
          speed:
            speed !== undefined
              ? speed
              : DEFAULT_DISTORTION_STATE.normalNoise.speed,
        },
        shift: {
          x: shiftX !== undefined ? shiftX : DEFAULT_DISTORTION_STATE.shift.x,
          y: shiftY !== undefined ? shiftY : DEFAULT_DISTORTION_STATE.shift.y,
          speed:
            shiftSpeed !== undefined
              ? shiftSpeed
              : DEFAULT_DISTORTION_STATE.shift.speed,
        },
      });
    } finally {
      this.isSyncing = false;
    }
  }

  // Public signals for consumers

  /**
   * Get signal for normal noise scale X
   */
  get noiseScaleX() {
    return this._noiseScaleXSignal;
  }

  /**
   * Get signal for normal noise scale Y
   */
  get noiseScaleY() {
    return this._noiseScaleYSignal;
  }

  /**
   * Get signal for normal noise strength
   */
  get noiseStrength() {
    return this._noiseStrengthSignal;
  }

  /**
   * Get signal for normal noise speed
   */
  get noiseSpeed() {
    return this._noiseSpeedSignal;
  }

  /**
   * Get signal for shift X
   */
  get shiftX() {
    return this._shiftXSignal;
  }

  /**
   * Get signal for shift Y
   */
  get shiftY() {
    return this._shiftYSignal;
  }

  /**
   * Get signal for shift speed
   */
  get shiftSpeed() {
    return this._shiftSpeedSignal;
  }

  /**
   * Get the store ID
   */
  getId(): string {
    return "distortion";
  }

  /**
   * Dispose of the store
   */
  dispose(): void {
    // Cleanup will be handled by parent dispose if needed
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
