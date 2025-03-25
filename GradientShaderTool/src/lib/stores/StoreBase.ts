import {
  signal,
  computed,
  type Signal,
  type ReadonlySignal,
} from "@preact/signals";

/**
 * Options for creating a store
 */
export interface StoreOptions {
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
}

/**
 * Base class for all signal-based stores
 */
export class StoreBase<T extends Record<string, any>> {
  /**
   * The internal state signal
   */
  protected stateSignal: Signal<T>;

  /**
   * Debug mode flag
   */
  protected debug: boolean;

  /**
   * Store name
   */
  protected name: string;

  /**
   * Computed signals cache
   */
  private computedCache: Map<string, ReadonlySignal<any>> = new Map();

  /**
   * Create a new store
   */
  constructor(initialState: T, options: StoreOptions = {}) {
    this.stateSignal = signal<T>(initialState);
    this.debug = options.debug || false;
    this.name = options.name || this.constructor.name;

    if (this.debug) {
      this.logDebug("Store created", initialState);
    }
  }

  /**
   * Get the current state
   */
  public getState(): T {
    return this.stateSignal.value;
  }

  /**
   * Update state by merging new values
   */
  public setState(newState: Partial<T>): void {
    const prevState = { ...this.stateSignal.value };
    const nextState = { ...prevState, ...newState };

    if (this.debug) {
      this.logDebug("setState", {
        prev: prevState,
        next: nextState,
        diff: newState,
      });
    }

    this.stateSignal.value = nextState;
  }

  /**
   * Set a single state property
   */
  public set<K extends keyof T>(key: K, value: T[K]): void {
    if (this.stateSignal.value[key] === value) {
      // Skip update if value is the same
      return;
    }

    if (this.debug) {
      this.logDebug(`set "${String(key)}"`, {
        prev: this.stateSignal.value[key],
        next: value,
      });
    }

    this.stateSignal.value = {
      ...this.stateSignal.value,
      [key]: value,
    };
  }

  /**
   * Get a single state property
   */
  public get<K extends keyof T>(key: K): T[K] {
    return this.stateSignal.value[key];
  }

  /**
   * Get a computed signal for a specific key
   */
  public select<K extends keyof T>(key: K): ReadonlySignal<T[K]> {
    const cacheKey = String(key);

    if (this.computedCache.has(cacheKey)) {
      return this.computedCache.get(cacheKey) as ReadonlySignal<T[K]>;
    }

    const computedSignal = computed(() => this.stateSignal.value[key]);
    this.computedCache.set(cacheKey, computedSignal);

    return computedSignal;
  }

  /**
   * Get a computed signal based on a selector function
   */
  public selectComputed<R>(
    selector: (state: T) => R,
    dependencies: Array<keyof T> = []
  ): ReadonlySignal<R> {
    // Create a cache key from the dependencies
    const cacheKey = `computed:${dependencies.join(",")}`;

    if (this.computedCache.has(cacheKey)) {
      return this.computedCache.get(cacheKey) as ReadonlySignal<R>;
    }

    const computedSignal = computed(() => {
      // Explicitly access each dependency to ensure the signal tracks them
      if (dependencies.length > 0) {
        dependencies.forEach((dep) => {
          // eslint-disable-next-line no-unused-expressions
          this.stateSignal.value[dep];
        });
      }

      return selector(this.stateSignal.value);
    });

    this.computedCache.set(cacheKey, computedSignal);

    return computedSignal;
  }

  /**
   * Reset the store to its initial state
   */
  public reset(initialState: T): void {
    if (this.debug) {
      this.logDebug("reset", {
        prev: this.stateSignal.value,
        next: initialState,
      });
    }

    this.stateSignal.value = initialState;
  }

  /**
   * Get the entire state as a readonly signal
   */
  public getSignal(): ReadonlySignal<T> {
    return this.stateSignal;
  }

  /**
   * Log debug information
   */
  protected logDebug(action: string, data?: any): void {
    /* eslint-disable no-console */
    console.debug(`[${this.name}] ${action}`, data);
    /* eslint-enable no-console */
  }
}
