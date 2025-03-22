/**
 * SharedSignals - Central registry for signals shared across components
 */

import {
  signal,
  computed,
  effect,
  batch,
  type Signal,
  type ReadonlySignal,
} from "@preact/signals";
import {
  bindParamToSignal,
  type ParamSignalBinding,
} from "../facade/FacadeSignalBridge";
import { facadeSignal } from "../../app";

/**
 * Registry of shared signals
 */
interface SharedSignalRegistry {
  [key: string]: {
    signal: Signal<any> | ReadonlySignal<any>;
    cleanup?: () => void;
    isReadOnly: boolean;
  };
}

/**
 * Options for creating a shared signal
 */
interface SharedSignalOptions<T> {
  /**
   * Initial value
   */
  defaultValue: T;

  /**
   * Whether the signal is read-only
   */
  readOnly?: boolean;

  /**
   * Facade parameter to bind to (if any)
   */
  facadeParam?: string;

  /**
   * Transform when reading from facade
   */
  fromFacade?: (value: any) => T;

  /**
   * Transform when writing to facade
   */
  toFacade?: (value: T) => any;

  /**
   * Debug mode
   */
  debug?: boolean;
}

/**
 * Dependencies map for signals that need to stay in sync
 */
interface SignalDependency {
  target: string;
  transform?: (value: any) => any;
}

// Registry of all shared signals
const registry: SharedSignalRegistry = {};

// Map of dependencies between signals
const dependencyMap = new Map<string, SignalDependency[]>();

/**
 * Create or get a shared signal
 */
export function getSharedSignal<T>(
  id: string,
  options?: SharedSignalOptions<T>
): ReadonlySignal<T> {
  // If signal exists and we're not forcing creation with options, return it
  if (id in registry && !options) {
    return registry[id].signal as ReadonlySignal<T>;
  }

  // Ensure options are provided for new signals
  if (!options && !(id in registry)) {
    throw new Error(`Cannot create shared signal '${id}' without options`);
  }

  // We know options must exist here based on the above checks
  const opts = options as SharedSignalOptions<T>;

  // If there's already a signal with this ID, clean it up first
  if (id in registry && registry[id].cleanup) {
    registry[id].cleanup!();
  }

  // If binding to facade
  if (opts.facadeParam) {
    const binding = bindParamToSignal<T>(opts.facadeParam, {
      defaultValue: opts.defaultValue,
      readOnly: opts.readOnly,
      fromFacade: opts.fromFacade,
      toFacade: opts.toFacade,
      debug: opts.debug,
    });

    registry[id] = {
      signal: binding.signal,
      cleanup: binding.cleanup,
      isReadOnly: !!opts.readOnly,
    };

    // Return the signal
    return binding.signal;
  }

  // Create a regular signal
  const internalSignal = signal<T>(opts.defaultValue);
  const exposedSignal = opts.readOnly
    ? computed(() => internalSignal.value)
    : internalSignal;

  // Set up dependencies
  const dependencies = dependencyMap.get(id) || [];
  const cleanupFns: Array<() => void> = [];

  for (const dep of dependencies) {
    const effectCleanup = effect(() => {
      const sourceSignal = registry[id].signal;
      const targetSignal = registry[dep.target].signal;

      if (!sourceSignal || !targetSignal || registry[dep.target].isReadOnly) {
        return;
      }

      const sourceValue = sourceSignal.value;
      const targetValue = dep.transform
        ? dep.transform(sourceValue)
        : sourceValue;

      if (opts.debug) {
        console.log(
          `[SharedSignals] Updating ${dep.target} from ${id}:`,
          sourceValue,
          "→",
          targetValue
        );
      }

      // Use any cast for writable signal access
      (targetSignal as Signal<any>).value = targetValue;
    });

    cleanupFns.push(effectCleanup);
  }

  const cleanup = () => {
    for (const fn of cleanupFns) {
      fn();
    }
  };

  registry[id] = {
    signal: exposedSignal,
    cleanup,
    isReadOnly: !!opts.readOnly,
  };

  return exposedSignal as ReadonlySignal<T>;
}

/**
 * Update a shared signal value
 */
export function updateSharedSignal<T>(id: string, value: T): boolean {
  if (!(id in registry)) {
    console.error(`Cannot update non-existent shared signal: ${id}`);
    return false;
  }

  if (registry[id].isReadOnly) {
    console.error(`Cannot update read-only shared signal: ${id}`);
    return false;
  }

  // Cast to writable signal
  const writableSignal = registry[id].signal as Signal<T>;
  writableSignal.value = value;
  return true;
}

/**
 * Register a dependency between signals
 */
export function registerDependency(
  sourceId: string,
  targetId: string,
  transform?: (value: any) => any
): void {
  if (sourceId === targetId) {
    console.error("Cannot register dependency to self:", sourceId);
    return;
  }

  // Get or create dependencies array
  const dependencies = dependencyMap.get(sourceId) || [];

  // Add new dependency
  dependencies.push({
    target: targetId,
    transform,
  });

  // Update dependency map
  dependencyMap.set(sourceId, dependencies);

  // If both signals already exist, set up the effect immediately
  if (registry[sourceId] && registry[targetId]) {
    // Re-create the source signal to set up the new dependency
    getSharedSignal(sourceId);
  }
}

/**
 * Batch update multiple shared signals
 */
export function batchUpdateSharedSignals(
  updates: Record<string, any>
): boolean {
  let success = true;

  batch(() => {
    for (const [id, value] of Object.entries(updates)) {
      const result = updateSharedSignal(id, value);
      if (!result) success = false;
    }
  });

  return success;
}

/**
 * Create common application signals
 */
export function initializeSharedSignals(): void {
  // UI-related shared signals
  getSharedSignal<boolean>("transparentBackground", {
    defaultValue: false,
    facadeParam: "exportTransparentBg",
    debug: false,
  });

  getSharedSignal<boolean>("showGrid", {
    defaultValue: true,
    debug: false,
  });

  getSharedSignal<string>("activePanel", {
    defaultValue: "preset",
    debug: false,
  });

  // Initialize relationships
  registerDependency("transparentBackground", "exportTransparentBackground");
}

/**
 * Clean up all shared signals
 */
export function cleanupSharedSignals(): void {
  for (const item of Object.values(registry)) {
    if (item.cleanup) {
      item.cleanup();
    }
  }
}
