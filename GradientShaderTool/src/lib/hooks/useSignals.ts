/**
 * Custom hooks for working with signals in components
 */

import { useEffect, useState, useCallback, useRef } from "preact/hooks";
import { type Signal, type ReadonlySignal } from "@preact/signals";
import { debounceSignal, throttleSignal } from "../stores/SignalUtils";
import {
  bindParamToSignal,
  type ParamSignalBinding,
} from "../facade/FacadeSignalBridge";
import { getSharedSignal, updateSharedSignal } from "../stores/SharedSignals";
import { facadeSignal } from "../../app";

/**
 * Hook to read a signal value with automatic re-renders
 * @param signal The signal to read
 * @returns Current signal value
 */
export function useSignalValue<T>(signal: ReadonlySignal<T>): T {
  const [value, setValue] = useState<T>(signal.value);

  useEffect(() => {
    // Initial value
    setValue(signal.value);

    // Subscribe to changes
    const unsubscribe = signal.subscribe((newValue) => {
      setValue(newValue);
    });

    // Cleanup subscription
    return unsubscribe;
  }, [signal]);

  return value;
}

/**
 * Hook to read and update a signal
 * @param signal The signal to interact with
 * @returns Tuple with current value and setter function
 */
export function useSignal<T>(signal: Signal<T>): [T, (value: T) => void] {
  const value = useSignalValue(signal);
  const setValue = useCallback(
    (newValue: T) => {
      signal.value = newValue;
    },
    [signal]
  );

  return [value, setValue];
}

/**
 * Hook to track previous value of a signal
 * @param signal The signal to track
 * @returns The previous value of the signal
 */
export function usePreviousSignalValue<T>(
  signal: ReadonlySignal<T>
): T | undefined {
  const currentValue = useSignalValue(signal);
  const previousValueRef = useRef<T | undefined>(undefined);

  useEffect(() => {
    const cleanup = () => {
      previousValueRef.current = currentValue;
    };
    return cleanup;
  }, [currentValue]);

  return previousValueRef.current;
}

/**
 * Hook to use a signal with debouncing
 * @param signal The signal to debounce
 * @param delay Debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounceSignal<T>(
  signal: ReadonlySignal<T>,
  delay: number
): T {
  const debouncedSignalRef = useRef<ReadonlySignal<T> | null>(null);

  if (!debouncedSignalRef.current) {
    debouncedSignalRef.current = debounceSignal(signal, delay);
  }

  return useSignalValue(debouncedSignalRef.current);
}

/**
 * Hook to use a signal with throttling
 * @param signal The signal to throttle
 * @param interval Throttle interval in milliseconds
 * @returns The throttled value
 */
export function useThrottleSignal<T>(
  signal: ReadonlySignal<T>,
  interval: number
): T {
  const throttledSignalRef = useRef<ReadonlySignal<T> | null>(null);

  if (!throttledSignalRef.current) {
    throttledSignalRef.current = throttleSignal(signal, interval);
  }

  return useSignalValue(throttledSignalRef.current);
}

/**
 * Hook to use a facade parameter as a signal
 * @param paramName The facade parameter name
 * @param defaultValue Default value to use if facade is not available
 * @param options Additional options
 * @returns Tuple with current value and setter function
 */
export function useParamSignal<T>(
  paramName: string,
  defaultValue: T,
  options: {
    readOnly?: boolean;
    fromFacade?: (value: any) => T;
    toFacade?: (value: T) => any;
    debounce?: number;
    throttle?: number;
  } = {}
): [T, (value: T) => void] {
  const bindingRef = useRef<ParamSignalBinding<T> | null>(null);

  // Create binding if it doesn't exist
  if (!bindingRef.current) {
    bindingRef.current = bindParamToSignal<T>(paramName, {
      defaultValue,
      readOnly: options.readOnly,
      fromFacade: options.fromFacade,
      toFacade: options.toFacade,
    });
  }

  // Get the signal from the binding
  const signal = bindingRef.current.signal;

  // Apply debounce or throttle if requested
  const finalSignal = options.debounce
    ? debounceSignal(signal, options.debounce)
    : options.throttle
    ? throttleSignal(signal, options.throttle)
    : signal;

  // Get the current value
  const value = useSignalValue(finalSignal);

  // Create the setter function
  const setValue = useCallback(
    (newValue: T) => {
      if (bindingRef.current) {
        bindingRef.current.setValue(newValue);
      }
    },
    [bindingRef]
  );

  // Clean up binding when component unmounts
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.cleanup();
        bindingRef.current = null;
      }
    };
  }, []);

  return [value, setValue];
}

/**
 * Hook to use a shared signal
 * @param id The ID of the shared signal
 * @param options Options for creating the signal if it doesn't exist
 * @returns Tuple with current value and setter function
 */
export function useSharedSignal<T>(
  id: string,
  options?: {
    defaultValue: T;
    readOnly?: boolean;
    facadeParam?: string;
    fromFacade?: (value: any) => T;
    toFacade?: (value: T) => any;
  }
): [T, (value: T) => void] {
  // Get or create the signal
  const signal = getSharedSignal<T>(id, options);

  // Get the current value
  const value = useSignalValue(signal);

  // Create the setter function
  const setValue = useCallback(
    (newValue: T) => {
      updateSharedSignal(id, newValue);
    },
    [id]
  );

  return [value, setValue];
}

/**
 * Hook that runs an effect when signal(s) change
 * @param effect The effect to run
 * @param signals Array of signals to watch
 */
export function useSignalEffect(
  effect: () => void | (() => void),
  signals: ReadonlySignal<any>[]
): void {
  useEffect(() => {
    // Create cleanup subscriptions array
    const cleanups: Array<() => void> = [];

    // Function to run the effect
    const runEffect = () => {
      // Clean up previous effect
      cleanups.forEach((cleanup) => cleanup());
      cleanups.length = 0;

      // Run the new effect
      const cleanup = effect();
      if (cleanup) {
        cleanups.push(cleanup);
      }
    };

    // Run initially
    runEffect();

    // Set up subscriptions
    const unsubscribes = signals.map((signal) =>
      signal.subscribe(() => runEffect())
    );

    // Clean up subscriptions and effect on unmount
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [effect, ...signals]); // Technically this doesn't work as expected with signals, but it's needed for TypeScript
}

/**
 * Hook to synchronize React state with a signal
 * @param signal The signal to sync with
 * @param initialValue Optional initial value (defaults to signal.value)
 * @returns [state, setState] tuple that stays in sync with the signal
 */
export function useSyncedState<T>(
  signal: ReadonlySignal<T>,
  initialValue?: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(
    initialValue !== undefined ? initialValue : signal.value
  );

  // Keep state in sync with signal
  useEffect(() => {
    setState(signal.value);

    const unsubscribe = signal.subscribe((value) => {
      setState(value);
    });

    return unsubscribe;
  }, [signal]);

  // For writable signals, provide a setState that also updates the signal
  const setStateAndSignal = useCallback(
    (value: T) => {
      setState(value);

      // Only update signal if it's writable
      if ("value" in signal) {
        (signal as Signal<T>).value = value;
      }
    },
    [signal]
  );

  return [state, setStateAndSignal];
}

/**
 * Hook to check if the facade is available
 * @returns Boolean indicating if facade is available and initialized
 */
export function useFacadeAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState<boolean>(
    !!facadeSignal.value && facadeSignal.value.isInitialized()
  );

  useEffect(() => {
    const checkAvailability = () => {
      const facade = facadeSignal.value;
      setIsAvailable(!!facade && facade.isInitialized());
    };

    // Check initially
    checkAvailability();

    // Subscribe to facade changes
    const unsubscribe = facadeSignal.subscribe(checkAvailability);

    return unsubscribe;
  }, []);

  return isAvailable;
}
