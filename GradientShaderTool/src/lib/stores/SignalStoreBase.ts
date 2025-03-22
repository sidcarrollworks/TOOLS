import {
  signal,
  computed,
  effect,
  batch,
  type Signal,
  type ReadonlySignal,
} from "@preact/signals";
import { StoreBase } from "./StoreBase";

/**
 * Options for creating a signal-based store
 */
export interface SignalStoreOptions {
  /**
   * Enable debug mode
   */
  debug?: boolean;

  /**
   * Name of the store (for debugging)
   */
  name?: string;

  /**
   * Initial state
   */
  initialState?: Record<string, any>;

  /**
   * Whether to automatically sync with facade
   */
  autoSyncWithFacade?: boolean;
}

/**
 * Configuration for signal-facade bindings
 */
export interface SignalFacadeBinding<T> {
  /**
   * The facade parameter name
   */
  facadeParam: string;

  /**
   * Optional transformation to apply when reading from facade
   */
  fromFacade?: (value: any) => T;

  /**
   * Optional transformation to apply when writing to facade
   */
  toFacade?: (value: T) => any;
}

/**
 * Enhanced base class for all signal-based stores with improved facade integration
 */
export class SignalStoreBase<
  T extends Record<string, any>
> extends StoreBase<T> {
  /**
   * Individual property signals cache
   */
  private signalCache: Map<string, Signal<any>> = new Map();

  /**
   * Read-only property signals cache
   */
  private readOnlySignalCache: Map<string, ReadonlySignal<any>> = new Map();

  /**
   * Facade parameter bindings for two-way sync
   */
  private facadeBindings: Map<string, SignalFacadeBinding<any>> = new Map();

  /**
   * Whether we're currently syncing with facade (to prevent cycles)
   */
  protected isSyncing: boolean = false;

  /**
   * Create a new signal-based store
   */
  constructor(initialState: T, options: SignalStoreOptions = {}) {
    super(initialState, options);
  }

  /**
   * Create a signal for a specific property
   */
  protected createSignal<K extends keyof T>(
    key: K,
    initialValue?: T[K]
  ): Signal<T[K]> {
    const cacheKey = String(key);

    if (this.signalCache.has(cacheKey)) {
      return this.signalCache.get(cacheKey) as Signal<T[K]>;
    }

    // Use the value from state or provided initialValue
    const value =
      initialValue !== undefined ? initialValue : this.stateSignal.value[key];

    const propertySignal = signal<T[K]>(value);

    // Store in cache
    this.signalCache.set(cacheKey, propertySignal);

    // Create effect to keep state in sync with this signal
    effect(() => {
      const newValue = propertySignal.value;
      if (this.stateSignal.value[key] !== newValue) {
        // Update state without triggering circular updates
        const update = { [key]: newValue } as unknown as Partial<T>;
        this.setState(update);
      }
    });

    // Also create effect to keep signal in sync with state
    effect(() => {
      const stateValue = this.stateSignal.value[key];
      if (propertySignal.value !== stateValue && !this.isSyncing) {
        propertySignal.value = stateValue;
      }
    });

    return propertySignal;
  }

  /**
   * Get a signal for a specific property (creating it if needed)
   */
  public getPropertySignal<K extends keyof T>(key: K): Signal<T[K]> {
    const cacheKey = String(key);

    if (!this.signalCache.has(cacheKey)) {
      return this.createSignal(key);
    }

    return this.signalCache.get(cacheKey) as Signal<T[K]>;
  }

  /**
   * Get a read-only signal for a specific property
   */
  public getReadOnlySignal<K extends keyof T>(key: K): ReadonlySignal<T[K]> {
    const cacheKey = String(key);

    if (this.readOnlySignalCache.has(cacheKey)) {
      return this.readOnlySignalCache.get(cacheKey) as ReadonlySignal<T[K]>;
    }

    // Get or create the writable signal
    const writableSignal = this.getPropertySignal(key);

    // Create a readonly wrapper
    const readonlySignal = computed(() => writableSignal.value);

    // Cache it
    this.readOnlySignalCache.set(cacheKey, readonlySignal);

    return readonlySignal;
  }

  /**
   * Create a computed signal based on one or more state properties
   */
  public createComputedSignal<R>(
    dependencies: (keyof T)[],
    compute: (values: Record<keyof T, any>) => R
  ): ReadonlySignal<R> {
    return computed(() => {
      const values = {} as Record<keyof T, any>;
      for (const key of dependencies) {
        values[key] = this.stateSignal.value[key];
      }
      return compute(values);
    });
  }

  /**
   * Bind a signal to a facade parameter for two-way sync
   */
  public bindSignalToFacade<K extends keyof T>(
    key: K,
    binding: SignalFacadeBinding<T[K]>
  ): void {
    const cacheKey = String(key);
    this.facadeBindings.set(cacheKey, binding);

    // Make sure the signal exists
    this.getPropertySignal(key);
  }

  /**
   * Update a signal's value directly
   */
  public updateSignal<K extends keyof T>(key: K, value: T[K]): void {
    const signal = this.getPropertySignal(key);
    signal.value = value;

    // Update facade if there's a binding
    this.syncSignalToFacade(key);
  }

  /**
   * Update multiple signals at once in a batch
   */
  public updateSignals(updates: Partial<T>): void {
    batch(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (key in this.stateSignal.value) {
          this.updateSignal(key as keyof T, value);
        }
      }
    });
  }

  /**
   * Get the entire state as a readonly signal (keep original interface)
   */
  public getSignal(): ReadonlySignal<T> {
    return super.getSignal();
  }

  /**
   * Synchronize a specific signal with its facade binding
   */
  protected syncSignalToFacade<K extends keyof T>(key: K): void {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) return;

    const cacheKey = String(key);
    const binding = this.facadeBindings.get(cacheKey);
    if (!binding) return;

    const signal = this.getPropertySignal(key);
    let value = signal.value;

    // Apply transformation if provided
    if (binding.toFacade) {
      value = binding.toFacade(value);
    }

    // Update facade
    facade.updateParam(binding.facadeParam as any, value);
  }

  /**
   * Synchronize a specific facade parameter with its signal binding
   */
  protected syncFacadeToSignal<K extends keyof T>(key: K): void {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) return;

    const cacheKey = String(key);
    const binding = this.facadeBindings.get(cacheKey);
    if (!binding) return;

    // Get value from facade
    let value = facade.getParam(binding.facadeParam as any);

    // Apply transformation if provided
    if (binding.fromFacade) {
      value = binding.fromFacade(value);
    }

    // Update signal without triggering facade update
    this.isSyncing = true;
    this.getPropertySignal(key).value = value;
    this.isSyncing = false;
  }

  /**
   * Synchronize all bound signals with the facade
   */
  public syncWithFacade(): void {
    const facade = this.getFacade();
    if (!facade || !facade.isInitialized()) return;

    this.isSyncing = true;
    try {
      for (const [key] of this.facadeBindings) {
        this.syncFacadeToSignal(key as keyof T);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get the facade instance
   * This method should be overridden by derived stores
   */
  protected getFacade(): any {
    // Implement in derived class
    return null;
  }

  /**
   * Override setState to handle signal updates
   */
  public setState(newState: Partial<T>): void {
    super.setState(newState);

    // Update individual signals
    if (!this.isSyncing) {
      for (const [key, value] of Object.entries(newState)) {
        const cacheKey = key;
        if (this.signalCache.has(cacheKey)) {
          const signal = this.signalCache.get(cacheKey) as Signal<any>;
          if (signal.value !== value) {
            signal.value = value;
          }
        }
      }
    }
  }

  /**
   * Reset the store and all signals to initial state
   */
  public reset(initialState: T): void {
    super.reset(initialState);

    this.isSyncing = true;
    try {
      // Reset all cached signals
      for (const [key, value] of Object.entries(initialState)) {
        const cacheKey = key;
        if (this.signalCache.has(cacheKey)) {
          const signal = this.signalCache.get(cacheKey) as Signal<any>;
          signal.value = value;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
}
