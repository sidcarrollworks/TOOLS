/**
 * ColorStore for managing color, gradient, and background parameters
 */
import { Signal, computed } from "@preact/signals";
import { SignalStoreBase } from "./SignalStoreBase";
import { facadeSignal } from "../../app";
import { getHistoryStore } from "./HistoryStore";
import { getExportStore } from "./ExportStore";
import {
  getColorInitializer,
  getColorParameter,
  type ColorParameters,
} from "./ColorInitializer";

/**
 * Facade bindings for color parameters
 */
export const FACADE_BINDINGS = {
  // Gradient parameters
  gradientMode: "gradientMode",
  gradientShiftX: "gradientShiftX",
  gradientShiftY: "gradientShiftY",
  gradientShiftSpeed: "gradientShiftSpeed",

  // Color parameters
  color1: "color1",
  color2: "color2",
  color3: "color3",
  color4: "color4",

  // Color noise parameters
  colorNoiseScale: "colorNoiseScale",
  colorNoiseSpeed: "colorNoiseSpeed",

  // Background parameters
  backgroundColor: "backgroundColor",
  transparentBackground: "exportTransparentBg",
};

/**
 * Type defining the color states managed by this store
 */
export interface ColorState {
  // Gradient parameters
  gradientMode: number;
  gradientShiftX: number;
  gradientShiftY: number;
  gradientShiftSpeed: number;

  // Color parameters
  color1: string;
  color2: string;
  color3: string;
  color4: string;

  // Color noise parameters
  colorNoiseScale: number;
  colorNoiseSpeed: number;

  // Background parameters
  backgroundColor: string;
  transparentBackground: boolean;
}

/**
 * ColorStore class for managing color parameters with signals
 */
export class ColorStore extends SignalStoreBase<Record<string, any>> {
  // Signals for gradient parameters
  private readonly _gradientMode = getColorParameter("gradientMode");
  private readonly _gradientShiftX = getColorParameter("gradientShiftX");
  private readonly _gradientShiftY = getColorParameter("gradientShiftY");
  private readonly _gradientShiftSpeed =
    getColorParameter("gradientShiftSpeed");

  // Signals for color parameters
  private readonly _color1 = getColorParameter("color1");
  private readonly _color2 = getColorParameter("color2");
  private readonly _color3 = getColorParameter("color3");
  private readonly _color4 = getColorParameter("color4");

  // Signals for color noise parameters
  private readonly _colorNoiseScale = getColorParameter("colorNoiseScale");
  private readonly _colorNoiseSpeed = getColorParameter("colorNoiseSpeed");

  // Signals for background parameters
  private readonly _backgroundColor = getColorParameter("backgroundColor");
  private readonly _transparentBackground = getColorParameter(
    "transparentBackground"
  );

  // Computed signals for gradient parameters
  public readonly gradientMode = this._gradientMode;
  public readonly gradientShiftX = this._gradientShiftX;
  public readonly gradientShiftY = this._gradientShiftY;
  public readonly gradientShiftSpeed = this._gradientShiftSpeed;

  // Computed signals for color parameters
  public readonly color1 = this._color1;
  public readonly color2 = this._color2;
  public readonly color3 = this._color3;
  public readonly color4 = this._color4;

  // Computed signals for color noise parameters
  public readonly colorNoiseScale = this._colorNoiseScale;
  public readonly colorNoiseSpeed = this._colorNoiseSpeed;

  // Computed signals for background parameters
  public readonly backgroundColor = this._backgroundColor;
  public readonly transparentBackground = this._transparentBackground;

  // Initialize the store
  constructor() {
    super({} as Record<string, any>, {
      name: "Color",
      debug: false,
      autoSyncWithFacade: true,
    });

    console.log("ColorStore initialized with signals");

    // Set up custom bindings
    this.setupFacadeBindings();
  }

  /**
   * Set up custom facade bindings for nested properties
   */
  private setupFacadeBindings(): void {
    // Use the colorInitializer for most bindings
    // This method is here for any custom bindings needed in the future
  }

  /**
   * Get the complete color state for use in React components
   */
  public getColorState(): ColorState {
    return {
      gradientMode: this._gradientMode.value,
      gradientShiftX: this._gradientShiftX.value,
      gradientShiftY: this._gradientShiftY.value,
      gradientShiftSpeed: this._gradientShiftSpeed.value,

      color1: this._color1.value,
      color2: this._color2.value,
      color3: this._color3.value,
      color4: this._color4.value,

      colorNoiseScale: this._colorNoiseScale.value,
      colorNoiseSpeed: this._colorNoiseSpeed.value,

      backgroundColor: this._backgroundColor.value,
      transparentBackground: this._transparentBackground.value,
    };
  }

  /**
   * Update a specific color parameter
   */
  public setColorParameter<K extends keyof ColorState>(
    key: K,
    value: ColorState[K]
  ): void {
    const colorInitializer = getColorInitializer();
    if (colorInitializer) {
      colorInitializer.updateParameter(key as any, value);
    }
  }

  /**
   * Update multiple color parameters at once
   */
  public updateColorState(partialState: Partial<ColorState>): void {
    const colorInitializer = getColorInitializer();

    if (colorInitializer) {
      // Update each parameter
      Object.entries(partialState).forEach(([key, value]) => {
        colorInitializer.updateParameter(key as any, value);
      });
    }
  }

  /**
   * Sync store state from facade
   */
  public syncWithFacade(): void {
    // The ColorInitializer handles most synchronization
    // This is just for any additional store-specific syncing
    const colorInitializer = getColorInitializer();
    if (colorInitializer) {
      colorInitializer.syncWithFacade();
    }
  }

  /**
   * Reset all color parameters to defaults
   */
  public reset(): void {
    const colorInitializer = getColorInitializer();
    if (colorInitializer) {
      colorInitializer.reset();

      // Add to history
      const historyStore = getHistoryStore();
      if (historyStore) {
        historyStore.recordAction(
          "Reset Colors",
          {}, // We don't track previous values for full reset
          {}, // We don't track new values for full reset
          "reset-colors"
        );
      }
    }
  }

  /**
   * Get unique store ID
   */
  public getId(): string {
    return "color";
  }
}

/**
 * Singleton instance
 */
let colorStoreInstance: ColorStore | null = null;

/**
 * Get the color store instance
 */
export function getColorStore(): ColorStore {
  if (!colorStoreInstance) {
    colorStoreInstance = new ColorStore();
  }
  return colorStoreInstance;
}
