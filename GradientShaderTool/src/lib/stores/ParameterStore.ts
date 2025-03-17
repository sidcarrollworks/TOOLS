import { StoreBase, StoreOptions } from "./StoreBase";
import type { ReadonlySignal } from "@preact/signals";
import { facadeSignal } from "../facade/FacadeContext";
import { useComputed, useSignalEffect } from "@preact/signals-react";
import { useCallback, useRef } from "preact/hooks";

/**
 * Parameter validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Parameter store state
 */
export interface ParameterState {
  /**
   * All parameters
   */
  parameters: Record<string, any>;

  /**
   * Validation errors
   */
  errors: Record<string, string>;

  /**
   * Parameters that have been modified from defaults
   */
  modified: Record<string, boolean>;

  /**
   * Parameters that are currently being updated (e.g. during a slider drag)
   */
  updating: Record<string, boolean>;

  /**
   * Flag indicating if a batch update is in progress
   */
  batchUpdateInProgress: boolean;

  /**
   * Batch update queue
   */
  batchUpdateQueue: Record<string, any>;
}

/**
 * Parameter store options
 */
export interface ParameterStoreOptions extends StoreOptions {
  /**
   * Enable debouncing for parameter updates
   */
  enableDebounce?: boolean;

  /**
   * Debounce delay in ms
   */
  debounceDelay?: number;

  /**
   * Enable parameter validation
   */
  enableValidation?: boolean;

  /**
   * Initialize from facade
   */
  initFromFacade?: boolean;

  /**
   * Parameter groups
   */
  parameterGroups?: Record<string, string[]>;
}

/**
 * Store for managing shader parameters
 */
export class ParameterStore extends StoreBase<ParameterState> {
  /**
   * Default options
   */
  private static readonly DEFAULT_OPTIONS: ParameterStoreOptions = {
    debug: false,
    enableDebounce: true,
    debounceDelay: 50,
    enableValidation: true,
    initFromFacade: true,
  };

  /**
   * Options
   */
  private options: ParameterStoreOptions;

  /**
   * Parameter groups
   */
  private parameterGroups: Record<string, string[]> = {};

  /**
   * Debounce timeouts
   */
  private debounceTimeouts: Record<string, number> = {};

  /**
   * Batch update timeout
   */
  private batchUpdateTimeout: number | null = null;

  /**
   * Create a new parameter store
   */
  constructor(options: ParameterStoreOptions = {}) {
    const initialState: ParameterState = {
      parameters: {},
      errors: {},
      modified: {},
      updating: {},
      batchUpdateInProgress: false,
      batchUpdateQueue: {},
    };

    super(initialState, {
      ...ParameterStore.DEFAULT_OPTIONS,
      ...options,
    });

    this.options = {
      ...ParameterStore.DEFAULT_OPTIONS,
      ...options,
    };

    this.parameterGroups = options.parameterGroups || {};

    if (this.options.initFromFacade) {
      this.initFromFacade();
    }
  }

  /**
   * Initialize parameters from facade
   */
  private initFromFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) {
      if (this.debug) {
        this.logDebug("initFromFacade: Facade not available");
      }
      return;
    }

    // Get all parameters from facade
    try {
      const parameters = facade.getAllParameters();
      this.setState({ parameters });

      if (this.debug) {
        this.logDebug("Initialized parameters from facade", parameters);
      }
    } catch (err) {
      if (this.debug) {
        this.logDebug("Error initializing from facade", err);
      }
    }
  }

  /**
   * Set a parameter value
   */
  public setParameter(
    name: string,
    value: any,
    options: { immediate?: boolean } = {}
  ): boolean {
    const { immediate = false } = options;
    const currentValue = this.stateSignal.value.parameters[name];

    // Skip if value is the same
    if (currentValue === value) {
      return true;
    }

    // Mark parameter as modified if it's changing
    this.set("modified", {
      ...this.stateSignal.value.modified,
      [name]: true,
    });

    // Mark parameter as updating
    this.set("updating", {
      ...this.stateSignal.value.updating,
      [name]: true,
    });

    // If validation is enabled, validate the parameter
    if (this.options.enableValidation) {
      const validation = this.validateParameter(name, value);
      if (!validation.valid) {
        // Update errors
        this.set("errors", {
          ...this.stateSignal.value.errors,
          [name]: validation.error || "Invalid value",
        });

        // Mark parameter as not updating
        this.set("updating", {
          ...this.stateSignal.value.updating,
          [name]: false,
        });

        return false;
      }

      // Clear error if parameter is valid
      const errors = { ...this.stateSignal.value.errors };
      delete errors[name];
      this.set("errors", errors);
    }

    // If debouncing is enabled and not immediate, debounce the update
    if (this.options.enableDebounce && !immediate) {
      this.debounceParameterUpdate(name, value);
      return true;
    }

    // Update the parameter immediately
    this.updateParameterValue(name, value);
    return true;
  }

  /**
   * Debounce a parameter update
   */
  private debounceParameterUpdate(name: string, value: any): void {
    // Clear existing timeout
    if (this.debounceTimeouts[name]) {
      window.clearTimeout(this.debounceTimeouts[name]);
    }

    // If batch update is in progress, add to queue
    if (this.stateSignal.value.batchUpdateInProgress) {
      this.set("batchUpdateQueue", {
        ...this.stateSignal.value.batchUpdateQueue,
        [name]: value,
      });
      return;
    }

    // Set a new timeout
    this.debounceTimeouts[name] = window.setTimeout(() => {
      this.updateParameterValue(name, value);
      delete this.debounceTimeouts[name];
    }, this.options.debounceDelay);
  }

  /**
   * Update a parameter value and apply to facade
   */
  private updateParameterValue(name: string, value: any): void {
    // Update internal state
    this.set("parameters", {
      ...this.stateSignal.value.parameters,
      [name]: value,
    });

    // Mark parameter as not updating
    this.set("updating", {
      ...this.stateSignal.value.updating,
      [name]: false,
    });

    // Apply to facade
    const facade = facadeSignal.value;
    if (facade) {
      facade.setParameter(name, value);
    }
  }

  /**
   * Update multiple parameters at once
   */
  public updateParameters(
    updates: Record<string, any>,
    options: { immediate?: boolean } = {}
  ): boolean {
    const { immediate = false } = options;

    // Skip if no updates
    if (Object.keys(updates).length === 0) {
      return true;
    }

    // If debouncing is enabled and not immediate, batch the updates
    if (this.options.enableDebounce && !immediate) {
      // Mark batch update in progress
      this.set("batchUpdateInProgress", true);

      // Add updates to queue
      const queue = { ...this.stateSignal.value.batchUpdateQueue };
      Object.entries(updates).forEach(([name, value]) => {
        queue[name] = value;

        // Mark parameter as updating
        this.set("updating", {
          ...this.stateSignal.value.updating,
          [name]: true,
        });

        // Mark parameter as modified
        this.set("modified", {
          ...this.stateSignal.value.modified,
          [name]: true,
        });
      });

      this.set("batchUpdateQueue", queue);

      // Clear existing timeout
      if (this.batchUpdateTimeout) {
        window.clearTimeout(this.batchUpdateTimeout);
      }

      // Set a new timeout
      this.batchUpdateTimeout = window.setTimeout(() => {
        this.processBatchUpdateQueue();
        this.batchUpdateTimeout = null;
      }, this.options.debounceDelay);

      return true;
    }

    // Process updates immediately
    const facade = facadeSignal.value;
    if (facade) {
      const result = facade.updateParameters(updates);

      if (result) {
        // Update internal state
        this.set("parameters", {
          ...this.stateSignal.value.parameters,
          ...updates,
        });

        // Mark parameters as modified
        const modified = { ...this.stateSignal.value.modified };
        Object.keys(updates).forEach((name) => {
          modified[name] = true;
        });
        this.set("modified", modified);
      }

      return result;
    }

    return false;
  }

  /**
   * Process the batch update queue
   */
  private processBatchUpdateQueue(): void {
    const queue = this.stateSignal.value.batchUpdateQueue;

    // Skip if queue is empty
    if (Object.keys(queue).length === 0) {
      this.set("batchUpdateInProgress", false);
      return;
    }

    // Apply all updates to facade
    const facade = facadeSignal.value;
    if (facade) {
      facade.updateParameters(queue);

      // Update internal state
      this.set("parameters", {
        ...this.stateSignal.value.parameters,
        ...queue,
      });
    }

    // Clear updating flags
    const updating = { ...this.stateSignal.value.updating };
    Object.keys(queue).forEach((name) => {
      updating[name] = false;
    });
    this.set("updating", updating);

    // Clear queue and batch update flag
    this.set("batchUpdateQueue", {});
    this.set("batchUpdateInProgress", false);
  }

  /**
   * Get a parameter value
   */
  public getParameter(name: string): any {
    return this.stateSignal.value.parameters[name];
  }

  /**
   * Get a parameter as a signal
   */
  public selectParameter(name: string): ReadonlySignal<any> {
    return this.selectComputed(
      (state) => state.parameters[name],
      ["parameters"]
    );
  }

  /**
   * Get all parameters in a group
   */
  public getParameterGroup(groupName: string): Record<string, any> {
    const group = this.parameterGroups[groupName];
    if (!group) {
      return {};
    }

    const result: Record<string, any> = {};
    group.forEach((name) => {
      result[name] = this.getParameter(name);
    });

    return result;
  }

  /**
   * Get all parameters in a group as signals
   */
  public selectParameterGroup(
    groupName: string
  ): Record<string, ReadonlySignal<any>> {
    const group = this.parameterGroups[groupName];
    if (!group) {
      return {};
    }

    const result: Record<string, ReadonlySignal<any>> = {};
    group.forEach((name) => {
      result[name] = this.selectParameter(name);
    });

    return result;
  }

  /**
   * Reset all parameters to defaults
   */
  public resetParameters(): void {
    const facade = facadeSignal.value;
    if (facade) {
      facade.resetParameters();

      // Update internal state with defaults
      const parameters = facade.getAllParameters();
      this.setState({
        parameters,
        modified: {},
        errors: {},
        updating: {},
      });
    }
  }

  /**
   * Check if a parameter is modified
   */
  public isModified(name: string): boolean {
    return !!this.stateSignal.value.modified[name];
  }

  /**
   * Check if a parameter is being updated
   */
  public isUpdating(name: string): boolean {
    return !!this.stateSignal.value.updating[name];
  }

  /**
   * Get parameter error
   */
  public getError(name: string): string | undefined {
    return this.stateSignal.value.errors[name];
  }

  /**
   * Validate a parameter value
   */
  private validateParameter(name: string, value: any): ValidationResult {
    const facade = facadeSignal.value;
    if (!facade) {
      return { valid: true };
    }

    try {
      const valid = facade.validateParameter(name, value);
      return { valid };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : "Invalid value",
      };
    }
  }
}

/**
 * Hook for using a parameter
 */
export function useParameter(name: string) {
  const store = useParameterStore();
  const value = useComputed(() => store.getParameter(name));
  const isUpdating = useComputed(() => store.isUpdating(name));
  const error = useComputed(() => store.getError(name));

  const setValue = useCallback(
    (newValue: any, options?: { immediate?: boolean }) => {
      return store.setParameter(name, newValue, options);
    },
    [store, name]
  );

  return { value, setValue, isUpdating, error };
}

/**
 * Hook for using multiple parameters
 */
export function useParameterGroup(names: string[]) {
  const store = useParameterStore();

  const values = useComputed(() => {
    const result: Record<string, any> = {};
    names.forEach((name) => {
      result[name] = store.getParameter(name);
    });
    return result;
  });

  const updating = useComputed(() => {
    const result: Record<string, boolean> = {};
    names.forEach((name) => {
      result[name] = store.isUpdating(name);
    });
    return result;
  });

  const errors = useComputed(() => {
    const result: Record<string, string | undefined> = {};
    names.forEach((name) => {
      result[name] = store.getError(name);
    });
    return result;
  });

  const setValue = useCallback(
    (name: string, value: any, options?: { immediate?: boolean }) => {
      return store.setParameter(name, value, options);
    },
    [store]
  );

  const setValues = useCallback(
    (values: Record<string, any>, options?: { immediate?: boolean }) => {
      return store.updateParameters(values, options);
    },
    [store]
  );

  return { values, updating, errors, setValue, setValues };
}

// Store instance
let parameterStoreInstance: ParameterStore | null = null;

/**
 * Get the parameter store instance
 */
export function getParameterStore(): ParameterStore {
  if (!parameterStoreInstance) {
    parameterStoreInstance = new ParameterStore();
  }
  return parameterStoreInstance;
}

/**
 * Hook for using the parameter store
 */
export function useParameterStore(): ParameterStore {
  return getParameterStore();
}

/**
 * Initialize parameter store with facade
 */
export function initializeParameterStore(): void {
  // Initialize the store
  const store = getParameterStore();

  // Subscribe to facade changes
  useSignalEffect(() => {
    const facade = facadeSignal.value;
    if (facade) {
      // Subscribe to parameter changes from the facade
      const handleParameterUpdate = (event: {
        parameter: string;
        value: any;
      }) => {
        const { parameter, value } = event;
        store.setState({
          parameters: {
            ...store.getState().parameters,
            [parameter]: value,
          },
          updating: {
            ...store.getState().updating,
            [parameter]: false,
          },
        });
      };

      facade.on("parameter:update", handleParameterUpdate);

      // Cleanup
      return () => {
        facade.off("parameter:update", handleParameterUpdate);
      };
    }
  });
}
