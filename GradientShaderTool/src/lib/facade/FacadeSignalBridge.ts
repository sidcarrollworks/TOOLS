/**
 * FacadeSignalBridge - Standardized bridge between signals and the shader app facade
 */

import {
  signal,
  computed,
  effect,
  batch,
  type Signal,
  type ReadonlySignal,
} from "@preact/signals";
import type { IShaderAppFacade, ShaderAppEventType } from "./types";
import { facadeSignal } from "../../app";

/**
 * Options for creating a facade parameter signal
 */
export interface FacadeParamSignalOptions<T> {
  /**
   * Initial value to use if facade is not available
   */
  defaultValue: T;

  /**
   * Whether the signal should be read-only
   */
  readOnly?: boolean;

  /**
   * Function to transform the value when reading from facade
   */
  fromFacade?: (value: any) => T;

  /**
   * Function to transform the value when writing to facade
   */
  toFacade?: (value: T) => any;

  /**
   * Whether to sync with facade immediately
   */
  syncImmediately?: boolean;

  /**
   * Debug mode
   */
  debug?: boolean;
}

/**
 * Result of binding a parameter to a signal
 */
export interface ParamSignalBinding<T> {
  /**
   * The readable signal
   */
  signal: ReadonlySignal<T>;

  /**
   * Function to update the value
   */
  setValue: (value: T) => void;

  /**
   * Force sync from facade to signal
   */
  syncFromFacade: () => void;

  /**
   * Force sync from signal to facade
   */
  syncToFacade: () => void;

  /**
   * Clean up the binding
   */
  cleanup: () => void;
}

/**
 * Create a read-only signal from a facade parameter
 */
export function createFacadeParamSignal<T>(
  paramName: string,
  options: FacadeParamSignalOptions<T>
): ReadonlySignal<T> {
  const internalSignal = signal<T>(options.defaultValue);
  const facade = facadeSignal.value;

  // Initialize from facade if available
  if (facade && facade.isInitialized() && options.syncImmediately !== false) {
    const facadeValue = facade.getParam(paramName as any);
    if (facadeValue !== undefined) {
      const transformedValue = options.fromFacade
        ? options.fromFacade(facadeValue)
        : (facadeValue as T);
      internalSignal.value = transformedValue;
    }
  }

  // Set up effect to update signal when facade changes
  effect(() => {
    const currentFacade = facadeSignal.value;
    if (!currentFacade || !currentFacade.isInitialized()) return;

    const handlePresetApplied = () => {
      const newValue = currentFacade.getParam(paramName as any);
      if (newValue !== undefined) {
        const transformedValue = options.fromFacade
          ? options.fromFacade(newValue)
          : (newValue as T);
        internalSignal.value = transformedValue;
      }
    };

    // Register event listener for preset changes
    currentFacade.on("preset-applied", handlePresetApplied);

    return () => {
      currentFacade.off("preset-applied", handlePresetApplied);
    };
  });

  return computed(() => internalSignal.value);
}

/**
 * Create a signal that's bound to a facade parameter (two-way binding)
 */
export function bindParamToSignal<T>(
  paramName: string,
  options: FacadeParamSignalOptions<T>
): ParamSignalBinding<T> {
  // Internal signal is writable
  const internalSignal = signal<T>(options.defaultValue);
  // Create a read-only computed for external use if readOnly is true
  const readSignal = options.readOnly
    ? computed(() => internalSignal.value)
    : internalSignal;

  // Track if we're currently syncing to prevent loops
  let isSyncing = false;

  // Create effect for facade changes
  const facadeChangeCleanup = effect(() => {
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) return;

    // Function to update from facade
    const updateFromFacade = () => {
      if (isSyncing) return;

      try {
        isSyncing = true;
        const facadeValue = facade.getParam(paramName as any);

        if (facadeValue !== undefined) {
          const transformedValue = options.fromFacade
            ? options.fromFacade(facadeValue)
            : (facadeValue as T);

          if (options.debug) {
            console.log(
              `[FacadeSignalBridge] ${paramName} updated from facade:`,
              facadeValue,
              "→",
              transformedValue
            );
          }

          internalSignal.value = transformedValue;
        }
      } finally {
        isSyncing = false;
      }
    };

    // Listen for preset changes
    facade.on("preset-applied", updateFromFacade);

    // Initial sync
    if (options.syncImmediately !== false) {
      updateFromFacade();
    }

    return () => {
      facade.off("preset-applied", updateFromFacade);
    };
  });

  // Create effect for signal changes
  const signalChangeCleanup = effect(() => {
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized() || isSyncing) return;

    const value = internalSignal.value;
    const transformedValue = options.toFacade ? options.toFacade(value) : value;

    if (options.debug) {
      console.log(
        `[FacadeSignalBridge] ${paramName} updated from signal:`,
        value,
        "→",
        transformedValue
      );
    }

    facade.updateParam(paramName as any, transformedValue);
  });

  // Function to update the value
  const setValue = (value: T) => {
    internalSignal.value = value;
  };

  // Function to force sync from facade
  const syncFromFacade = () => {
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) return;

    try {
      isSyncing = true;
      const facadeValue = facade.getParam(paramName as any);

      if (facadeValue !== undefined) {
        const transformedValue = options.fromFacade
          ? options.fromFacade(facadeValue)
          : (facadeValue as T);

        internalSignal.value = transformedValue;
      }
    } finally {
      isSyncing = false;
    }
  };

  // Function to force sync to facade
  const syncToFacade = () => {
    const facade = facadeSignal.value;
    if (!facade || !facade.isInitialized()) return;

    const value = internalSignal.value;
    const transformedValue = options.toFacade ? options.toFacade(value) : value;

    facade.updateParam(paramName as any, transformedValue);
  };

  // Cleanup function
  const cleanup = () => {
    facadeChangeCleanup();
    signalChangeCleanup();
  };

  return {
    signal: readSignal,
    setValue,
    syncFromFacade,
    syncToFacade,
    cleanup,
  };
}

/**
 * Create a signal from a facade event
 */
export function createEventSignal<T, E extends ShaderAppEventType>(
  eventType: E,
  defaultValue: T
): ReadonlySignal<T> {
  const eventSignal = signal<T>(defaultValue);

  effect(() => {
    const facade = facadeSignal.value;
    if (!facade) return;

    const handleEvent = (eventData: any) => {
      eventSignal.value = eventData as T;
    };

    facade.on(eventType, handleEvent);

    return () => {
      facade.off(eventType, handleEvent);
    };
  });

  return computed(() => eventSignal.value);
}

/**
 * Batch update multiple facade parameters
 */
export function batchUpdateFacadeParams(updates: Record<string, any>): boolean {
  const facade = facadeSignal.value;
  if (!facade || !facade.isInitialized()) return false;

  return facade.batchUpdateParams(updates);
}

/**
 * Create a utility for syncing multiple parameters at once
 */
export function createParamSyncGroup(
  bindings: Record<string, ParamSignalBinding<any>>
): {
  syncFromFacade: () => void;
  syncToFacade: () => void;
  cleanup: () => void;
} {
  const syncFromFacade = () => {
    for (const binding of Object.values(bindings)) {
      binding.syncFromFacade();
    }
  };

  const syncToFacade = () => {
    for (const binding of Object.values(bindings)) {
      binding.syncToFacade();
    }
  };

  const cleanup = () => {
    for (const binding of Object.values(bindings)) {
      binding.cleanup();
    }
  };

  return {
    syncFromFacade,
    syncToFacade,
    cleanup,
  };
}
