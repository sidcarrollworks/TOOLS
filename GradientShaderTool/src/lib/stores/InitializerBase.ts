/**
 * InitializerBase - Standard base class for feature initializers
 */

import { Signal, computed, type ReadonlySignal } from "@preact/signals";
import { facadeSignal } from "../../app";
import type { IShaderAppFacade } from "../facade/types";

/**
 * Base initialization options
 */
export interface InitializerOptions {
  /**
   * Debug mode
   */
  debug?: boolean;

  /**
   * Whether to automatically sync with facade on initialization
   */
  autoSync?: boolean;

  /**
   * Whether to update the facade on parameter changes
   */
  updateFacade?: boolean;

  /**
   * Whether to register parameter-changed event listeners
   */
  registerEventListeners?: boolean;
}

/**
 * Parameter value with default and facade mapping
 */
export interface ParameterDefinition<T> {
  /**
   * Default value for the parameter
   */
  defaultValue: T;

  /**
   * Facade parameter name (if different from key)
   */
  facadeParam?: string;

  /**
   * Whether the parameter is read-only
   */
  readOnly?: boolean;

  /**
   * Transformation to apply when reading from facade
   */
  fromFacade?: (value: any) => T;

  /**
   * Transformation to apply when writing to facade
   */
  toFacade?: (value: T) => any;

  /**
   * Signal accessor (if parameter should be externally provided)
   */
  signal?: () => ReadonlySignal<T>;
}

/**
 * Base class for parameter initializers
 */
export abstract class InitializerBase<
  T extends Record<string, any> = Record<string, any>
> {
  /**
   * Parameter definitions
   */
  protected parameterDefs: Record<keyof T, ParameterDefinition<any>>;

  /**
   * Parameter signal cache
   */
  protected parameterSignals: Map<string, Signal<any>> = new Map();

  /**
   * Read-only parameter signal cache
   */
  protected readOnlySignals: Map<string, ReadonlySignal<any>> = new Map();

  /**
   * Flag to prevent circular updates
   */
  protected isSyncing: boolean = false;

  /**
   * Debug mode
   */
  protected debug: boolean;

  /**
   * Update facade on parameter changes
   */
  protected updateFacade: boolean;

  /**
   * Register parameter-changed event listeners
   */
  protected registerEventListeners: boolean;

  /**
   * Event handler cleanup function
   */
  protected eventCleanup: (() => void) | null = null;

  /**
   * Initialize with parameter definitions
   */
  constructor(
    parameterDefs: Record<keyof T, ParameterDefinition<any>>,
    options: InitializerOptions = {}
  ) {
    this.parameterDefs = parameterDefs;
    this.debug = options.debug || false;
    this.updateFacade = options.updateFacade !== false;
    this.registerEventListeners = options.registerEventListeners !== false;

    // Auto-initialize if requested
    if (options.autoSync !== false) {
      this.syncWithFacade();
    }

    // Register parameter change event listeners
    if (this.registerEventListeners) {
      this.registerParameterChangedListeners();
    }
  }

  /**
   * Register event listeners for parameter changes
   */
  protected registerParameterChangedListeners(): void {
    // Clean up existing listeners first
    if (this.eventCleanup) {
      this.eventCleanup();
      this.eventCleanup = null;
    }

    const facade = this.getFacade();
    if (!facade) {
      if (this.debug) {
        console.warn(
          "[InitializerBase] No facade available for event registration"
        );
      }
      return;
    }

    // Keep track of all the parameter names we need to watch
    const facadeParamMap = new Map<string, keyof T>();

    // Build a map of facade parameter names to our parameter keys
    for (const [key, def] of Object.entries(this.parameterDefs)) {
      const facadeParam = def.facadeParam || key;
      facadeParamMap.set(facadeParam, key as keyof T);
    }

    // Handler for parameter-changed events
    const handleParameterChanged = (event: any) => {
      if (!event || !event.paramName) return;

      const paramName = event.paramName;
      const key = facadeParamMap.get(paramName);

      if (key) {
        if (this.debug) {
          console.log(
            `[InitializerBase] Parameter changed externally: ${String(
              paramName
            )}, syncing...`
          );
        }

        // Sync this specific parameter
        this.syncParameterFromFacade(key);
      }
    };

    // Register the event handler
    facade.on("parameter-changed", handleParameterChanged);

    // Setup cleanup function
    this.eventCleanup = () => {
      if (facade) {
        facade.off("parameter-changed", handleParameterChanged);
      }
    };

    if (this.debug) {
      console.log(
        "[InitializerBase] Registered parameter-changed event listeners"
      );
    }
  }

  /**
   * Initialize parameters with default values if they don't exist
   */
  public initialize(): void {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn("[Initializer] Facade not available, using defaults");
      return;
    }

    // First pass: ensure parameters exist with defaults
    for (const [key, def] of Object.entries(this.parameterDefs)) {
      const facadeParam = def.facadeParam || key;
      this.ensureParameterExists(facade, facadeParam, def.defaultValue);
    }
  }

  /**
   * Reset all parameters to default values
   */
  public reset(): boolean {
    const facade = this.getFacade();
    const updates: Record<string, any> = {};

    // Collect all updates
    for (const [key, def] of Object.entries(this.parameterDefs)) {
      if (def.readOnly) continue;

      const facadeParam = def.facadeParam || key;
      const value = def.defaultValue;
      const transformedValue = def.toFacade ? def.toFacade(value) : value;

      updates[facadeParam] = transformedValue;

      // Update signal if it exists
      if (this.parameterSignals.has(key)) {
        this.isSyncing = true;
        try {
          this.parameterSignals.get(key)!.value = value;
        } finally {
          this.isSyncing = false;
        }
      }
    }

    // Update facade in batch if available
    if (facade && facade.isInitialized() && this.updateFacade) {
      const result = facade.batchUpdateParams(updates);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sync this initializer with the facade
   */
  public syncWithFacade(): boolean {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn(
        "[InitializerBase] Cannot sync - facade not available or not initialized"
      );
      return false;
    }

    // First initialize parameters with defaults if needed
    this.initialize();

    // Then update signals from facade
    this.isSyncing = true;
    try {
      for (const [key, def] of Object.entries(this.parameterDefs)) {
        const facadeParam = def.facadeParam || key;
        const facadeValue = facade.getParam(facadeParam as any);

        if (facadeValue !== undefined) {
          const transformedValue = def.fromFacade
            ? def.fromFacade(facadeValue)
            : facadeValue;

          // Update signal if it exists
          if (this.parameterSignals.has(key)) {
            this.parameterSignals.get(key)!.value = transformedValue;
          } else {
            // Create signal if needed
            this.getWritableSignal(key as any).value = transformedValue;
          }
        } else {
          console.warn(
            `[InitializerBase] Facade parameter not found: ${facadeParam}`
          );
        }
      }

      // Ensure we have event listeners registered
      if (this.registerEventListeners && !this.eventCleanup) {
        this.registerParameterChangedListeners();
      }

      return true;
    } catch (error) {
      console.error("[InitializerBase] Error syncing with facade:", error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Update a parameter value
   */
  public updateParameter<K extends keyof T>(key: K, value: T[K]): boolean {
    const paramDef = this.parameterDefs[key];

    if (!paramDef) {
      console.error(`[Initializer] Parameter not found: ${String(key)}`);
      return false;
    }

    if (paramDef.readOnly) {
      console.error(
        `[Initializer] Cannot update read-only parameter: ${String(key)}`
      );
      return false;
    }

    // Update signal if it exists
    if (this.parameterSignals.has(String(key))) {
      this.parameterSignals.get(String(key))!.value = value;
    } else {
      console.warn(`[InitializerBase] No signal found for ${String(key)}`);
    }

    // Update facade if not syncing
    if (!this.isSyncing && this.updateFacade) {
      const facade = this.getFacade();
      if (facade && facade.isInitialized()) {
        const facadeParam = paramDef.facadeParam || String(key);
        const transformedValue = paramDef.toFacade
          ? paramDef.toFacade(value)
          : value;

        return facade.updateParam(facadeParam as any, transformedValue);
      } else {
        console.warn(
          `[InitializerBase] Facade not available for parameter update: ${String(
            key
          )}`
        );
      }
    }

    return true;
  }

  /**
   * Update multiple parameters at once
   */
  public updateParameters(updates: Partial<T>): boolean {
    let success = true;
    const facadeUpdates: Record<string, any> = {};

    // First update all signals
    for (const [key, value] of Object.entries(updates)) {
      const paramKey = key as keyof T;
      const paramDef = this.parameterDefs[paramKey];

      if (!paramDef) {
        console.error(`[Initializer] Parameter not found: ${key}`);
        success = false;
        continue;
      }

      if (paramDef.readOnly) {
        console.error(
          `[Initializer] Cannot update read-only parameter: ${key}`
        );
        success = false;
        continue;
      }

      // Update signal if it exists
      if (this.parameterSignals.has(key)) {
        this.parameterSignals.get(key)!.value = value;
      }

      // Collect facade updates
      if (!this.isSyncing && this.updateFacade) {
        const facadeParam = paramDef.facadeParam || key;
        const transformedValue = paramDef.toFacade
          ? paramDef.toFacade(value)
          : value;

        facadeUpdates[facadeParam] = transformedValue;
      }
    }

    // Then batch update facade if needed
    if (Object.keys(facadeUpdates).length > 0 && this.updateFacade) {
      const facade = this.getFacade();
      if (facade && facade.isInitialized()) {
        const facadeResult = facade.batchUpdateParams(facadeUpdates);
        if (!facadeResult) success = false;
      }
    }

    return success;
  }

  /**
   * Get a parameter signal
   */
  public getSignal<K extends keyof T>(key: K): ReadonlySignal<T[K]> {
    const strKey = String(key);

    // Return cached signal if available
    if (this.readOnlySignals.has(strKey)) {
      return this.readOnlySignals.get(strKey) as ReadonlySignal<T[K]>;
    }

    const paramDef = this.parameterDefs[key];

    // If parameter definition has a signal accessor, use it
    if (paramDef.signal) {
      const signal = paramDef.signal();
      this.readOnlySignals.set(strKey, signal);
      return signal as ReadonlySignal<T[K]>;
    }

    // Get writable signal (creating if needed)
    const writableSignal = this.getWritableSignal(key);

    return writableSignal;
  }

  /**
   * Get a writable parameter signal
   * @private
   */
  protected getWritableSignal<K extends keyof T>(key: K): Signal<T[K]> {
    const strKey = String(key);
    const paramDef = this.parameterDefs[key];

    // Create signal if it doesn't exist
    if (!this.parameterSignals.has(strKey)) {
      // Get initial value
      let initialValue = paramDef.defaultValue;

      // Try to get value from facade
      const facade = this.getFacade();
      if (facade && facade.isInitialized()) {
        const facadeParam = paramDef.facadeParam || strKey;
        const facadeValue = facade.getParam(facadeParam as any);

        if (facadeValue !== undefined) {
          initialValue = paramDef.fromFacade
            ? paramDef.fromFacade(facadeValue)
            : facadeValue;
        }
      }

      const newSignal = this.createSignal(key, initialValue);
      this.parameterSignals.set(strKey, newSignal);
    }

    return this.parameterSignals.get(strKey) as Signal<T[K]>;
  }

  /**
   * Create a signal for a parameter
   * @private
   */
  protected createSignal<K extends keyof T>(
    key: K,
    initialValue: T[K]
  ): Signal<T[K]> {
    // This can be overridden in derived classes to add custom behavior
    const signal = new Signal<T[K]>(initialValue);

    // Add effect for facade updates if needed (overridden in derived classes)
    this.setupSignalEffect(key, signal);

    return signal;
  }

  /**
   * Set up effect for a parameter signal
   * @private
   */
  protected setupSignalEffect<K extends keyof T>(
    key: K,
    signal: Signal<T[K]>
  ): void {
    // To be implemented in derived classes if needed
  }

  /**
   * Ensure a facade parameter exists
   * @private
   */
  protected ensureParameterExists<V>(
    facade: IShaderAppFacade,
    paramName: string,
    defaultValue: V
  ): void {
    try {
      const currentValue = facade.getParam(paramName as any);
      if (currentValue === undefined) {
        facade.updateParam(paramName as any, defaultValue);
      }
    } catch (e) {
      console.error(
        `[Initializer] Error ensuring parameter ${paramName} exists:`,
        e
      );
    }
  }

  /**
   * Get the facade instance
   * @protected
   */
  protected getFacade(): IShaderAppFacade | null {
    return facadeSignal.value;
  }

  /**
   * Sync a specific parameter from the facade
   * @param key The parameter key to sync
   * @returns Whether the sync was successful
   */
  public syncParameterFromFacade<K extends keyof T>(key: K): boolean {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) {
      console.warn(
        `[InitializerBase] Cannot sync parameter ${String(
          key
        )}, facade not available`
      );
      return false;
    }

    try {
      this.isSyncing = true;

      // Get parameter definition
      const paramDef = this.parameterDefs[key];
      if (!paramDef) {
        console.warn(`[InitializerBase] Parameter ${String(key)} not defined`);
        return false;
      }

      // Get the facade parameter name
      const facadeParam = paramDef.facadeParam || String(key);

      // Get value from facade
      let value = facade.getParam(facadeParam as any);

      // Apply transformation if needed
      if (paramDef.fromFacade) {
        value = paramDef.fromFacade(value);
      }

      // Update signal if it exists
      const signal = this.parameterSignals.get(String(key));
      if (signal) {
        signal.value = value;
        return true;
      }

      console.warn(`[InitializerBase] No signal found for ${String(key)}`);
      return false;
    } catch (error) {
      console.error(
        `[InitializerBase] Error syncing parameter ${String(key)}:`,
        error
      );
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Destroy this initializer
   * This will clean up any event listeners
   */
  public destroy(): void {
    if (this.eventCleanup) {
      this.eventCleanup();
      this.eventCleanup = null;
    }
  }
}
