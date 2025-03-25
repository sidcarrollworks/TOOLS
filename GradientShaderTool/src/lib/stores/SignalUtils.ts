/**
 * SignalUtils - Utility functions for working with signals
 */

import {
  signal,
  computed,
  effect,
  type Signal,
  type ReadonlySignal,
} from "@preact/signals";

/**
 * Create a debounced signal that only updates the output after a delay
 * @param source Source signal to track
 * @param delay Delay in milliseconds
 * @returns Readonly signal that updates after the delay
 */
export function debounceSignal<T>(
  source: ReadonlySignal<T>,
  delay: number
): ReadonlySignal<T> {
  const debouncedSignal = signal<T>(source.value);
  let timeout: number | null = null;

  effect(() => {
    const sourceValue = source.value;

    // Clear existing timeout
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    // Set new timeout
    timeout = setTimeout(() => {
      debouncedSignal.value = sourceValue;
      timeout = null;
    }, delay) as unknown as number;

    // Clean up on effect disposal
    return () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    };
  });

  return computed(() => debouncedSignal.value);
}

/**
 * Create a throttled signal that updates at most once per interval
 * @param source Source signal to track
 * @param interval Minimum interval between updates in milliseconds
 * @returns Readonly signal that throttles updates
 */
export function throttleSignal<T>(
  source: ReadonlySignal<T>,
  interval: number
): ReadonlySignal<T> {
  const throttledSignal = signal<T>(source.value);
  let lastUpdate = 0;
  let timeout: number | null = null;
  let pendingValue: T | null = null;

  effect(() => {
    const sourceValue = source.value;
    const now = Date.now();

    // If we haven't updated recently, update immediately
    if (now - lastUpdate >= interval) {
      throttledSignal.value = sourceValue;
      lastUpdate = now;
      pendingValue = null;
    } else {
      // Save for later update
      pendingValue = sourceValue;

      // Schedule update if not already scheduled
      if (timeout === null) {
        const delay = interval - (now - lastUpdate);
        timeout = setTimeout(() => {
          if (pendingValue !== null) {
            throttledSignal.value = pendingValue;
            lastUpdate = Date.now();
            pendingValue = null;
          }
          timeout = null;
        }, delay) as unknown as number;
      }
    }

    // Clean up on effect disposal
    return () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    };
  });

  return computed(() => throttledSignal.value);
}

/**
 * Create a memoized signal that only recomputes when dependencies change
 * @param dependencies Array of signals to track
 * @param compute Function to compute the result
 * @returns Memoized signal that only updates when dependencies change
 */
export function memoSignal<T, D extends ReadonlySignal<any>[]>(
  dependencies: D,
  compute: (
    ...values: {
      [K in keyof D]: D[K] extends ReadonlySignal<infer U> ? U : never;
    }
  ) => T
): ReadonlySignal<T> {
  return computed(() => {
    const values = dependencies.map((dep) => dep.value) as any;
    return compute(...values);
  });
}

/**
 * Provide a stable signal reference for object values
 * @param signal Signal containing an object
 * @param compare Optional comparison function
 * @returns Signal with stable reference that only changes when values differ
 */
export function stableObjectSignal<T extends object>(
  source: ReadonlySignal<T>,
  compare?: (a: T, b: T) => boolean
): ReadonlySignal<T> {
  const stableSignal = signal<T>(source.value);
  let previousValue = source.value;

  effect(() => {
    const sourceValue = source.value;
    const isDifferent = compare
      ? !compare(previousValue, sourceValue)
      : !shallowEqual(previousValue, sourceValue);

    if (isDifferent) {
      previousValue = sourceValue;
      stableSignal.value = sourceValue;
    }
  });

  return computed(() => stableSignal.value);
}

/**
 * Compare two objects for shallow equality
 */
function shallowEqual(a: object, b: object): boolean {
  if (a === b) return true;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    // @ts-ignore
    if (a[key] !== b[key]) return false;
  }

  return true;
}

/**
 * Track how many times a signal causes recalculation
 * @param signal Signal to track
 * @param name Name for debugging
 * @returns The same signal with side effect for tracking
 */
export function debugSignal<T>(
  source: ReadonlySignal<T>,
  name: string
): ReadonlySignal<T> {
  let updateCount = 0;

  effect(() => {
    const value = source.value;
    updateCount++;
    console.log(`[SignalDebug] "${name}" updated (${updateCount}):`, value);
  });

  return source;
}

/**
 * Create a signal that transitions between values over time
 * @param source Source signal
 * @param duration Duration of transition in milliseconds
 * @param easingFn Optional easing function
 * @returns Signal that smoothly transitions between values
 */
export function transitionSignal(
  source: ReadonlySignal<number>,
  duration: number,
  easingFn: (t: number) => number = (t) => t
): ReadonlySignal<number> {
  const transitionSignal = signal<number>(source.value);
  let animationFrame: number | null = null;
  let startTime: number | null = null;
  let startValue: number = source.value;
  let targetValue: number = source.value;

  effect(() => {
    // Update target
    targetValue = source.value;

    // If we don't have a start yet, just jump to the value
    if (startTime === null) {
      startTime = performance.now();
      startValue = targetValue;
      transitionSignal.value = targetValue;
      return;
    }

    // Start the animation if not already running
    if (animationFrame === null) {
      startValue = transitionSignal.value;
      startTime = performance.now();

      const animate = (time: number) => {
        if (startTime === null) {
          startTime = time;
          startValue = transitionSignal.value;
        }

        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easingFn(progress);

        transitionSignal.value =
          startValue + (targetValue - startValue) * easedProgress;

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          animationFrame = null;
          startTime = null;
        }
      };

      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };
  });

  return computed(() => transitionSignal.value);
}

/**
 * Schedule an effect to run on the animation frame
 * @param callback Effect callback
 * @returns Cleanup function
 */
export function animationFrameEffect(
  callback: () => void | (() => void)
): () => void {
  let animationFrame: number | null = null;
  let cleanup: (() => void) | void;

  const runEffect = () => {
    animationFrame = null;
    cleanup = callback() || undefined;
  };

  const schedule = () => {
    if (animationFrame === null) {
      animationFrame = requestAnimationFrame(() => {
        runEffect();
      });
    }
  };

  // Set up the main effect
  const mainCleanup = effect(() => {
    schedule();

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
    };
  });

  return () => {
    mainCleanup();

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
  };
}
